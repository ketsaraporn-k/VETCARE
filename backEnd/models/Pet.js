const mongoose = require('mongoose');

const petSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  name: { type: String, required: true },
  species: { type: String },
  breed: { type: String },
  gender: { type: String },
  age: { type: Date },
  healthStatus: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Pet', petSchema);
