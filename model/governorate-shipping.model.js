const mongoose = require("mongoose");

const governorateShippingSchema = new mongoose.Schema(
  {
    governorate: {
      type: String,
      required: true,
      unique: true,
      enum: [
        'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Sharqia',
        'Dakahlia', 'Beheira', 'Gharbia', 'Monufia', 'Kafr El Sheikh',
        'Damietta', 'Port Said', 'Ismailia', 'Suez', 'North Sinai',
        'South Sinai', 'Minya', 'Asyut', 'Sohag', 'Qena',
        'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'Matrouh',
        'Fayoum', 'Beni Suef'
      ]
    },
    shippingFee: {
      type: Number,
      required: true,
      min: 0
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("GovernorateShipping", governorateShippingSchema);

