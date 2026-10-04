const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUCKET_NAME = "images";
const LEGACY_DIR = "uploads";
const MAX_DIMENSION = 1400;
const WEBP_QUALITY = 80;

let sharp = null;
try {
  sharp = require("sharp");
  sharp.concurrency(1);
  sharp.cache(false);
} catch (e) {
  console.warn("⚠️ sharp unavailable; images will be stored without optimization");
}

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

const newName = (ext) => `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;

// Resizes to at most MAX_DIMENSION, applies EXIF rotation, strips metadata and
// re-encodes as WebP, which typically turns a 4MB phone photo into ~150KB.
const optimize = async (file) => {
  if (!sharp) {
    return {
      buffer: file.buffer,
      ext: path.extname(file.originalname || "").toLowerCase(),
      contentType: file.mimetype,
    };
  }
  try {
    const buffer = await sharp(file.buffer, { failOn: "error", limitInputPixels: 100e6 })
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY, effort: 4 })
      .toBuffer();
    return { buffer, ext: ".webp", contentType: "image/webp" };
  } catch (e) {
    const err = new Error(`"${file.originalname}" is not a readable image`);
    err.status = 400;
    throw err;
  }
};

const saveImage = async (file) => {
  const { buffer, ext, contentType } = await optimize(file);
  const filename = newName(ext);
  await new Promise((resolve, reject) => {
    const stream = getBucket().openUploadStream(filename, {
      metadata: { contentType, originalName: file.originalname },
    });
    stream.on("error", reject);
    stream.on("finish", resolve);
    stream.end(buffer);
  });
  return filename;
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

// Multer keeps files in memory; this optimizes them into GridFS and sets file.filename
// so controllers keep using req.file(s).filename. If the request ends in an error
// (validation, missing fields, ...), the images it stored are removed again.
const persistUploads = async (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (Array.isArray(req.files)) files.push(...req.files);
  else if (req.files) Object.values(req.files).forEach((group) => files.push(...group));
  if (files.length === 0) return next();

  const saved = [];
  res.on("finish", () => {
    if (res.statusCode >= 400) saved.forEach((name) => deleteImage(name));
  });

  try {
    for (const file of files) {
      file.filename = await saveImage(file);
      file.buffer = undefined;
      saved.push(file.filename);
    }
    next();
  } catch (err) {
    next(err);
  }
};

const serveImage = async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  try {
    const [file] = await getBucket().find({ filename }).limit(1).toArray();
    if (!file) return next();

    const etag = `"${file._id}"`;
    res.set({
      "Content-Type": file.metadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      ETag: etag,
    });
    if (req.headers["if-none-match"] === etag) return res.status(304).end();

    res.set("Content-Length", file.length);
    getBucket()
      .openDownloadStream(file._id)
      .on("error", next)
      .pipe(res);
  } catch (err) {
    next(err);
  }
};

module.exports = { persistUploads, deleteImage, serveImage, LEGACY_DIR };
