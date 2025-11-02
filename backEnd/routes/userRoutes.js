// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/{king}-userController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

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
