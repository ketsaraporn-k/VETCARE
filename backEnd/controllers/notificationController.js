const Notification = require('../models/Notification');

exports.getNotifications = async (req, res) => {
  const data = await Notification.find({ userId: req.user.id });
  res.json(data);
};

exports.markRead = async (req, res) => {
  const updated = await Notification.findByIdAndUpdate(
    req.params.id,
    { status: 'read' },
    { new: true }
  );
  res.json(updated);
};
