const mongoose = require("mongoose");

const checkoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: false
  },
  userInfo: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    country: { type: String, required: true },
    governorate: { type: String, required: true },
    address: { type: String, required: true },
    apartment: { type: String },
    notes: { type: String }
  },
  items: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
      title: { type: String, required: true },
      price: { type: Number, required: true },
      mainImage: { type: String, required: true },
      quantity: { type: Number, required: true },
      size: { type: String }
    }
  ],
  paymentMethod: { type: String, default: "cash-on-delivery" },
  total: { type: Number, required: true },
  shippingFee: { type: Number, default: 0 },
  promoCode: { type: String, default: "" },
  status: { 
    type: String, 
    enum: ["pending", "processing", "shipped", "delivered", "cancelled"], 
    default: "pending" 
  },
  createdAt: { type: Date, default: Date.now }
});

checkoutSchema.index({ createdAt: -1 });
checkoutSchema.index({ status: 1, createdAt: -1 });
checkoutSchema.index({ userId: 1, createdAt: -1 });
checkoutSchema.index({ "userInfo.email": 1, createdAt: -1 });

module.exports = mongoose.model("Checkout", checkoutSchema);
