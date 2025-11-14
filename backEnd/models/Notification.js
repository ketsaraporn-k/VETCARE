// backEnd/models/Notification.js (ตัวอย่าง)
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['low_stock','appointment_upcoming','system','stock'], default: 'system' },
  message: { type: String, required: true },
  status: { type: String, enum: ['unread','read'], default: 'unread' },
  targetId: { type: mongoose.Schema.Types.ObjectId }, // optional reference to medicine/appointment id
  metadata: { type: Object },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
