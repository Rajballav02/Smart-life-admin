const mongoose = require('mongoose');

const recordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', default: null },

  module: {
    type: String,
    enum: ['personal', 'finance', 'documents'],
    required: true,
    index: true,
  },

  // e.g. task, appointment, meeting (personal) | income, expense, bill, subscription (finance)
  // | document, asset, insurance, warranty, service (documents)
  type: { type: String, required: true },

  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  category: { type: String, default: 'General' },

  amount: { type: Number, default: null },

  // Stored as an actual Date when known, plus a human label for "Not specified" cases.
  date: { type: Date, default: null },
  dateLabel: { type: String, default: 'Not specified' },
  time: { type: String, default: '' },

  priority: { type: String, enum: ['high', 'medium', 'low'], default: 'low' },
  status: { type: String, enum: ['pending', 'completed', 'overdue'], default: 'pending' },

  recurring: { type: Boolean, default: false },
  frequency: { type: String, enum: ['none', 'daily', 'weekly', 'monthly', 'yearly'], default: 'none' },

  reminderEnabled: { type: Boolean, default: false },
  reminderOffsetMinutes: { type: Number, default: null }, // minutes before `date` to fire reminder
  reminderSentAt: { type: Date, default: null },

  pinned: { type: Boolean, default: false },

  attachments: [{
    name: { type: String, required: true },
    dataUrl: { type: String, required: true }, // small files stored inline as base64 data URLs
    size: { type: Number, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  }],

  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

recordSchema.index({ userId: 1, module: 1, status: 1 });
recordSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('Record', recordSchema);
