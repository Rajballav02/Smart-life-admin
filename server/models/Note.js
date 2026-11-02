const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  originalText: { type: String, required: true },
  itemsExtracted: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Note', noteSchema);
