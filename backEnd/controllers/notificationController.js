// backEnd/controllers/notificationController.js
const Notification = require('../models/Notification');

/**
 * GET /api/notifications
 * ดึงแจ้งเตือนของผู้ที่ login (req.user)
 * query params: ?limit=20
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const limit = Math.min(200, Number(req.query.limit || 50));

    const items = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.json(items);
  } catch (err) {
    console.error('getNotifications err:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * mark notification as read (only owner allowed)
 */
exports.markRead = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user._id;

    const noti = await Notification.findById(id);
    if (!noti) return res.status(404).json({ error: 'Notification not found' });
    if (String(noti.userId) !== String(userId)) return res.status(403).json({ error: 'Permission denied' });

    noti.status = 'read';
    await noti.save();

    return res.json(noti);
  } catch (err) {
    console.error('markRead err:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
