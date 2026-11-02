const express = require('express');
const c = require('../controllers/pushController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.get('/public-key', protect, c.publicKey);
router.post('/subscribe', protect, c.subscribe);
router.post('/unsubscribe', protect, c.unsubscribe);
router.post('/test', protect, c.test);

module.exports = router;
