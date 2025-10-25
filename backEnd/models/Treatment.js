const mongoose = require('mongoose');

const treatmentSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  symptoms: { type: String },
  diagnosis: { type: String },
  prescription: { type: String },
  treatmentDate: { type: Date, required: true },
});

module.exports = mongoose.model('Treatment', treatmentSchema);
