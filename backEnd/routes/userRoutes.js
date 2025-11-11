// backEnd/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const User = require('../models/User');

// multer for avatar uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ensure upload folder exists
const AVATARS_DIR = path.join(__dirname, '..', 'uploads', 'avatars');
if (!fs.existsSync(AVATARS_DIR)) {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, AVATARS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

// ----------------- Avatar upload -----------------
// POST /api/users/upload-avatar
// requires auth; updates user's profilePicture { filename, url, uploadedAt }
router.post('/upload-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // build public URL path consistent with server static mount: /uploads/avatars/<filename>
    const url = `/uploads/avatars/${req.file.filename}`;

    // update user.profilePicture (store filename + url + uploadedAt)
    const updated = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: { filename: req.file.filename, url, uploadedAt: new Date() } },
      { new: true }
    ).select('-password');

    return res.json({ message: 'Avatar uploaded', profilePicture: updated.profilePicture });
  } catch (err) {
    console.error('upload-avatar err:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ----------------- Auth / profile -----------------
router.post('/register', userController.register);

// login + logout should exist in controller
router.post('/login', userController.login);
router.post('/logout', userController.logout);

// protected profile
router.get('/profile', auth, userController.getProfile);

// ----------------- CRUD (protected) -----------------
router.post('/', auth, role(['superAdmin', 'branchAdmin']), userController.createUser);
router.get('/', auth, role(['superAdmin', 'branchAdmin', 'staff']), userController.getUsers);
router.get('/:id', auth, userController.getUserById);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, role(['superAdmin', 'branchAdmin']), userController.deleteUser);

module.exports = router;
