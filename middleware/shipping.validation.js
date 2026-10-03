const { body, param } = require('express-validator');

exports.createShippingValidation = [
  body('shippingCost').isFloat({ min: 0 }).withMessage('Shipping cost must be positive'),
];

exports.updateShippingValidation = [
  body('shippingCost').isFloat({ min: 0 }).withMessage('Shipping cost must be positive'),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid shipping ID')
];
