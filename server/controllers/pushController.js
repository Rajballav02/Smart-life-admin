const PushSubscription = require('../models/PushSubscription');
const asyncHandler = require('../utils/asyncHandler');
const push = require('../services/pushService');

const publicKey = asyncHandler(async (req, res) => {
  res.json({ enabled: push.isConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

const subscribe = asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body || {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return res.status(400).json({ message: 'Invalid push subscription.' });
  }
  await PushSubscription.findOneAndUpdate(
    { endpoint },
    { userId: req.user._id, endpoint, keys, userAgent: req.headers['user-agent'] || '' },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  res.status(201).json({ message: 'Push notifications enabled on this device.' });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body || {};
  if (endpoint) await PushSubscription.deleteOne({ endpoint, userId: req.user._id });
  res.json({ message: 'Push notifications disabled on this device.' });
});

const test = asyncHandler(async (req, res) => {
  if (!push.isConfigured()) {
    return res.status(503).json({ message: 'Push is not set up on the server yet (missing VAPID keys).' });
  }
  const result = await push.sendToUser(req.user._id, {
    title: 'Smart Life Admin',
    body: 'Push notifications are working on this device. 🎉',
    tag: 'test',
  });
  if (!result.sent) return res.status(404).json({ message: 'No subscribed device found. Enable push first.' });
  res.json({ message: `Sent to ${result.sent} device(s).` });
});

module.exports = { publicKey, subscribe, unsubscribe, test };
