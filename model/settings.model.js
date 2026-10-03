const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['store', 'email', 'shipping'],
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);

