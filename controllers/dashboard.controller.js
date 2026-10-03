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
    Checkout.aggregate([{ $group: { _id: null, total: { $sum: "$total" } } }]),
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

module.exports = {
  getDashboardStats,
  getRecentOrders
};

