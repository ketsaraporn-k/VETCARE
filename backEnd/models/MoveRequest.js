// models/MoveRequest.js
const mongoose = require('mongoose');

const MoveRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ผู้ที่ส่งคำขอ (admin)
  subjectUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ผู้ใช้ที่จะย้าย (customer/employee)
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  reason: { type: String },
  status: { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // superAdmin who processed
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: Object } // any extra info
});

module.exports = mongoose.model('MoveRequest', MoveRequestSchema);
