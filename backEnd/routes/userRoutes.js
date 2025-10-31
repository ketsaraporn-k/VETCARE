const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 🔐 JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'petClinicSecretKey';

// ====================== REGISTER ======================
router.post('/register', async (req, res) => {
  try {
    const { username, password, name, email, phone, role, branchId } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ error: 'Username already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashed,
      name,
      email,
      phone,
      role,
      branchId
    });

    res.status(201).json({ message: 'User registered successfully', user: newUser });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ====================== LOGIN ======================
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user._id, role: user.role, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====================== VERIFY TOKEN ======================
function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ====================== PROFILE ======================
router.get('/profile', verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ====================== CRUD ======================

// CREATE (เฉพาะ admin)
router.post('/', verifyToken, async (req, res) => {
  if (req.user.role !== 'superAdmin' && req.user.role !== 'branchAdmin')
    return res.status(403).json({ error: 'Permission denied' });

  try {
    const hashed = await bcrypt.hash(req.body.password, 10);
    const user = await User.create({ ...req.body, password: hashed });
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL (admin เท่านั้น)
router.get('/', verifyToken, async (req, res) => {
  if (req.user.role === 'owner')
    return res.status(403).json({ error: 'Permission denied' });

  const users = await User.find().select('-password');
  res.json(users);
});

// READ ONE
router.get('/:id', verifyToken, async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ✅ UPDATE — เจ้าของแก้ไขได้เฉพาะของตนเอง
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // ถ้าเป็น owner — ต้องแก้เฉพาะของตนเองเท่านั้น
    if (req.user.role === 'owner' && req.user.id !== id) {
      return res.status(403).json({ error: 'You can only edit your own profile' });
    }

    // ถ้าเป็น staff หรือ admin สามารถแก้ของคนอื่นได้ตามสิทธิ์
    if (
      req.user.role !== 'owner' &&
      req.user.role !== 'superAdmin' &&
      req.user.role !== 'branchAdmin' &&
      req.user.id !== id
    ) {
      return res.status(403).json({ error: 'Permission denied' });
    }

    const updateData = { ...req.body };

    // ถ้ามีการอัปเดตรหัสผ่าน → เข้ารหัสใหม่
    if (updateData.password)
      updateData.password = await bcrypt.hash(updateData.password, 10);

    // จำกัดฟิลด์ที่ owner สามารถแก้ไขได้
    if (req.user.role === 'owner') {
      const allowedFields = ['name', 'email', 'phone', 'password'];
      Object.keys(updateData).forEach((key) => {
        if (!allowedFields.includes(key)) delete updateData[key];
      });
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE (เฉพาะ admin)
router.delete('/:id', verifyToken, async (req, res) => {
  if (req.user.role !== 'superAdmin' && req.user.role !== 'branchAdmin')
    return res.status(403).json({ error: 'Permission denied' });

  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;
