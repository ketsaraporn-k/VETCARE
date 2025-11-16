// backEnd/controllers/userController.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'petClinicSecretKey';
const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'vetcare_token';
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

// REGISTER
exports.register = async (req, res) => {
  try {
    const {
      username,
      password,
      name,
      email,
      phone,
      addressUser,
      role,
      branchId,
      pets,
      doctorProfile,
      profilePicture,
      metadata
    } = req.body;

    // ตรวจฟิลด์ที่จำเป็น
    if (!username || !password || !name) {
      return res.status(422).json({ error: 'username, password and name are required' });
    }

    // ตรวจซ้ำ username
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // สร้าง user ใหม่
    const newUser = new User({
      username,
      password, // UserSchema.pre('save') จะ hash ให้เอง
      name,
      email: email || null,
      phone: phone || null,
      addressUser: addressUser || null,
      role: role || 'owner',
      branchId: branchId || null,
      pets: pets || [],
      doctorProfile: doctorProfile || {},
      profilePicture: profilePicture || {},
      metadata: metadata || {},
      createdBy: req.user?.id || null,
      updatedBy: req.user?.id || null
    });

    await newUser.save();

    const out = newUser.toJSON ? newUser.toJSON() : newUser;
    return res.status(201).json({ message: 'User registered successfully', user: out });

  } catch (err) {
    console.error('register err', err);
    return res.status(400).json({ error: err.message });
  }
};

// LOGIN (sets httpOnly cookie, returns sanitized user + token)
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(422).json({ error: 'username and password required' });

    const user = await User.findOne({ username }).select('+password');
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid password' });

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, branchId: user.branchId ? user.branchId.toString() : null },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // set cookie
    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE
    });

    // sanitized user
    const safeUser = {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role,
      branchId: user.branchId || null
    };

    // ✅ ส่ง token ใน response ด้วย
    return res.json({
      message: 'Login successful',
      user: safeUser,
      token
    });

  } catch (err) {
    console.error('login err', err);
    return res.status(500).json({ error: err.message });
  }
};


// LOGOUT (clear cookie)
exports.logout = async (req, res) => {
  try {
    const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || 'vetcare_token';
    // clear cookie (httpOnly)
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return res.json({ message: 'Logged out' });
  } catch (err) {
    console.error('logout err:', err);
    return res.status(500).json({ error: err.message });
  }
};

// GET PROFILE (auth middleware should attach req.user)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('getProfile err', err);
    return res.status(500).json({ error: err.message });
  }
};
// GET PROFILE (OwnerPet)
exports.getProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // ดึง user เฉพาะ owner พร้อม pets
    const user = await User.findById(userId)
      .select('-password')
      .lean(); // lean() ให้ return plain object ง่ายต่อ frontend

    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.role !== 'owner') {
      return res.status(403).json({ error: 'Access denied. Not an owner.' });
    }

    return res.json(user);
  } catch (err) {
    console.error('getProfile err', err);
    return res.status(500).json({ error: err.message });
  }
};




// CRUD - createUser (admin use)
exports.createUser = async (req, res) => {
  try {
    if (!req.body.password) return res.status(422).json({ error: 'password required' });
    const payload = { ...req.body, createdBy: req.user?.id || null, updatedBy: req.user?.id || null };
    const user = new User(payload);
    await user.save();
    const out = user.toJSON ? user.toJSON() : user;
    return res.status(201).json(out);
  } catch (err) {
    console.error('createUser err', err);
    return res.status(400).json({ error: err.message });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    return res.json(users);
  } catch (err) {
    console.error('getUsers err', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('getUserById err', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(422).json({ error: 'id required' });

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updaterRole = req.user?.role;
    let updates = { ...req.body };

    if (updaterRole === 'owner') {
      const allowedFields = ['name', 'email', 'phone', 'password', 'addressUser', 'profilePicture'];
      Object.keys(updates).forEach(k => { if (!allowedFields.includes(k)) delete updates[k]; });
    }

    Object.keys(updates).forEach(k => {
      user[k] = updates[k];
    });
    user.updatedBy = req.user?.id || user.updatedBy || null;

    await user.save(); // triggers pre-save hashing if password modified

    const out = await User.findById(id).select('-password');
    return res.json({ message: 'Profile updated successfully', user: out });
  } catch (err) {
    console.error('updateUser err', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    return res.json({ message: 'User deleted' });
  } catch (err) {
    console.error('deleteUser err', err);
    return res.status(500).json({ error: err.message });
  }
};
