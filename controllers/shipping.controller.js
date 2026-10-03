const Shipping = require("../model/shipping.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Create Shipping
const createShipping = asyncWrapper(async (req, res) => {
  const { shippingCost } = req.body;
  const shipping = new Shipping({ shippingCost });
  await shipping.save();
  res.status(201).json(shipping);
});

// Get All Shippings
const getAllShippings = asyncWrapper(async (req, res) => {
  const shippings = await Shipping.find({}, { __v: false });
  res.json(shippings);
});

// Get Shipping By ID
const getShippingById = asyncWrapper(async (req, res) => {
  const shipping = await Shipping.findById(req.params.id, { __v: false });
  if (!shipping) return res.status(404).json({ message: "Shipping not found" });
  res.json(shipping);
});

// Update Shipping
const updateShipping = asyncWrapper(async (req, res) => {
  const shipping = await Shipping.findById(req.params.id);
  if (!shipping) return res.status(404).json({ message: "Shipping not found" });

  const { shippingCost } = req.body;
  shipping.shippingCost = shippingCost ?? shipping.shippingCost;

  await shipping.save();
  res.json(shipping);
});

// Delete Shipping
const deleteShipping = asyncWrapper(async (req, res) => {
  const shipping = await Shipping.findById(req.params.id);
  if (!shipping) return res.status(404).json({ message: "Shipping not found" });

  await shipping.deleteOne();
  res.json({ message: "Shipping deleted" });
});

module.exports = {
  createShipping,
  getAllShippings,
  getShippingById,
  updateShipping,
  deleteShipping,
};
