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

// Colors arrive as a JSON string: [{"name":"Black","hex":"#000000"}]
const isColorList = (value) => {
  try {
    const list = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(list) && list.length <= 20 && list.every((c) =>
      c && typeof c.name === 'string' && c.name.trim() && c.name.length <= 40 &&
      (c.hex === undefined || c.hex === '' || /^#[0-9a-f]{6}$/i.test(c.hex)));
  } catch {
    return false;
  }
};
const optionalColors = () =>
  body('colors').optional().custom(isColorList).withMessage('Colors must be a list of names with optional #hex values');

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
  optionalColors(),
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
  optionalColors(),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid product ID')
];
