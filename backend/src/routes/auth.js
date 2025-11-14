const express = require('express');
const {
  register,
  login,
  getMe,
  updateProfile,
  requestPasswordChangeVerification,
  changePassword,
  getAllUsers,
  updateUserStatus,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect, restrictTo } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Protected routes (require authentication)
router.use(protect); // All routes below require authentication

router.get('/me', getMe);
router.put('/update-profile', updateProfile);
router.post('/request-password-change-verification', requestPasswordChangeVerification);
router.put('/change-password', changePassword);

// Admin only routes
router.use(restrictTo('admin')); // All routes below require admin role

router.get('/users', getAllUsers);
router.put('/users/:userId/status', updateUserStatus);

module.exports = router;
