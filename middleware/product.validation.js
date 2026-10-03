const { body, param } = require('express-validator');

exports.createProductValidation = [
  body('title').isString().trim().notEmpty().withMessage('Title is required').escape(),
  body('description').isString().trim().notEmpty().withMessage('Description is required').escape(),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('discountPrice').isFloat({ min: 0 }).withMessage('Discount price must be a positive number'),
  body('inStock').isBoolean().withMessage('inStock must be boolean'),
  body('category').isString().trim().notEmpty().withMessage('Category is required').escape(),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be a positive integer'),
  body('sizes').optional().custom((value) => {
    if (Array.isArray(value)) return true;
    if (typeof value === "string") return true;
    return false;
  }).withMessage('Sizes must be an array or string'),
];

exports.updateProductValidation = [
  body('title').optional().isString().trim().escape(),
  body('description').optional().isString().trim().escape(),
  body('price').optional().isFloat({ min: 0 }),
  body('discountPrice').optional().isFloat({ min: 0 }),
  body('inStock').optional().isBoolean(),
  body('category').optional().isString().trim().escape(),
  body('stock').optional().isInt({ min: 0 }),
  body('sizes').optional().custom((value) => {
    if (Array.isArray(value)) return true;
    if (typeof value === "string") return true;
    return false;
  }).withMessage('Sizes must be an array or string'),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid product ID')
];
