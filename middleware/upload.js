const multer = require('multer');
const path = require('path');
const { persistUploads } = require('../utils/images');

const ALLOWED_EXT = /^\.(jpe?g|png|webp|avif)$/;
const ALLOWED_MIME = /^image\/(jpeg|png|webp|avif)$/;

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.test(ext) && ALLOWED_MIME.test(file.mimetype)) {
    cb(null, true);
  } else {
    const err = new Error('Only JPG, PNG, WebP or AVIF images are allowed');
    err.status = 400;
    cb(err, false);
  }
};

const multerUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 11 }
});

// Each method returns [multer, persistUploads] so routes can use it exactly like multer.
module.exports = {
  single: (field) => [multerUpload.single(field), persistUploads],
  array: (field, maxCount) => [multerUpload.array(field, maxCount), persistUploads],
  fields: (fields) => [multerUpload.fields(fields), persistUploads],
};
