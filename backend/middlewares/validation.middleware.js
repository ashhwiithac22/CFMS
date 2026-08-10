const { body, validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    return next(new ValidationError('Validation failed', formattedErrors));
  }
  next();
};

// Shared password complexity chain (used in register, reset-password, change-password)
const passwordComplexityRules = (fieldName = 'password') => [
  body(fieldName)
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain at least one digit (0-9)')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter (A-Z)')
    .matches(/[!@#$%^&*()\-_+=\[\]{};:'"<>,.?/\\|`~]/).withMessage('Password must contain at least one special character (e.g. !@#$%^&*)')
];

const loginRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const registerRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain at least one digit (0-9)')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter (A-Z)')
    .matches(/[!@#$%^&*()\-_+=\[\]{};:'"<>,.?/\\|`~]/).withMessage('Password must contain at least one special character (e.g. !@#$%^&*)'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ max: 50 }).withMessage('First name must be under 50 characters'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ max: 50 }).withMessage('Last name must be under 50 characters'),
  body('roleId')
    .isInt({ min: 1 }).withMessage('Role ID must be a valid integer'),
  body('departmentId')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('Department ID must be a valid integer')
];

const forgotPasswordRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

const verifyOtpRules = [
  body('email')
    .trim()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('otp')
    .trim()
    .matches(/^\d{6}$/).withMessage('OTP must be a 6-digit numeric code')
];

const resetPasswordRules = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain at least one digit (0-9)')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter (A-Z)')
    .matches(/[!@#$%^&*()\-_+=\[\]{};:'"<>,.?/\\|`~]/).withMessage('Password must contain at least one special character (e.g. !@#$%^&*)')
];

const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters long')
    .matches(/\d/).withMessage('Password must contain at least one digit (0-9)')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter (A-Z)')
    .matches(/[!@#$%^&*()\-_+=\[\]{};:'"<>,.?/\\|`~]/).withMessage('Password must contain at least one special character (e.g. !@#$%^&*)')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password cannot be the same as current password');
      }
      return true;
    })
];

module.exports = {
  validate,
  loginRules,
  registerRules,
  forgotPasswordRules,
  verifyOtpRules,
  resetPasswordRules,
  changePasswordRules
};
