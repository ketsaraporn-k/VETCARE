const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  petId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Pet', required: true },
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
  staffId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  serviceType: {
  type: String,
  enum: ['treatment', 'vaccine', 'grooming', 'other', 'checkup'],
  required: true,
  set: (v) => {
    const val = String(v || '').toLowerCase();
    const allowed = ['treatment', 'vaccine', 'grooming', 'other', 'checkup'];
    return allowed.includes(val) ? val : 'other';
  }
},
  scheduledAt: { type: Date, required: true },   
  status:      { type: String, enum: ['pending','confirmed','done','canceled'], default: 'pending' },
  note:        { type: String, default: '' },
  createdAt:   { type: Date, default: Date.now },
});

scheduleSchema.index({ branchId: 1, scheduledAt: 1 });
scheduleSchema.index({ petId: 1, scheduledAt: -1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
