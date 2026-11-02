const express = require('express');
const rateLimit = require('express-rate-limit');
const c = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Slow down password guessing and OTP abuse. Disabled under Jest so tests stay deterministic.
const limiter = (max, windowMinutes) => (process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
  }));

router.post('/register', limiter(20, 60), c.register);
router.post('/login', limiter(15, 15), c.login);
router.post('/forgot-password', limiter(5, 15), c.forgotPassword);
router.post('/reset-password', limiter(10, 15), c.resetPassword);

router.get('/me', protect, c.me);
router.put('/me', protect, c.updateProfile);
router.put('/change-password', protect, c.changePassword);
router.post('/logout-all', protect, c.logoutAll);

module.exports = router;
