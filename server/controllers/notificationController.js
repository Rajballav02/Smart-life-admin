const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');

const getNotifications = asyncHandler(async (req, res) => {
  const { status, channel, limit = 50 } = req.query;
  const filter = { userId: req.user._id };
  if (status) filter.status = status;
  if (channel) filter.channel = channel;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Number(limit));

  const unreadCount = await Notification.countDocuments({
    userId: req.user._id,
    status: { $in: ['sent', 'delivered'] },
  });

  res.json({ notifications, unreadCount });
});

const markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { status: 'read' } },
    { new: true },
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});

const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { userId: req.user._id, status: { $in: ['sent', 'delivered'] } },
    { $set: { status: 'read' } },
  );
  res.json({ message: 'All notifications marked as read.' });
});

const snooze = asyncHandler(async (req, res) => {
  const { minutes = 15 } = req.body;
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { status: 'snoozed', scheduledAt: new Date(Date.now() + minutes * 60 * 1000) } },
    { new: true },
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});

const dismiss = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { status: 'dismissed' } },
    { new: true },
  );
  if (!notification) return res.status(404).json({ message: 'Notification not found.' });
  res.json({ notification });
});

module.exports = { getNotifications, markRead, markAllRead, snooze, dismiss };
