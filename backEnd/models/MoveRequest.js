// backEnd/models/MoveRequest.js
const mongoose = require('mongoose');

const HistoryEntrySchema = new mongoose.Schema({
  action: { type: String, required: true }, // 'created','approved','rejected','cancelled','moved'
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now },
  reason: { type: String, default: null },
  note: { type: String, default: null }
}, { _id: false });

const MoveRequestSchema = new mongoose.Schema({
  requesterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fromBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  toBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  reason: { type: String },
  status: { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' },
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
  metadata: { type: Object },
  history: { type: [HistoryEntrySchema], default: [] }
});

module.exports = mongoose.model('MoveRequest', MoveRequestSchema);
