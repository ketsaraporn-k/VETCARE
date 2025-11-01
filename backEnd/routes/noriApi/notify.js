const express = require('express');
const router = express.Router();
const Notification = require('../../models/Notification');

// GET แจ้งเตือนทั้งหมดของผู้ใช้
router.get('/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST สร้างแจ้งเตือนใหม่
router.post('/', async (req, res) => {
  try {
    const { userId, message, type } = req.body;
    const notification = new Notification({ userId, message, type });
    await notification.save();
    res.json({ message: 'Notification created', data: notification });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT อัพเดตสถานะอ่านแล้ว
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    res.json(notification);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
