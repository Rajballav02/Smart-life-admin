const express = require('express');
const {
  createRecord, getRecords, getRecord, updateRecord, deleteRecord, completeRecord, snoozeRecord,
} = require('../controllers/recordController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/', createRecord);
router.get('/', getRecords);
router.get('/:id', getRecord);
router.put('/:id', updateRecord);
router.delete('/:id', deleteRecord);
router.post('/:id/complete', completeRecord);
router.post('/:id/snooze', snoozeRecord);

module.exports = router;
