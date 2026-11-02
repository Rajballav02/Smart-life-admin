const cron = require('node-cron');
const Record = require('../models/Record');
const User = require('../models/User');
const { fireReminder } = require('./notificationService');

/**
 * Every minute: find personal/documents records with reminders enabled whose
 * reminder time has arrived and hasn't been sent yet, then dispatch notifications.
 */
async function checkDueReminders() {
  const now = new Date();

  const dueRecords = await Record.find({
    module: { $in: ['personal', 'documents'] },
    reminderEnabled: true,
    reminderSentAt: null,
    status: 'pending',
    date: { $ne: null },
  }).lean(false);

  for (const record of dueRecords) {
    const offsetMinutes = record.reminderOffsetMinutes || 0;
    const reminderTime = new Date(record.date.getTime() - offsetMinutes * 60 * 1000);

    if (reminderTime <= now) {
      // eslint-disable-next-line no-await-in-loop
      const user = await User.findById(record.userId);
      if (user) {
        // eslint-disable-next-line no-await-in-loop
        await fireReminder(user, record);
      }
      record.reminderSentAt = now;
      // eslint-disable-next-line no-await-in-loop
      await record.save();
    }
  }
}

/**
 * Every day at midnight: flip pending records whose date has passed into "overdue".
 */
async function markOverdueRecords() {
  const now = new Date();
  await Record.updateMany(
    { status: 'pending', date: { $lt: now }, module: { $in: ['personal', 'documents'] } },
    { $set: { status: 'overdue' } },
  );
}

function startReminderScheduler() {
  cron.schedule('* * * * *', () => {
    checkDueReminders().catch((err) => console.error('Reminder check failed:', err.message));
  });

  cron.schedule('0 0 * * *', () => {
    markOverdueRecords().catch((err) => console.error('Overdue sweep failed:', err.message));
  });

  console.log('Reminder scheduler started');
}

module.exports = { startReminderScheduler, checkDueReminders, markOverdueRecords };
