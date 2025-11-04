// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const User = require('../models/User');


//multer
const multer = require("multer");
const path = require("path");
// เก็บไฟล์ในโฟลเดอร์ /uploadspic/avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/avatars/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
//  อัปโหลดรูป
router.post("/upload-avatar", auth, upload.single("avatar"), async (req, res) => {
  try {
    const imagePath = `/uploads/avatars/${req.file.filename}`;
    // อัปเดตในฐานข้อมูล
    await User.findByIdAndUpdate(req.user.id, { avatar: imagePath });
    res.json({ message: "Avatar uploaded", avatar: imagePath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Auth
router.post('/register', userController.register);
router.post('/login', userController.login);

// Profile
router.get('/profile', auth, userController.getProfile);

// CRUD (admin only)
router.post('/', auth, role(['superAdmin', 'branchAdmin']), userController.createUser);
router.get('/', auth, role(['superAdmin', 'branchAdmin', 'staff']), userController.getUsers);
router.get('/:id', auth, userController.getUserById);
router.put('/:id', auth, userController.updateUser);
router.delete('/:id', auth, role(['superAdmin', 'branchAdmin']), userController.deleteUser);

module.exports = router;
