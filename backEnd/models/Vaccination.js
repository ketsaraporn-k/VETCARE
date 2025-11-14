const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
  petId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vaccineType: { type: String, required: true },
  dateGiven: { type: Date, required: true },
  nextDueDate: { type: Date },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  note: { type: String },
});

module.exports = mongoose.model('Vaccination', vaccinationSchema);
