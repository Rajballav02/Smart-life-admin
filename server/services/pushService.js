const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

/**
 * Web Push: reminders reach the phone even when the app is closed (Android Chrome, desktop
 * browsers, and iPhone once the app is added to the Home Screen, iOS 16.4+).
 * Needs VAPID keys (`npm run vapid`). Without them push is simply switched off — nothing breaks.
 */
let configured = false;
function configure() {
  if (configured) return true;
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  configured = true;
  return true;
}

const isConfigured = () => !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Sends one payload to every device the user has subscribed. Dead subscriptions are removed. */
async function sendToUser(userId, { title, body, url = '/app/notifications', tag }) {
  if (!configure()) return { sent: 0, mock: true };

  const subs = await PushSubscription.find({ userId });
  const payload = JSON.stringify({ title, body, url, tag });
  let sent = 0;

  await Promise.all(subs.map(async (sub) => {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload, { TTL: 60 * 60 * 24 });
      sent += 1;
    } catch (err) {
      // 404/410 = the browser unsubscribed or the app was uninstalled.
      if (err.statusCode === 404 || err.statusCode === 410) await PushSubscription.deleteOne({ _id: sub._id });
    }
  }));

  return { sent, mock: false };
}

module.exports = { sendToUser, isConfigured };
