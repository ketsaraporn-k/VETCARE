const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  name: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  unit: { type: String },
  lowStockAlert: { type: Boolean, default: false },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Medicine', medicineSchema);
