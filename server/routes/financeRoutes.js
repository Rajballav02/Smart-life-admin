const express = require('express');
const { getWeekly, getHalfMonthly, getMonthly } = require('../controllers/financeController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/weekly', getWeekly);
router.get('/half-monthly', getHalfMonthly);
router.get('/monthly', getMonthly);

module.exports = router;
