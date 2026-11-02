const Record = require('../models/Record');
const financeService = require('../services/financeService');
const asyncHandler = require('../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const [personalRecords, financeWeekly, documentRecords] = await Promise.all([
    Record.find({ userId, module: 'personal' }).sort({ date: 1 }).lean(),
    financeService.weekly(userId),
    Record.find({ userId, module: 'documents' }).sort({ date: 1 }).lean(),
  ]);

  const personalStats = {
    dueToday: personalRecords.filter((r) => r.status === 'pending' && r.date && r.date >= todayStart && r.date <= todayEnd).length,
    upcoming: personalRecords.filter((r) => r.status === 'pending' && r.date && r.date > todayEnd).length,
    completed: personalRecords.filter((r) => r.status === 'completed').length,
    overdue: personalRecords.filter((r) => r.status === 'overdue').length,
  };

  const thirtyDaysOut = new Date(now); thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);
  const documentStats = {
    totalDocuments: documentRecords.filter((r) => r.type === 'document').length,
    totalAssets: documentRecords.filter((r) => r.type !== 'document').length,
    expiringSoon: documentRecords.filter((r) => r.status !== 'completed' && r.date && r.date <= thirtyDaysOut).length,
  };

  res.json({
    personal: {
      stats: personalStats,
      recent: personalRecords.filter((r) => r.status !== 'completed').slice(0, 6),
    },
    finance: {
      stats: { income: financeWeekly.income, expense: financeWeekly.expenses, savings: financeWeekly.savings },
      recent: await Record.find({ userId, module: 'finance' }).sort({ date: -1, createdAt: -1 }).limit(6).lean(),
    },
    documents: {
      stats: documentStats,
      recent: documentRecords.filter((r) => r.status !== 'completed').slice(0, 6),
    },
  });
});

module.exports = { getDashboard };
