const Notification = require('../models/Notification');
const { sendSMS } = require('./smsService');
const { sendEmail } = require('./emailService');
const { sendToUser } = require('./pushService');

/**
 * Creates + immediately dispatches a notification on a single channel, guarding against duplicates.
 */
async function dispatch({ user, record, channel, title, message }) {
  // Duplicate prevention: same record + channel within the same minute-scheduled slot.
  const existing = await Notification.findOne({
    recordId: record._id,
    channel,
    status: { $in: ['sent', 'delivered'] },
  });
  if (existing) return existing;

  const notification = await Notification.create({
    userId: user._id,
    recordId: record._id,
    channel,
    title,
    message,
    scheduledAt: new Date(),
    status: 'scheduled',
  });

  try {
    if (channel === 'sms') {
      const result = await sendSMS({ to: `${user.countryCode || ''}${user.phone || ''}`, message: `${title}: ${message}` });
      if (!result.success) throw new Error(result.error || 'SMS failed');
    }
    if (channel === 'email') {
      const result = await sendEmail({
        to: user.email,
        title,
        message,
        category: record.category,
        date: record.dateLabel,
        time: record.time,
      });
      if (!result.success) throw new Error(result.error || 'Email failed');
    }
    // in_app and alarm are surfaced purely via the notifications collection + frontend polling.

    notification.status = 'sent';
    notification.sentAt = new Date();
    await notification.save();
  } catch (err) {
    notification.status = 'failed';
    notification.error = err.message;
    await notification.save();
  }

  return notification;
}

/**
 * Fires all enabled channels for a record's reminder (in-app + alarm always,
 * SMS/email only if the user opted in for that module).
 */
async function fireReminder(user, record) {
  const prefs = user.notificationPreferences || {};
  const modulePrefs = record.module === 'documents' ? prefs.documents : prefs.personal;

  const title = record.title;
  const message = buildReminderMessage(record);

  const channels = new Set();
  if (!modulePrefs || modulePrefs.inApp !== false) channels.add('in_app');
  if (modulePrefs?.alarm) {
    // "Alarm" means an urgent alert: browser popup/sound AND a real SMS ping to the
    // user's registered phone number, so the reminder reaches them even if the app
    // isn't open. If SMS isn't configured yet it safely falls back to mock/log mode.
    channels.add('alarm');
    channels.add('sms');
  }
  if (modulePrefs?.sms) channels.add('sms');
  if (modulePrefs?.email) channels.add('email');

  const results = [];
  for (const channel of channels) {
    // eslint-disable-next-line no-await-in-loop
    results.push(await dispatch({ user, record, channel, title, message }));
  }

  // One push per reminder (not one per channel) to every device the user enabled push on.
  // Skipped silently when push isn't configured or the user turned off both in-app and alarm.
  if (channels.has('in_app') || channels.has('alarm')) {
    try {
      await sendToUser(user._id, {
        title,
        body: message,
        url: '/app/notifications',
        tag: `reminder-${record._id}`,
      });
    } catch (err) {
      console.error('Push failed:', err.message);
    }
  }
  return results;
}

function buildReminderMessage(record) {
  if (record.module === 'documents') {
    return `${record.category} — due ${record.dateLabel}${record.time ? ` at ${record.time}` : ''}.`;
  }
  return `${record.category || 'Reminder'} — ${record.dateLabel}${record.time ? ` at ${record.time}` : ''}.`;
}

module.exports = { dispatch, fireReminder, buildReminderMessage };
