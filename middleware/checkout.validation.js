const { body, param } = require('express-validator');

exports.checkoutValidation = [
  body('userInfo.name').isString().trim().notEmpty().withMessage('Name is required'),
  body('userInfo.email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('userInfo.phone').isString().trim().notEmpty().withMessage('Phone is required'),
  body('userInfo.country').isString().trim().notEmpty().withMessage('Country is required'),
  body('userInfo.governorate').isString().trim().notEmpty().withMessage('Governorate is required'),
  body('userInfo.address').isString().trim().notEmpty().withMessage('Address is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.title').isString().trim().notEmpty().withMessage('Product title is required'),
  body('items.*.price').isFloat({ min: 0 }).withMessage('Price must be positive'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('total').isFloat({ min: 0 }).withMessage('Total must be positive'),
];

exports.statusValidation = [
  body('status').isIn(['pending', 'active']).withMessage('Status must be pending or active'),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid checkout ID')
];
