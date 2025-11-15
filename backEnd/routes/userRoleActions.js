// backEnd/routes/userRoleActions.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');

// ✅ SuperAdmin เปลี่ยน role ของ user คนอื่นได้
router.put('/changeRole/:userId', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const { newRole } = req.body;
    if (!newRole) {
      return res.status(400).json({ error: 'New role is required' });
    }

    const allowedRoles = ['owner', 'staff', 'branchAdmin', 'superAdmin'];
    if (!allowedRoles.includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const targetUser = await User.findById(req.params.userId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }

    targetUser.role = newRole;
    await targetUser.save();

    res.json({
      message: 'User role updated successfully',
      user: {
        id: targetUser._id,
        username: targetUser.username,
        newRole: targetUser.role
      }
    });
  } catch (err) {
    console.error('changeRole error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
