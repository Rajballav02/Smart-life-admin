const financeService = require('../services/financeService');
const asyncHandler = require('../utils/asyncHandler');

const getWeekly = asyncHandler(async (req, res) => {
  res.json(await financeService.weekly(req.user._id));
});

const getHalfMonthly = asyncHandler(async (req, res) => {
  res.json(await financeService.halfMonthly(req.user._id));
});

const getMonthly = asyncHandler(async (req, res) => {
  res.json(await financeService.monthly(req.user._id));
});

module.exports = { getWeekly, getHalfMonthly, getMonthly };
