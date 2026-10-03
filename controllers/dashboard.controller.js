const Checkout = require("../model/checkout.model");
const Product = require("../model/product.model");
const PromoCode = require("../model/promocode.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Get Dashboard Statistics
const getDashboardStats = asyncWrapper(async (req, res) => {
  // Total Orders
  const totalOrders = await Checkout.countDocuments();
  
  // Pending Orders
  const pendingOrders = await Checkout.countDocuments({ status: "pending" });
  
  // Total Revenue (sum of all orders)
  const revenueResult = await Checkout.aggregate([
    { $group: { _id: null, total: { $sum: "$total" } } }
  ]);
  const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
  
  // Total Products
  const totalProducts = await Product.countDocuments();
  
  // Active Promo Codes (not expired and still active)
  const activePromoCodes = await PromoCode.countDocuments({
    active: true,
    expiryDate: { $gte: new Date() }
  });
  
  // Total Customers (unique emails from orders)
  const uniqueCustomers = await Checkout.distinct("userInfo.email");
  const totalCustomers = uniqueCustomers.length;
  
  res.json({
    totalOrders,
    pendingOrders,
    totalRevenue,
    totalProducts,
    activePromoCodes,
    totalCustomers
  });
});

// Get Recent Orders
const getRecentOrders = asyncWrapper(async (req, res) => {
  const limit = parseInt(req.query.limit) || 5;
  
  const orders = await Checkout.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('_id userInfo.name items total status createdAt');
  
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

