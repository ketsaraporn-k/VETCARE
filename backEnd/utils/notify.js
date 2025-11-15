// backEnd/utils/notify.js
const User = require('../models/User');

async function createNotificationForUser(userId, payload = {}) {
  if (!userId) throw new Error('userId required');
  const { type = 'system', message = '', data = {}, status = 'unread' } = payload;

  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');

  const n = {
    type,
    message,
    status,
    data,
    createdAt: new Date()
  };

  user.notifications.push(n);
  if (status === 'unread') user.unreadNotifications = (user.unreadNotifications || 0) + 1;
  await user.save();

  const added = user.notifications[user.notifications.length - 1];
  // return plain object
  return (typeof added.toObject === 'function') ? added.toObject() : added;
}

/**
 * Convenience: accept single id or array of userIds
 */
async function createNotification(userOrIds, payload = {}) {
  if (!userOrIds) throw new Error('userOrIds required');
  if (Array.isArray(userOrIds)) {
    const results = [];
    for (const id of userOrIds) {
      try {
        const r = await createNotificationForUser(id, payload);
        results.push({ userId: id, notification: r });
      } catch (e) {
        // continue — don't fail whole batch
        results.push({ userId: id, error: e.message });
      }
    }
    return results;
  }
  return createNotificationForUser(userOrIds, payload);
}

module.exports = { createNotification, createNotificationForUser };
