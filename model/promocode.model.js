const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0
  },
  minOrderValue: {
    type: Number,
    required: true,
    default: 0
  },
  maxUsage: {
    type: Number,
    required: true,
    min: 1
  },
  currentUsage: {
    type: Number,
    default: 0,
    min: 0
  },
  expiryDate: {
    type: Date,
    required: true
  },
  active: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoCodeSchema);

