const express = require('express');
const {
  getNotifications, markRead, markAllRead, snooze, dismiss,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(protect);

router.get('/', getNotifications);
router.put('/:id/read', markRead);
router.put('/read-all', markAllRead);
router.put('/:id/snooze', snooze);
router.put('/:id/dismiss', dismiss);

module.exports = router;
