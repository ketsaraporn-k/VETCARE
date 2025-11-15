// backEnd/models/Branch.js
const mongoose = require('mongoose');

const { Schema } = mongoose;

/* ---------- Medicine Batch & Medicine ---------- */
const MedicineBatchSchema = new Schema({
  batchId: { type: String, required: true },
  qty: { type: Number, required: true, default: 0 },
  expiryDate: { type: Date, default: null },
  receivedAt: { type: Date, default: Date.now },
  receivedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: true });

const MedicineSchema = new Schema({
  medicineName: { type: String, required: true, index: true },
  stock: { type: Number, default: 0 }, // total qty (sum of batches or direct)
  unit: { type: String, default: 'pcs' },
  lowStockThreshold: { type: Number, default: 5 },
  lowStockAlert: { type: Boolean, default: false },
  manufacturer: { type: String, default: null },
  category: { type: String, default: null },
  batches: { type: [MedicineBatchSchema], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAtMedicine: { type: Date, default: Date.now },
  updatedAtMedicine: { type: Date, default: Date.now }
}, { _id: true });

/* ---------- Schedule ---------- */
const ScheduleSchema = new Schema({
  petId: { type: Schema.Types.ObjectId, ref: 'User' },
  staffId: { type: Schema.Types.ObjectId, ref: 'User' },        
  doctorId: { type: Schema.Types.ObjectId, ref: 'User', default: null }, 
  serviceType: { type: String },
  scheduledAt: { type: Date, index: true },                     
  durationMinutes: { type: Number, default: 30 },               
  endAt: { type: Date, index: true },                           
  status: {
    type: String,
    enum: ['pending','confirmed','done','cancelled'],
    default: 'pending'
  },
  notes: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

/* ---------- Branch schema ---------- */
const BranchSchema = new Schema({
  branchName: { type: String, required: true, index: true },
  addressBranch: { type: String, default: null },
  phone: { type: String, default: null },
  managerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  medicines: { type: [MedicineSchema], default: [] },
  schedules: { type: [ScheduleSchema], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: 'branches',
  timestamps: true
});


module.exports = mongoose.model('Branch', BranchSchema);
