// backEnd/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

/* ---------- Allergy subdocument ---------- */
const AllergySchema = new Schema({
  name: { type: String, required: true, trim: true },           // ชื่อยา/สารก่อภูมิแพ้
  reaction: { type: String, default: null },                    // อาการ (e.g. rash, anaphylaxis)
  severity: { type: String, enum: ['mild','moderate','severe'], default: 'moderate' },
  note: { type: String, default: null },                        // หมายเหตุเพิ่มเติม
  recordedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  recordedAt: { type: Date, default: Date.now }
}, { _id: true });

/* ---------- Treatment / Vaccination subdocuments ---------- */
const AttachmentSchema = new Schema({
  filename: { type: String },
  url: { type: String },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, { _id: false });

const TreatmentSchema = new Schema({
  symptoms: { type: String, default: null },
  diagnosis: { type: String, default: null },
  notes: { type: String, default: null },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  medicineId: { type: Schema.Types.ObjectId, required: true }, // ref to Branch.medicines._id
  medicineNameSnapshot: { type: String, required: true },
  quantityUsed: { type: Number, default: 1 },
  treatmentDate: { type: Date, default: Date.now },
  staffId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  attachments: { type: [AttachmentSchema], default: [] }
}, { _id: true, timestamps: true });

const VaccinationSchema = new Schema({
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', required: true },
  medicineId: { type: Schema.Types.ObjectId, required: true },
  medicineNameSnapshot: { type: String, required: true },
  doseQty: { type: Number, default: 1 },
  batch: { type: String, default: null },
  expiryDate: { type: Date, default: null },
  dateGiven: { type: Date, default: Date.now },
  nextDueDate: { type: Date, default: null },
  staffId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  attachments: { type: [AttachmentSchema], default: [] }
}, { _id: true, timestamps: true });

/* ---------- Pet subdocument ---------- */
const PetSchema = new Schema({
  name: { type: String, required: true },
  species: { type: String, default: null },
  sex: { type: String, default: null },
  age: { type: String, default: null },
  breed: { type: String, default: null },
  treatments: { type: [TreatmentSchema], default: [] },
  vaccinations: { type: [VaccinationSchema], default: [] },
  drugAllergies: { type: [AllergySchema], default: [] },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false } // soft-flag
}, { _id: true });

/* ---------- Notification (embedded) ---------- */
const EmbeddedNotificationSchema = new Schema({
  type: { type: String, enum: ['low_stock','appointment_upcoming','system','stock','reminder'], default: 'system' },
  message: { type: String, required: true },
  status: { type: String, enum: ['unread','read'], default: 'unread' },
  data: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

/* ---------- User schema ---------- */
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true },
  email: { type: String, default: null, index: true },
  phone: { type: String, default: null },
  addressUser: { type: String, default: null },
  role: {
    type: String,
    enum: ['owner','staff','doctor','branchAdmin','superAdmin'],
    required: true,
    default: 'owner'
  },
  doctorProfile: {
    licenseNumber: { type: String, default: null },
    specialty: { type: String, default: null },
    availableBranches: [{ type: Schema.Types.ObjectId, ref: 'Branch' }]
  },
  branchId: { type: Schema.Types.ObjectId, ref: 'Branch', default: null },
  pets: { type: [PetSchema], default: [] },
  notifications: { type: [EmbeddedNotificationSchema], default: [] },
  unreadNotifications: { type: Number, default: 0 },
  profilePicture: { 
    filename: { type: String, default: null },
    url: { type: String, default: null }, 
    uploadedAt: { type: Date, default: null }
  },
  metadata: { type: Schema.Types.Mixed, default: {} },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null }
}, {
  collection: 'users',
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform(doc, ret) {
      delete ret.password;
      delete ret.__v;
      ret.id = ret._id;
      delete ret._id;
    }
  }
});

/* ---------- Hooks & Methods ---------- */
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) { next(err); }
});

UserSchema.methods.comparePassword = function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

UserSchema.methods.addPet = function(petPayload) {
  this.pets.push(petPayload);
  return this.save();
};

UserSchema.methods.addNotification = function(notificationPayload) {
  this.notifications.push(notificationPayload);
  if (notificationPayload.status === 'unread') this.unreadNotifications += 1;
  return this.save();
};

UserSchema.methods.markNotificationRead = function(notificationId) {
  const n = this.notifications.id(notificationId);
  if (!n) return null;
  if (n.status === 'unread') {
    n.status = 'read';
    this.unreadNotifications = Math.max(0, this.unreadNotifications - 1);
  }
  return this.save();
};

/* ---------- Allergy helpers ---------- */
/**
 * Check whether a given pet has an allergy matching medicineName.
 * mode: 'substring' (default) or 'exact'
 * returns: { matched: Boolean, entries: [AllergySchema] }
 */
UserSchema.methods.hasPetAllergy = function(petId, medicineName, opts = { mode: 'substring' }) {
  if (!medicineName) return { matched: false, entries: [] };
  const pet = this.pets.id(petId);
  if (!pet) return { matched: false, entries: [] };
  const needle = (medicineName || '').toLowerCase();
  const matches = (pet.drugAllergies || []).filter(a => {
    if (!a || !a.name) return false;
    const target = (a.name || '').toLowerCase();
    return (opts.mode === 'exact') ? (target === needle) : (target.includes(needle));
  });
  return { matched: matches.length > 0, entries: matches };
};

UserSchema.methods.getPetAllergies = function(petId) {
  const pet = this.pets.id(petId);
  return pet ? (pet.drugAllergies || []) : [];
};

/* ==== Compatibility helpers for notifications (embedded) ==== */
UserSchema.statics.createNotificationForUser = async function(userId, payload = {}) {
  const UserModel = this;
  if (!userId) throw new Error('userId required');
  const { type = 'system', message = '', data = {}, status = 'unread' } = payload;
  const user = await UserModel.findById(userId);
  if (!user) throw new Error('User not found');
  const n = { type, message, data, status, createdAt: new Date() };
  user.notifications.push(n);
  if (status === 'unread') user.unreadNotifications = (user.unreadNotifications || 0) + 1;
  await user.save();
  return user.notifications[user.notifications.length - 1];
};

/* ==== Optional: pet helpers (recommended) ==== */
UserSchema.statics.createPetForOwner = async function(ownerId, petPayload = {}) {
  const user = await this.findById(ownerId);
  if (!user) throw new Error('Owner not found');
  user.pets.push(petPayload);
  await user.save();
  return user.pets[user.pets.length - 1];
};



module.exports = mongoose.model('User', UserSchema);
