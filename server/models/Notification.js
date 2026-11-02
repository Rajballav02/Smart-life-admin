const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  recordId: { type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null },

  channel: { type: String, enum: ['in_app', 'alarm', 'sms', 'email'], required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },

  scheduledAt: { type: Date, default: null },
  sentAt: { type: Date, default: null },

  status: {
    type: String,
    enum: ['scheduled', 'sent', 'delivered', 'read', 'snoozed', 'dismissed', 'failed'],
    default: 'scheduled',
  },
  error: { type: String, default: '' },
}, { timestamps: true });

notificationSchema.index({ userId: 1, status: 1, createdAt: -1 });
// Prevent duplicate notifications for the same record/channel/schedule slot.
notificationSchema.index({ recordId: 1, channel: 1, scheduledAt: 1 }, { unique: false });

module.exports = mongoose.model('Notification', notificationSchema);
