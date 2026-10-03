const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboard.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");

// Get Dashboard Statistics (protected - admin only)
router.get("/stats", verfiyToken, isAdmin, dashboardController.getDashboardStats);

// Get Recent Orders (protected - admin only)
router.get("/recent-orders", verfiyToken, isAdmin, dashboardController.getRecentOrders);

module.exports = router;

