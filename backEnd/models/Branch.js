const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  branchName: { type: String, required: true },
  address: { type: String },
  phone: { type: Number },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Branch', branchSchema);
