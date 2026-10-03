const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");

// Get All Settings (admin)
router.get("/", verfiyToken, isAdmin, settingsController.getAllSettings);

// Get Settings by Type (admin)
router.get("/:type", verfiyToken, isAdmin, settingsController.getSettings);

// Update Settings (admin)
router.put("/:type", verfiyToken, isAdmin, settingsController.updateSettings);

module.exports = router;

