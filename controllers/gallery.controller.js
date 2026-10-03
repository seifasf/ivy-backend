const Gallery = require("../model/gallery.model");
const asyncWrapper = require("../middleware/asyncwrapper");
const { deleteImage } = require("../utils/images");

// Create Gallery
const createGallery = asyncWrapper(async (req, res) => {
  const { title } = req.body;
  
  if (!req.file) {
    return res.status(400).json({ message: "Image is required" });
  }

  const gallery = new Gallery({ 
    title, 
    image: req.file.filename 
  });
  await gallery.save();
  res.status(201).json(gallery);
});

// Get All Galleries
const getAllGalleries = asyncWrapper(async (req, res) => {
  const galleries = await Gallery.find({}, { __v: false }).lean();
  res.set("Cache-Control", "public, no-cache");
  res.json(galleries);
});

// Get Gallery By ID
const getGalleryById = asyncWrapper(async (req, res) => {
  const gallery = await Gallery.findById(req.params.id, { __v: false });
  if (!gallery) return res.status(404).json({ message: "Gallery not found" });
  res.json(gallery);
});

// Update Gallery
const updateGallery = asyncWrapper(async (req, res) => {
  const gallery = await Gallery.findById(req.params.id);
  if (!gallery) return res.status(404).json({ message: "Gallery not found" });

  const { title } = req.body;

  // Handle image update
  if (req.file) {
    // Remove old image from disk
    try {
      deleteImage(gallery.image);
    } catch (e) {}
    gallery.image = req.file.filename;
  }

  gallery.title = title ?? gallery.title;

  await gallery.save();
  res.json(gallery);
});

// Delete Gallery
const deleteGallery = asyncWrapper(async (req, res) => {
  const gallery = await Gallery.findById(req.params.id);
  if (!gallery) return res.status(404).json({ message: "Gallery not found" });

  // Remove image from disk
  try {
    deleteImage(gallery.image);
  } catch (e) {}

  await gallery.deleteOne();
  res.json({ message: "Gallery deleted" });
});

module.exports = {
  createGallery,
  getAllGalleries,
  getGalleryById,
  updateGallery,
  deleteGallery,
};
