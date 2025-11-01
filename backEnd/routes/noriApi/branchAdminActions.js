// routes/branchAdminActions.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// ✅ SuperAdmin ย้ายผู้ใช้ไปสาขาอื่นทันที
router.put('/moveUser/:userId', auth, role(['superAdmin']), async (req, res) => {
  try {
    const { targetBranch } = req.body;

    const updated = await User.findByIdAndUpdate(
      req.params.userId,
      { branchId: targetBranch },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User moved successfully', updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
