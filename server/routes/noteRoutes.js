const express = require('express');
const { createNote, getNotes, getNote, deleteNote } = require('../controllers/noteController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.post('/', createNote);
router.get('/', getNotes);
router.get('/:id', getNote);
router.delete('/:id', deleteNote);

module.exports = router;
