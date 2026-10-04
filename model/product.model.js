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
  // Units per size; when present the entries add up to `stock`
  sizeStock: {
    type: [
      {
        _id: false,
        size: { type: String, required: true },
        stock: { type: Number, required: true, min: 0 }
      }
    ],
    default: []
  },
  // What one unit costs the store; admin only, never sent to shoppers
  costPrice: {
    type: Number,
    min: 0,
    default: 0
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
