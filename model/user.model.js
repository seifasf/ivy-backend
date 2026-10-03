const mongoose = require("mongoose");
const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
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
  },
  password: {
    type: String,
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true,
  },
  picture: {
    type: String,
  },
  resetCode: String,
  resetCodeExpire: Date,
}, { timestamps: true });

module.exports = mongoose.model("user", userSchema);
