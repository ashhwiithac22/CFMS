const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { authLimiter } = require('../middlewares/security.middleware');
const {
  validate,
  loginRules,
  registerRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules
} = require('../middlewares/validation.middleware');

// Public metadata route (to load roles/departments during signup)
router.get('/metadata', authController.getMetadata);

// Auth endpoints
router.post('/register', authLimiter, registerRules, validate, authController.register);
router.post('/login', authLimiter, loginRules, validate, authController.login);
router.post('/logout', authMiddleware, authController.logout);
router.post('/refresh', authController.refresh);

// Password recovery
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, authController.forgotPassword);
router.post('/reset-password', authLimiter, resetPasswordRules, validate, authController.resetPassword);

// Authenticated session features
router.post('/change-password', authMiddleware, changePasswordRules, validate, authController.changePassword);
router.get('/me', authMiddleware, authController.getMe);
router.put('/theme', authMiddleware, authController.updateTheme);

module.exports = router;
