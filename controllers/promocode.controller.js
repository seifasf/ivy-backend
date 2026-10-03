const PromoCode = require("../model/promocode.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { promoDiscount, promoProblem } = require("../utils/pricing");

// Create Promo Code
const createPromoCode = asyncWrapper(async (req, res) => {
  const { code, discountType, discountValue, minOrderValue, maxUsage, expiryDate, active } = req.body;
  
  const exists = await PromoCode.findOne({ code: code.toUpperCase() });
  if (exists) return res.status(400).json({ message: "Promo code already exists" });

  const promoCode = new PromoCode({
    code: code.toUpperCase(),
    discountType,
    discountValue,
    minOrderValue,
    maxUsage,
    expiryDate,
    active: active !== undefined ? active : true
  });

  await promoCode.save();
  res.status(201).json(promoCode);
});

// Get All Promo Codes
const getAllPromoCodes = asyncWrapper(async (req, res) => {
  const promoCodes = await PromoCode.find({}, { __v: false }).sort({ createdAt: -1 }).lean();
  res.json(promoCodes);
});

// Get Promo Code By ID
const getPromoCodeById = asyncWrapper(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id, { __v: false });
  if (!promoCode) return res.status(404).json({ message: "Promo code not found" });
  res.json(promoCode);
});

// Validate Promo Code (public endpoint for checkout)
const validatePromoCode = asyncWrapper(async (req, res) => {
  const { code } = req.body;
  const orderTotal = Number(req.body.orderTotal) || 0;

  const promoCode = await PromoCode.findOne({ code: code.trim().toUpperCase() }).lean();
  const problem = promoProblem(promoCode, orderTotal);
  if (problem) {
    return res.status(promoCode ? 400 : 404).json({ valid: false, message: problem });
  }

  const discount = promoDiscount(promoCode, orderTotal);
  res.json({
    valid: true,
    discount,
    discountAmount: discount,
    discountType: promoCode.discountType,
    discountValue: promoCode.discountValue
  });
});

// Usage is now counted when the order is placed; kept so older clients don't error
const applyPromoCode = asyncWrapper(async (req, res) => {
  res.json({ message: "Promo code usage is recorded with the order" });
});

// Update Promo Code
const updatePromoCode = asyncWrapper(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id);
  if (!promoCode) return res.status(404).json({ message: "Promo code not found" });

  const { code, discountType, discountValue, minOrderValue, maxUsage, expiryDate, active } = req.body;

  if (code && code.toUpperCase() !== promoCode.code) {
    const exists = await PromoCode.findOne({ code: code.toUpperCase() });
    if (exists) return res.status(400).json({ message: "Promo code already exists" });
    promoCode.code = code.toUpperCase();
  }

  promoCode.discountType = discountType ?? promoCode.discountType;
  promoCode.discountValue = discountValue ?? promoCode.discountValue;
  promoCode.minOrderValue = minOrderValue ?? promoCode.minOrderValue;
  promoCode.maxUsage = maxUsage ?? promoCode.maxUsage;
  promoCode.expiryDate = expiryDate ?? promoCode.expiryDate;
  promoCode.active = active !== undefined ? active : promoCode.active;

  await promoCode.save();
  res.json(promoCode);
});

// Toggle Promo Code Active Status
const togglePromoCodeActive = asyncWrapper(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id);
  if (!promoCode) return res.status(404).json({ message: "Promo code not found" });

  promoCode.active = !promoCode.active;
  await promoCode.save();
  
  res.json({ message: `Promo code ${promoCode.active ? 'activated' : 'deactivated'}`, promoCode });
});

// Delete Promo Code
const deletePromoCode = asyncWrapper(async (req, res) => {
  const promoCode = await PromoCode.findById(req.params.id);
  if (!promoCode) return res.status(404).json({ message: "Promo code not found" });

  await promoCode.deleteOne();
  res.json({ message: "Promo code deleted" });
});

module.exports = {
  createPromoCode,
  getAllPromoCodes,
  getPromoCodeById,
  validatePromoCode,
  applyPromoCode,
  updatePromoCode,
  togglePromoCodeActive,
  deletePromoCode
};

