const Business = require("../model/business.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Create Business
const createBusiness = asyncWrapper(async (req, res) => {
  const { name, category, email, phone, comment, status } = req.body;
  const business = new Business({ name, category, email, phone, comment, status });
  await business.save();
  res.status(201).json(business);
});

// Get All Businesses
const getAllBusinesses = asyncWrapper(async (req, res) => {
  const businesses = await Business.find({}, { __v: false });
  res.json(businesses);
});

// Get Business By ID
const getBusinessById = asyncWrapper(async (req, res) => {
  const business = await Business.findById(req.params.id, { __v: false });
  if (!business) return res.status(404).json({ message: "Business not found" });
  res.json(business);
});

// Update Business
const updateBusiness = asyncWrapper(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Business not found" });

  const { name, category, email, phone, comment, status } = req.body;
  business.name = name ?? business.name;
  business.category = category ?? business.category;
  business.email = email ?? business.email;
  business.phone = phone ?? business.phone;
  business.comment = comment ?? business.comment;
  business.status = status ?? business.status;

  await business.save();
  res.json(business);
});

// Delete Business
const deleteBusiness = asyncWrapper(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) return res.status(404).json({ message: "Business not found" });

  await business.deleteOne();
  res.json({ message: "Business deleted" });
});

module.exports = {
  createBusiness,
  getAllBusinesses,
  getBusinessById,
  updateBusiness,
  deleteBusiness,
};
