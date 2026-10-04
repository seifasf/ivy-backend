const multer = require("multer");

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Something went wrong";

  if (err instanceof multer.MulterError) {
    status = 400;
    message =
      err.code === "LIMIT_FILE_SIZE" ? "Each image must be 10MB or smaller"
      : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE" ? "Too many images (1 main + up to 10 extra)"
      : err.message;
  } else if (err.name === "CastError") {
    status = 400;
    message = `Invalid ${err.path}`;
  } else if (err.name === "ValidationError") {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join(", ");
  } else if (err.code === 11000) {
    status = 409;
    message = `${Object.keys(err.keyValue || {}).join(", ") || "Value"} already exists`;
  } else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON body";
  } else if (err.type === "entity.too.large") {
    status = 413;
    message = "Request body is too large";
  } else if (err.name === "MongooseServerSelectionError" || /buffering timed out/i.test(message)) {
    status = 503;
    message = "Database is temporarily unavailable. Please try again shortly.";
  }

  if (status >= 500) {
    console.error(`❌ ${req.method} ${req.originalUrl}:`, err);
    if (process.env.NODE_ENV === "production" && status === 500) message = "Internal server error";
  }

  res.status(status).json({ message });
};

module.exports = { notFound, errorHandler };
