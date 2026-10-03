const Customize = require("../model/customize.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const fs = require("fs");
const path = require("path");

// Create Customize
const createCustomize = asyncWrapper(async (req, res) => {
  const { name, email, phone, comment, status } = req.body;
  
  if (!req.files || !req.files.image || req.files.image.length === 0) {
    return res.status(400).json({ message: "At least one image is required" });
  }

  const images = req.files.image.map(file => file.filename);
  const customize = new Customize({ name, email, phone, comment, image: images, status });
  await customize.save();
  res.status(201).json(customize);
});

// Get All Customizes
const getAllCustomizes = asyncWrapper(async (req, res) => {
  const customizes = await Customize.find({}, { __v: false });
  res.json(customizes);
});

// Get Customize By ID
const getCustomizeById = asyncWrapper(async (req, res) => {
  const customize = await Customize.findById(req.params.id, { __v: false });
  if (!customize) return res.status(404).json({ message: "Customize not found" });
  res.json(customize);
});

// Update Customize
const updateCustomize = asyncWrapper(async (req, res) => {
  const customize = await Customize.findById(req.params.id);
  if (!customize) return res.status(404).json({ message: "Customize not found" });

  const { name, email, phone, comment, status, oldImages } = req.body;

  // Handle image updates
  let newImages = [];
  if (req.files && req.files.image && req.files.image.length > 0) {
    newImages = req.files.image.map(file => file.filename);
  }

  // oldImages: array of filenames that should remain
  let oldImagesArr = [];
  if (oldImages) {
    if (Array.isArray(oldImages)) {
      oldImagesArr = oldImages;
    } else if (typeof oldImages === "string") {
      oldImagesArr = [oldImages];
    }
  } else {
    oldImagesArr = customize.image || [];
  }

  // Remove deleted images from disk
  customize.image.forEach(img => {
    if (!oldImagesArr.includes(img)) {
      try {
        fs.unlinkSync(path.join('uploads', img));
      } catch (e) {}
    }
  });

  // Final images = oldImagesArr (remaining) + newImages (added)
  customize.image = [...oldImagesArr, ...newImages];

  customize.name = name ?? customize.name;
  customize.email = email ?? customize.email;
  customize.phone = phone ?? customize.phone;
  customize.comment = comment ?? customize.comment;
  customize.status = status ?? customize.status;

  await customize.save();
  res.json(customize);
});

// Delete Customize
const deleteCustomize = asyncWrapper(async (req, res) => {
  const customize = await Customize.findById(req.params.id);
  if (!customize) return res.status(404).json({ message: "Customize not found" });

  // Remove images from disk
  try {
    customize.image.forEach(img => {
      fs.unlinkSync(path.join('uploads', img));
    });
  } catch (e) {}

  await customize.deleteOne();
  res.json({ message: "Customize deleted" });
});

module.exports = {
  createCustomize,
  getAllCustomizes,
  getCustomizeById,
  updateCustomize,
  deleteCustomize,
};
