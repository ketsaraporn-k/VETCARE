// routes/transferRoutes.js
const express = require('express');
const router = express.Router();
const TransferRequest = require('../models/TransferRequest');
const User = require('../models/User');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// ✅ branchAdmin ส่งคำขอย้ายสาขา
router.post('/', auth, role(['branchAdmin']), async (req, res) => {
  try {
    const request = await TransferRequest.create({
    userId: req.user.id,
    currentBranch: req.user.branchId,
    targetBranch: req.body.targetBranch,
    status: 'pending'
  });

  res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ superAdmin อนุมัติ
router.put('/approve/:id', auth, role(['superAdmin']), async (req, res) => {
  try {
    const reqData = await TransferRequest.findById(req.params.id);

    if (!reqData) return res.status(404).json({ message: 'Request not found' });

    await User.findByIdAndUpdate(reqData.userId, { branchId: reqData.targetBranch });
    reqData.status = 'approved';
    await reqData.save();

    res.json({ message: 'Approved', reqData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ❌ superAdmin ปฏิเสธ
router.put('/reject/:id', auth, role(['superAdmin']), async (req, res) => {
  try {
    const reqData = await TransferRequest.findById(req.params.id);

    if (!reqData) return res.status(404).json({ message: 'Request not found' });

    reqData.status = 'rejected';
    await reqData.save();

    res.json({ message: 'Rejected', reqData });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ superAdmin ดูคำขอย้ายทั้งหมด
router.get('/', auth, role(['superAdmin']), async (req, res) => {
  try {
    const requests = await TransferRequest.find().populate('userId');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
