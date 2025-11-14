//TransferRequest.js 

const mongoose = require('mongoose');

const transferRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  targetBranch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestDate: { type: Date, default: Date.now },
});

module.exports = mongoose.model('TransferRequest', transferRequestSchema);
