const Checkout = require("../model/checkout.model");
const Product = require("../model/product.model");
const PromoCode = require("../model/promocode.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Get Dashboard Statistics
const getDashboardStats = asyncWrapper(async (req, res) => {
  const [
    totalOrders,
    pendingOrders,
    revenueResult,
    totalProducts,
    activePromoCodes,
    customersResult
  ] = await Promise.all([
    Checkout.countDocuments(),
    Checkout.countDocuments({ status: "pending" }),
    Checkout.aggregate([
      { $match: { status: { $ne: "cancelled" } } },
      { $group: { _id: null, total: { $sum: "$total" } } }
    ]),
    Product.countDocuments(),
    PromoCode.countDocuments({ active: true, expiryDate: { $gte: new Date() } }),
    Checkout.aggregate([{ $group: { _id: "$userInfo.email" } }, { $count: "count" }])
  ]);

  res.json({
    totalOrders,
    pendingOrders,
    totalRevenue: revenueResult[0]?.total || 0,
    totalProducts,
    activePromoCodes,
    totalCustomers: customersResult[0]?.count || 0
  });
});

// Get Recent Orders
const getRecentOrders = asyncWrapper(async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit) || 5, 1), 50);

  const orders = await Checkout.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id userInfo.name items total status createdAt')
    .lean();
  
  const recentOrders = orders.map(order => ({
    id: order._id,
    customer: order.userInfo.name,
    items: order.items.length,
    total: order.total,
    status: order.status,
    date: order.createdAt
  }));
  
  res.json(recentOrders);
});

const RANGE_DAYS = { "7": 7, "30": 30, "90": 90, "365": 365, all: null };
const LOW_STOCK = 3;
const TIME_ZONE = "Africa/Cairo";
const OPEN_STATUSES = ["pending", "processing", "shipped"];

const round = (n) => Math.round(n * 100) / 100;
const dayKey = (date) => new Date(date).toLocaleDateString("en-CA", { timeZone: TIME_ZONE });
const monthKey = (date) => dayKey(date).slice(0, 7);
const emptyTotals = () => ({ orders: 0, units: 0, revenue: 0, netSales: 0, shipping: 0, discounts: 0, cost: 0, profit: 0 });

const addOrder = (totals, o) => {
  totals.orders += 1;
  totals.units += o.units;
  totals.revenue += o.total;
  totals.netSales += o.netSales;
  totals.shipping += o.shipping;
  totals.discounts += o.discount;
  totals.cost += o.cost;
  totals.profit += o.netSales - o.cost;
};

const finishTotals = (t) => ({
  orders: t.orders,
  units: t.units,
  revenue: round(t.revenue),
  netSales: round(t.netSales),
  shipping: round(t.shipping),
  discounts: round(t.discounts),
  cost: round(t.cost),
  profit: round(t.profit),
  margin: t.netSales > 0 ? round((t.profit / t.netSales) * 100) : 0,
  avgOrderValue: t.orders ? round(t.revenue / t.orders) : 0,
});

