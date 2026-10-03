const { body, param } = require('express-validator');

exports.createCustomizeValidation = [
  body('name').isString().trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('phone').isString().trim().notEmpty().withMessage('Phone is required'),
  body('comment').isString().trim().notEmpty().withMessage('Comment is required'),
];

exports.updateCustomizeValidation = [
  body('name').optional().isString().trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone').optional().isString().trim(),
  body('comment').optional().isString().trim(),
  body('status').optional().isIn(['Pending', 'Active']).withMessage('Status must be Pending or Active'),
];

exports.idValidation = [
  param('id').isMongoId().withMessage('Invalid customize ID')
];
