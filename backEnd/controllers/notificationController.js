// backEnd/controllers/notificationController.js
const User = require('../models/User');

/**
 * GET /api/notifications
 * returns notifications for current user (req.user.id expected)
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const limit = Math.min(200, Number(req.query.limit || 50));
    const user = await User.findById(userId).select('notifications unreadNotifications').lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const items = (user.notifications || []).slice().sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
    return res.json({ notifications: items, unread: user.unreadNotifications || 0 });
  } catch (err) {
    console.error('getNotifications err:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};

/**
 * PUT /api/notifications/:id/read
 * mark a user's embedded notification as read
 */
exports.markRead = async (req, res) => {
  try {
    const id = req.params.id;
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const n = user.notifications.id(id);
    if (!n) return res.status(404).json({ error: 'Notification not found' });

    if (n.status === 'unread') {
      n.status = 'read';
      user.unreadNotifications = Math.max(0, (user.unreadNotifications || 0) - 1);
    }
    await user.save();

    return res.json({ notification: (n.toObject ? n.toObject() : n), unread: user.unreadNotifications || 0 });
  } catch (err) {
    console.error('markRead err:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
};
