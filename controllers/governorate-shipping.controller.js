const GovernorateShipping = require("../model/governorate-shipping.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { escapeRegex } = require("../utils/pricing");

const FEES_CACHE = "public, max-age=300, stale-while-revalidate=3600";

// Initialize default governorates (call this once to set up)
const initializeGovernoratesFees = asyncWrapper(async (req, res) => {
  const defaultFees = [
    { governorate: 'Cairo', shippingFee: 50 },
    { governorate: 'Giza', shippingFee: 50 },
    { governorate: 'Alexandria', shippingFee: 75 },
    { governorate: 'Qalyubia', shippingFee: 60 },
    { governorate: 'Sharqia', shippingFee: 70 },
    { governorate: 'Dakahlia', shippingFee: 80 },
    { governorate: 'Beheira', shippingFee: 80 },
    { governorate: 'Gharbia', shippingFee: 75 },
    { governorate: 'Monufia', shippingFee: 70 },
    { governorate: 'Kafr El Sheikh', shippingFee: 80 },
    { governorate: 'Damietta', shippingFee: 85 },
    { governorate: 'Port Said', shippingFee: 90 },
    { governorate: 'Ismailia', shippingFee: 85 },
    { governorate: 'Suez', shippingFee: 85 },
    { governorate: 'North Sinai', shippingFee: 120 },
    { governorate: 'South Sinai', shippingFee: 120 },
    { governorate: 'Minya', shippingFee: 90 },
    { governorate: 'Asyut', shippingFee: 100 },
    { governorate: 'Sohag', shippingFee: 110 },
    { governorate: 'Qena', shippingFee: 115 },
    { governorate: 'Luxor', shippingFee: 120 },
    { governorate: 'Aswan', shippingFee: 130 },
    { governorate: 'Red Sea', shippingFee: 130 },
    { governorate: 'New Valley', shippingFee: 140 },
    { governorate: 'Matrouh', shippingFee: 130 },
    { governorate: 'Fayoum', shippingFee: 70 },
    { governorate: 'Beni Suef', shippingFee: 75 }
  ];

  const existing = await GovernorateShipping.countDocuments();
  if (existing > 0) {
    return res.json({ message: "Governorates already initialized", count: existing });
  }

  await GovernorateShipping.insertMany(defaultFees);
  res.json({ message: "Governorate shipping fees initialized successfully", count: defaultFees.length });
});

// Get All Governorate Fees
const getAllGovernoratesFees = asyncWrapper(async (req, res) => {
  const fees = await GovernorateShipping.find({}, { __v: 0 }).sort({ governorate: 1 }).lean();
  res.set("Cache-Control", FEES_CACHE);
  res.json(fees);
});

// Get Shipping Fee for Specific Governorate
const getGovernoratesFee = asyncWrapper(async (req, res) => {
  // Decode URL parameter and trim whitespace
  let { governorate } = req.params;
  governorate = decodeURIComponent(governorate).trim();
  
  // Try exact match first
  let fee = await GovernorateShipping.findOne({ governorate }, { __v: 0 }).lean();

  // If not found, try case-insensitive match
  if (!fee) {
    fee = await GovernorateShipping.findOne(
      { governorate: { $regex: new RegExp(`^${escapeRegex(governorate)}$`, 'i') } },
      { __v: 0 }
    ).lean();
  }
  
  if (!fee) {
    return res.status(404).json({ 
      message: "Governorate not found",
      searched: governorate 
    });
  }
  
  res.set("Cache-Control", FEES_CACHE);
  res.json(fee);
});

// Update Governorate Shipping Fee (admin)
const updateGovernoratesFee = asyncWrapper(async (req, res) => {
  const { governorate, shippingFee } = req.body;
  
  let fee = await GovernorateShipping.findOne({ governorate });
  
  if (!fee) {
    // Create if doesn't exist
    fee = new GovernorateShipping({ governorate, shippingFee });
  } else {
    fee.shippingFee = shippingFee;
  }
  
  await fee.save();
  res.json({ message: "Shipping fee updated", fee });
});

// Update Multiple Governorate Fees at Once (admin)
const updateMultipleGovernoratesFees = asyncWrapper(async (req, res) => {
  const { fees } = req.body; // Array of { governorate, shippingFee }
  
  if (!Array.isArray(fees)) {
    return res.status(400).json({ message: "Fees must be an array" });
  }

  const updatePromises = fees.map(async ({ governorate, shippingFee }) => {
    return GovernorateShipping.findOneAndUpdate(
      { governorate },
      { shippingFee },
      { upsert: true, new: true }
    );
  });

  const results = await Promise.all(updatePromises);
  res.json({ message: "Shipping fees updated", count: results.length, results });
});

module.exports = {
  initializeGovernoratesFees,
  getAllGovernoratesFees,
  getGovernoratesFee,
  updateGovernoratesFee,
  updateMultipleGovernoratesFees
};

