'use strict';

const { body, validationResult } = require('express-validator');

// ─── Registration Validation Rules ────────────────────────────────────────────
const registrationRules = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Full name must be 2–100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^[6-9]\d{9}$/).withMessage('Please enter a valid 10-digit Indian mobile number'),

  body('board')
    .trim()
    .notEmpty().withMessage('Board is required')
    .isIn(['ICSE', 'CBSE', 'West Bengal', 'Others']).withMessage('Please select a valid board'),

  body('classCompleted')
    .trim()
    .notEmpty().withMessage('Class completed is required')
    .isIn(['Secondary', 'Higher Secondary', 'Others']).withMessage('Please select a valid class'),
];

// ─── Validation Error Handler ──────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

module.exports = { registrationRules, handleValidationErrors };
