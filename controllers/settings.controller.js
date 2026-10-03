const Settings = require("../model/settings.model");
const asyncWrapper = require("../middleware/asyncwrapper");

// Get Settings by Type
const getSettings = asyncWrapper(async (req, res) => {
  const { type } = req.params;
  const settings = await Settings.findOne({ type }, { __v: 0 }).lean();

  if (!settings) {
    // Return default settings if not found
    const defaults = getDefaultSettings(type);
    return res.json({ type, data: defaults });
  }
  
  res.json(settings);
});

// Get All Settings
const getAllSettings = asyncWrapper(async (req, res) => {
  const settings = await Settings.find();
  const result = {};
  
  settings.forEach(setting => {
    result[setting.type] = setting.data;
  });
  
  // Add defaults for missing types
  ['store', 'email', 'shipping'].forEach(type => {
    if (!result[type]) {
      result[type] = getDefaultSettings(type);
    }
  });
  
  res.json(result);
});

// Update Settings
const updateSettings = asyncWrapper(async (req, res) => {
  const { type } = req.params;
  const { data } = req.body;
  
  let settings = await Settings.findOne({ type });
  
  if (!settings) {
    settings = new Settings({ type, data });
  } else {
    settings.data = { ...settings.data, ...data };
  }
  
  await settings.save();
  res.json({ message: "Settings updated successfully", settings });
});

// Helper function for default settings
function getDefaultSettings(type) {
  switch (type) {
    case 'store':
      return {
        storeName: 'IVY',
        email: 'ivyforhelp@gmail.com',
        phone: '+20 100 000 0000'
      };
    case 'email':
      return {
        serviceId: '',
        templateId: '',
        publicKey: ''
      };
    case 'shipping':
      return {
        baseShippingFee: 50,
        freeShippingThreshold: 1000
      };
    default:
      return {};
  }
}

module.exports = {
  getSettings,
  getAllSettings,
  updateSettings
};

