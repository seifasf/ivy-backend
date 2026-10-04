const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
   title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPrice: {
    type: Number,
    required: true
  },
  inStock: {
    type: Boolean,
    required: true,
    default: true
  },
  category: {
    type: String,
    required: true
  },
  mainImage: {
    type: String,
    required: true
  },
   images : {
    type: [String],
    required: true
  },
  stock: {
    type: Number,
    required: true
  },
  sizes: {
    type: [String],
    required: false, 
    default: []
  },
  colors: {
    type: [
      {
        _id: false,
        name: { type: String, required: true, trim: true },
        hex: { type: String, default: "" }
      }
    ],
    default: []
  },
}, { timestamps: true });

productSchema.index({ createdAt: -1 });
productSchema.index({ inStock: 1, createdAt: -1 });
productSchema.index({ category: 1 });

module.exports = mongoose.model('Product', productSchema);
