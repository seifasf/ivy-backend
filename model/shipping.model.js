const mongoose = require("mongoose");

const shippingSchema = new mongoose.Schema(
  {
    shippingCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Shipping", shippingSchema);
