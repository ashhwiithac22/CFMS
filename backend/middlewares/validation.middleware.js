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
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),
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

const resetPasswordRules = [
  body('token')
    .trim()
    .notEmpty().withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
];

const changePasswordRules = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
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
  resetPasswordRules,
  changePasswordRules
};
