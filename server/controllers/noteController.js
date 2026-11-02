const Note = require('../models/Note');
const Record = require('../models/Record');
const asyncHandler = require('../utils/asyncHandler');
const { parseNote } = require('../services/smartParser');

const REMINDER_DEFAULT_OFFSET = {
  personal: 60, // 1 hour before
  documents: 60 * 24 * 7, // 7 days before expiry
};

const createNote = asyncHandler(async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ message: "We couldn't organize that note. Try writing a little more detail." });
  }

  const extractedItems = parseNote(text);
  if (extractedItems.length === 0) {
    return res.status(422).json({ message: "We couldn't organize that note. Try writing a little more detail." });
  }

  const note = await Note.create({
    userId: req.user._id,
    originalText: text,
    itemsExtracted: extractedItems.length,
  });

  const records = await Record.insertMany(extractedItems.map((item) => ({
    userId: req.user._id,
    noteId: note._id,
    module: item.module,
    type: item.type,
    title: item.title,
    category: item.category,
    amount: item.amount,
    date: item.date,
    dateLabel: item.dateLabel,
    time: item.time,
    priority: item.priority,
    recurring: item.recurring,
    frequency: item.frequency,
    reminderEnabled: item.reminderEnabled && item.date !== null,
    reminderOffsetMinutes: REMINDER_DEFAULT_OFFSET[item.module] ?? null,
    metadata: { sourceClause: item.sourceClause },
  })));

  res.status(201).json({ note, records });
});

const getNotes = asyncHandler(async (req, res) => {
  const notes = await Note.find({ userId: req.user._id }).sort({ createdAt: -1 });
  res.json({ notes });
});

const getNote = asyncHandler(async (req, res) => {
  const note = await Note.findOne({ _id: req.params.id, userId: req.user._id });
  if (!note) return res.status(404).json({ message: 'Note not found.' });
  const records = await Record.find({ noteId: note._id, userId: req.user._id });
  res.json({ note, records });
});

const deleteNote = asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!note) return res.status(404).json({ message: 'Note not found.' });
  await Record.deleteMany({ noteId: note._id, userId: req.user._id });
  res.json({ message: 'Note and its records deleted.' });
});

module.exports = { createNote, getNotes, getNote, deleteNote };
