const mongoose = require("mongoose");
const adminSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^\S+@\S+\.\S+$/,
  },
  phone: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  resetCode: String,
  resetCodeExpire: Date,
}, { timestamps: true });

module.exports = mongoose.model("admin", adminSchema);
