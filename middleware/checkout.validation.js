const { body, param } = require('express-validator');

exports.checkoutValidation = [
  body('userInfo.name').isString().trim().notEmpty().isLength({ max: 120 }).withMessage('Name is required'),
  body('userInfo.email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('userInfo.phone').isString().trim().notEmpty().isLength({ max: 30 }).withMessage('Phone is required'),
  body('userInfo.country').isString().trim().notEmpty().isLength({ max: 60 }).withMessage('Country is required'),
  body('userInfo.governorate').isString().trim().notEmpty().isLength({ max: 60 }).withMessage('Governorate is required'),
  body('userInfo.address').isString().trim().notEmpty().isLength({ max: 300 }).withMessage('Address is required'),
  body('userInfo.apartment').optional({ nullable: true }).isString().trim().isLength({ max: 120 }),
  body('userInfo.notes').optional({ nullable: true }).isString().trim().isLength({ max: 1000 }),
  body('items').isArray({ min: 1, max: 50 }).withMessage('At least one item is required'),
  body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
  body('items.*.quantity').isInt({ min: 1, max: 100 }).withMessage('Quantity must be between 1 and 100'),
  body('items.*.size').optional({ nullable: true }).isString().trim().isLength({ max: 20 }),
  body('items.*.color').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
  body('promoCode').optional({ nullable: true }).isString().trim().isLength({ max: 40 }),
  body('paymentMethod').optional().isString().trim().isLength({ max: 40 }),
];

exports.statusValidation = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Status must be pending, processing, shipped, delivered or cancelled'),
];

exports.shippingFeeValidation = [
  body('shippingFee').isFloat({ min: 0 }).withMessage('Shipping fee must be zero or more'),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid checkout ID')
];
