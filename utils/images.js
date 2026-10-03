const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUCKET_NAME = "images";
const LEGACY_DIR = "uploads";

let bucket;
const getBucket = () => {
  if (!bucket) {
    if (mongoose.connection.readyState !== 1) {
      const err = new Error("Database is not connected");
      err.status = 503;
      throw err;
    }
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
  }
  return bucket;
};

mongoose.connection.on("disconnected", () => {
  bucket = undefined;
});

const generateFilename = (originalName) => {
  const ext = path.extname(originalName || "").toLowerCase();
  return `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
};

const saveImage = (file) =>
  new Promise((resolve, reject) => {
    const filename = generateFilename(file.originalname);
    const stream = getBucket().openUploadStream(filename, {
      metadata: { contentType: file.mimetype, originalName: file.originalname },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(filename));
    stream.end(file.buffer);
  });

// Multer keeps files in memory; this moves them into GridFS and sets file.filename
// so controllers keep using req.file(s).filename as before.
const persistUploads = async (req, res, next) => {
  try {
    const files = [];
    if (req.file) files.push(req.file);
    if (Array.isArray(req.files)) files.push(...req.files);
    else if (req.files) Object.values(req.files).forEach((group) => files.push(...group));

    for (const file of files) {
      file.filename = await saveImage(file);
      file.buffer = undefined;
    }
    next();
  } catch (err) {
    next(err);
  }
};

const deleteImage = async (filename) => {
  if (!filename) return;
  try {
    const found = await getBucket().find({ filename }).toArray();
    await Promise.all(found.map((f) => getBucket().delete(f._id)));
  } catch (e) {
    // Missing images should not block the surrounding update/delete
  }
  fs.promises.unlink(path.join(LEGACY_DIR, path.basename(filename))).catch(() => {});
};

const serveImage = async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  try {
    const [file] = await getBucket().find({ filename }).limit(1).toArray();
    if (!file) return next();

    res.set({
      "Content-Type": file.metadata?.contentType || "application/octet-stream",
      "Content-Length": file.length,
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: `"${file._id}"`,
    });
    if (req.headers["if-none-match"] === `"${file._id}"`) return res.status(304).end();

    getBucket()
      .openDownloadStream(file._id)
      .on("error", next)
      .pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = { persistUploads, deleteImage, serveImage, LEGACY_DIR };
