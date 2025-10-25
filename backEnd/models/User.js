const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // bcrypt เข้ารหัส
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: Number },
  role: { type: String, enum: ['owner', 'staff', 'branchAdmin', 'superAdmin'], required: true },
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
