// backEnd/models/MoveRequest.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

const HistoryEntrySchema = new Schema({
  action: { type: String, required: true }, // created, approved, rejected, cancelled
  by: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  at: { type: Date, default: Date.now },
  reason: { type: String, default: null },
  note: { type: String, default: null }
}, { _id: true });

const MoveRequestSchema = new Schema({
  requesterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  subjectUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fromBranch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  toBranch: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  reason: { type: String, default: null },
  status: { type: String, enum: ['pending','approved','rejected','cancelled'], default: 'pending' },
  processedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  processedAt: { type: Date, default: null },
  metadata: { type: Schema.Types.Mixed, default: {} },
  history: { type: [HistoryEntrySchema], default: [] },
  requestDate: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: 'move_requests',
  timestamps: true
});

/* ---------- Helper methods ---------- */
MoveRequestSchema.methods.addHistory = function(action, by = null, opts = {}) {
  this.history.push({
    action,
    by,
    at: opts.at || new Date(),
    reason: opts.reason || null,
    note: opts.note || null
  });
  return this;
};

MoveRequestSchema.methods.approve = function(processorId, opts = {}) {
  this.status = 'approved';
  this.processedBy = processorId;
  this.processedAt = opts.processedAt || new Date();
  this.addHistory('approved', processorId, opts);
  return this;
};

MoveRequestSchema.methods.reject = function(processorId, opts = {}) {
  this.status = 'rejected';
  this.processedBy = processorId;
  this.processedAt = opts.processedAt || new Date();
  this.addHistory('rejected', processorId, opts);
  return this;
};

/* ---------- Indexes ---------- */
MoveRequestSchema.index({ subjectUserId: 1, status: 1, requestDate: -1 });
MoveRequestSchema.index({ requesterId: 1, requestDate: -1 });

module.exports = mongoose.model('MoveRequest', MoveRequestSchema);
