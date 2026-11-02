const Record = require('../models/Record');

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Sunday as start of week
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek(date = new Date()) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

async function summarize(userId, from, to) {
  const records = await Record.find({
    userId,
    module: 'finance',
    date: { $gte: from, $lte: to },
  }).lean();

  const income = records.filter((r) => r.type === 'income');
  const expenses = records.filter((r) => r.type !== 'income');

  const totalIncome = income.reduce((sum, r) => sum + (r.amount || 0), 0);
  const totalExpenses = expenses.reduce((sum, r) => sum + (r.amount || 0), 0);

  const categoryTotals = {};
  expenses.forEach((r) => {
    categoryTotals[r.category] = (categoryTotals[r.category] || 0) + (r.amount || 0);
  });

  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];

  return {
    from,
    to,
    income: totalIncome,
    expenses: totalExpenses,
    savings: totalIncome - totalExpenses,
    transactionCount: records.length,
    topCategory: topCategory ? { name: topCategory[0], amount: topCategory[1] } : null,
    categoryBreakdown: Object.entries(categoryTotals).map(([category, amount]) => ({ category, amount })),
  };
}

async function weekly(userId) {
  const from = startOfWeek();
  const to = endOfWeek();
  return summarize(userId, from, to);
}

async function halfMonthly(userId) {
  const now = new Date();
  const day = now.getDate();
  const isFirstHalf = day <= 15;

  const from = new Date(now.getFullYear(), now.getMonth(), isFirstHalf ? 1 : 16);
  from.setHours(0, 0, 0, 0);

  const to = isFirstHalf
    ? new Date(now.getFullYear(), now.getMonth(), 15, 23, 59, 59, 999)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const result = await summarize(userId, from, to);
  return { ...result, half: isFirstHalf ? '1-15' : '16-end' };
}

async function monthly(userId) {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const result = await summarize(userId, from, to);

  // Weekly spending trend within the month, for charting.
  const weeks = [];
  let cursor = new Date(from);
  while (cursor <= to) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(Math.min(new Date(cursor).setDate(cursor.getDate() + 6), to.getTime()));
    // eslint-disable-next-line no-await-in-loop
    const weekRecords = await Record.find({
      userId, module: 'finance', date: { $gte: weekStart, $lte: weekEnd },
    }).lean();
    const weekExpense = weekRecords.filter((r) => r.type !== 'income').reduce((s, r) => s + (r.amount || 0), 0);
    weeks.push({ label: `${weekStart.getDate()}-${weekEnd.getDate()}`, expense: weekExpense });
    cursor.setDate(cursor.getDate() + 7);
  }

  return { ...result, weeklyTrend: weeks };
}

module.exports = { weekly, halfMonthly, monthly, summarize };
