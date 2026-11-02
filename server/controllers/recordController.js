const Record = require('../models/Record');
const asyncHandler = require('../utils/asyncHandler');

const createRecord = asyncHandler(async (req, res) => {
  const payload = { ...req.body, userId: req.user._id };
  const record = await Record.create(payload);
  res.status(201).json({ record });
});

const getRecords = asyncHandler(async (req, res) => {
  const { module: moduleName, status, category, priority, search, from, to } = req.query;
  const filter = { userId: req.user._id };

  if (moduleName) filter.module = moduleName;
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { category: { $regex: search, $options: 'i' } },
    ];
  }

  const records = await Record.find(filter).sort({ pinned: -1, date: 1, createdAt: -1 });
  res.json({ records });
});

const getRecord = asyncHandler(async (req, res) => {
  const record = await Record.findOne({ _id: req.params.id, userId: req.user._id });
  if (!record) return res.status(404).json({ message: 'Record not found.' });
  res.json({ record });
});

const updateRecord = asyncHandler(async (req, res) => {
  const record = await Record.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: req.body },
    { new: true, runValidators: true },
  );
  if (!record) return res.status(404).json({ message: 'Record not found.' });
  res.json({ record });
});

const deleteRecord = asyncHandler(async (req, res) => {
  const record = await Record.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!record) return res.status(404).json({ message: 'Record not found.' });
  res.json({ message: 'Record deleted.' });
});

const completeRecord = asyncHandler(async (req, res) => {
  const record = await Record.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    { $set: { status: 'completed' } },
    { new: true },
  );
  if (!record) return res.status(404).json({ message: 'Record not found.' });
  res.json({ record });
});

const snoozeRecord = asyncHandler(async (req, res) => {
  const { minutes = 60 } = req.body;
  const record = await Record.findOne({ _id: req.params.id, userId: req.user._id });
  if (!record) return res.status(404).json({ message: 'Record not found.' });

  record.reminderSentAt = null;
  if (record.date) {
    record.date = new Date(record.date.getTime() + minutes * 60 * 1000);
  }
  await record.save();
  res.json({ record });
});

module.exports = {
  createRecord, getRecords, getRecord, updateRecord, deleteRecord, completeRecord, snoozeRecord,
};
