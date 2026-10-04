const { body, param } = require('express-validator');

// Accepts a JSON array string ('["S","M"]'), repeated form fields, or a single value
const isStringList = (value) => {
  if (Array.isArray(value)) return value.every((v) => typeof v === 'string');
  if (typeof value !== 'string') return false;
  if (!value.trim().startsWith('[')) return true;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((v) => typeof v === 'string');
  } catch {
    return false;
  }
};

const optionalList = (field, label) =>
  body(field).optional().custom(isStringList).withMessage(`${label} must be a list of text values`);

exports.createProductValidation = [
  body('title').isString().trim().notEmpty().withMessage('Title is required')
    .isLength({ max: 150 }).withMessage('Title must be 150 characters or less'),
  body('description').isString().trim().notEmpty().withMessage('Description is required')
    .isLength({ max: 5000 }).withMessage('Description must be 5000 characters or less'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
  body('inStock').optional().isBoolean().withMessage('inStock must be true or false'),
  body('category').isString().trim().notEmpty().withMessage('Category is required')
    .isLength({ max: 60 }).withMessage('Category must be 60 characters or less'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a whole number of 0 or more'),
  optionalList('sizes', 'Sizes'),
];

exports.updateProductValidation = [
  body('title').optional().isString().trim().notEmpty().withMessage('Title cannot be empty')
    .isLength({ max: 150 }).withMessage('Title must be 150 characters or less'),
  body('description').optional().isString().trim().notEmpty().withMessage('Description cannot be empty')
    .isLength({ max: 5000 }).withMessage('Description must be 5000 characters or less'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Sale price must be a positive number'),
  body('inStock').optional().isBoolean().withMessage('inStock must be true or false'),
  body('category').optional().isString().trim().notEmpty().withMessage('Category cannot be empty')
    .isLength({ max: 60 }).withMessage('Category must be 60 characters or less'),
  body('stock').optional().isInt({ min: 0 }).withMessage('Stock must be a whole number of 0 or more'),
  optionalList('sizes', 'Sizes'),
  optionalList('oldImages', 'Kept images'),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid product ID')
];