// Sales analytics (admin). Revenue counts every order that is not cancelled;
// "delivered" is money already collected, "open" is still on its way.
const getAnalytics = asyncWrapper(async (req, res) => {
  const range = Object.hasOwn(RANGE_DAYS, req.query.range) ? req.query.range : "30";
  const days = RANGE_DAYS[range];
  const since = days ? new Date(Date.now() - (days - 1) * 86400000) : null;
  if (since) since.setHours(0, 0, 0, 0);

  const [orders, products] = await Promise.all([
    Checkout.find(since ? { createdAt: { $gte: since } } : {}, { items: 1, total: 1, shippingFee: 1, status: 1, createdAt: 1 }).lean(),
    Product.find({}, { title: 1, price: 1, discountPrice: 1, costPrice: 1, stock: 1, sizeStock: 1, inStock: 1, mainImage: 1 }).lean(),
  ]);
  const productsById = new Map(products.map((p) => [String(p._id), p]));

  const all = emptyTotals();
  const delivered = emptyTotals();
  const open = emptyTotals();
  const cancelled = { orders: 0, value: 0 };
  const byStatus = {};
  const byProduct = new Map();
  const bySize = new Map();
  const series = new Map();
  let unitsWithoutCost = 0;

  const monthly = !days || days > 90;
  const bucketOf = monthly ? monthKey : dayKey;

  for (const order of orders) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1;
    if (order.status === "cancelled") {
      cancelled.orders += 1;
      cancelled.value += order.total || 0;
      continue;
    }

    let itemsSubtotal = 0;
    let cost = 0;
    let units = 0;
    for (const item of order.items || []) {
      const product = productsById.get(String(item.productId));
      // Cost saved on the order wins; older orders fall back to today's cost
      const unitCost = item.costPrice > 0 ? item.costPrice : product?.costPrice || 0;
      if (!unitCost) unitsWithoutCost += item.quantity;
      const lineRevenue = item.price * item.quantity;
      itemsSubtotal += lineRevenue;
      cost += unitCost * item.quantity;
      units += item.quantity;

      const key = String(item.productId);
      const entry = byProduct.get(key) || {
        productId: key,
        title: product?.title || item.title,
        mainImage: product?.mainImage || item.mainImage,
        units: 0,
        revenue: 0,
        cost: 0,
      };
      entry.units += item.quantity;
      entry.revenue += lineRevenue;
      entry.cost += unitCost * item.quantity;
      byProduct.set(key, entry);

      if (item.size) bySize.set(item.size, (bySize.get(item.size) || 0) + item.quantity);
    }

    const shipping = order.shippingFee || 0;
    const netSales = Math.max((order.total || 0) - shipping, 0);
    const o = { total: order.total || 0, shipping, netSales, discount: Math.max(itemsSubtotal - netSales, 0), cost, units };

    addOrder(all, o);
    if (order.status === "delivered") addOrder(delivered, o);
    else if (OPEN_STATUSES.includes(order.status)) addOrder(open, o);

    const bucket = bucketOf(order.createdAt);
    const point = series.get(bucket) || { revenue: 0, profit: 0, orders: 0 };
    point.revenue += o.total;
    point.profit += netSales - cost;
    point.orders += 1;
    series.set(bucket, point);
  }

  // Fill empty days/months so the chart has a continuous axis
  const timeline = [];
  if (days || orders.length) {
    const start = since || new Date(Math.min(...orders.map((o) => new Date(o.createdAt).getTime())));
    const cursor = new Date(start);
    const end = Date.now();
    const seen = new Set();
    while (cursor.getTime() <= end) {
      const key = bucketOf(cursor);
      if (!seen.has(key)) {
        seen.add(key);
        const point = series.get(key) || { revenue: 0, profit: 0, orders: 0 };
        timeline.push({ date: key, revenue: round(point.revenue), profit: round(point.profit), orders: point.orders });
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  const inventory = { units: 0, costValue: 0, retailValue: 0 };
  const lowStock = [];
  const missingCost = [];
  for (const p of products) {
    const units = Math.max(p.stock || 0, 0);
    const sale = p.discountPrice > 0 && p.discountPrice < p.price ? p.discountPrice : p.price;
    inventory.units += units;
    inventory.costValue += units * (p.costPrice || 0);
    inventory.retailValue += units * sale;
    if (!p.costPrice) missingCost.push({ productId: p._id, title: p.title });

    if (p.sizeStock?.length) {
      for (const line of p.sizeStock) {
        if (line.stock <= LOW_STOCK) lowStock.push({ productId: p._id, title: p.title, size: line.size, stock: line.stock });
      }
    } else if (units <= LOW_STOCK) {
      lowStock.push({ productId: p._id, title: p.title, size: "", stock: units });
    }
  }

  res.set("Cache-Control", "private, no-store");
  res.json({
    range,
    granularity: monthly ? "month" : "day",
    totals: finishTotals(all),
    delivered: finishTotals(delivered),
    open: finishTotals(open),
    cancelled: { orders: cancelled.orders, value: round(cancelled.value) },
    byStatus,
    timeline,
    topProducts: [...byProduct.values()]
      .map((p) => ({ ...p, revenue: round(p.revenue), cost: round(p.cost), profit: round(p.revenue - p.cost) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    sizes: [...bySize].map(([size, units]) => ({ size, units })).sort((a, b) => b.units - a.units),
    inventory: {
      units: inventory.units,
      costValue: round(inventory.costValue),
      retailValue: round(inventory.retailValue),
      potentialProfit: round(inventory.retailValue - inventory.costValue),
    },
    lowStock: lowStock.sort((a, b) => a.stock - b.stock).slice(0, 20),
    missingCost,
    unitsWithoutCost,
  });
});

module.exports = {
  getDashboardStats,
  getRecentOrders,
  getAnalytics
};

