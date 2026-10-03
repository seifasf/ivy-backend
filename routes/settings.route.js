const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settings.controller");
const verfiyToken = require("../middleware/verfiytoken");
const isAdmin = require("../middleware/isAdmin");

// Get All Settings (admin)
router.get("/", verfiyToken, isAdmin, settingsController.getAllSettings);

// Store details (name, contact info) are shown on the public site
const publicOrAdmin = (req, res, next) =>
  req.params.type === "store" ? next() : verfiyToken(req, res, () => isAdmin(req, res, next));

// Get Settings by Type (store is public, everything else admin)
router.get("/:type", publicOrAdmin, settingsController.getSettings);

// Update Settings (admin)
router.put("/:type", verfiyToken, isAdmin, settingsController.updateSettings);

module.exports = router;

