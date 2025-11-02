// routes/noriApi/branchAdminActions.js
const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const MoveRequest = require('../../models/MoveRequest');
const auth = require('../../middleware/auth');
const role = require('../../middleware/role');

// -----------------
// Create move request (branchAdmin)
// branchAdmin สามารถสร้างคำขอได้ แต่ต้องเป็นผู้ใช้ในสาขาของตัวเอง
// -----------------
router.post('/moveRequest', auth, role(['branchAdmin']), async (req, res) => {
  try {
    console.log('[branchAdmin] create moveRequest - user:', req.user && req.user.username);
    const { subjectUserId, toBranch, reason, metadata } = req.body;
    if (!subjectUserId || !toBranch) return res.status(422).json({ error: 'subjectUserId and toBranch required' });

    const subjectUser = await User.findById(subjectUserId);
    if (!subjectUser) return res.status(404).json({ error: 'Subject user not found' });

    // ตรวจสาขา — ให้รองรับ ObjectId <-> string
    const requesterBranch = req.user.branchId ? req.user.branchId.toString() : null;
    const subjectBranch = subjectUser.branchId ? subjectUser.branchId.toString() : null;
    if (!requesterBranch || requesterBranch !== subjectBranch) {
      return res.status(403).json({ error: 'You can only request moves for users in your branch' });
    }

    const mv = new MoveRequest({
      requesterId: req.user._id,
      subjectUserId,
      fromBranch: subjectUser.branchId,
      toBranch,
      reason,
      metadata,
      status: 'pending',
    });

    await mv.save();
    return res.status(201).json({ message: 'Move request created', moveRequest: mv });
  } catch (err) {
    console.error('create moveRequest err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// -----------------
// List move requests (branchAdmin OR superAdmin)
// branchAdmin: เห็นคำขอของสาขา/ที่ตัวเองเป็น requester
// superAdmin: เห็นทั้งหมด
// -----------------
router.get('/moveRequests', auth, role(['branchAdmin', 'superAdmin']), async (req, res) => {
  try {
    const user = req.user;
    let filter = {};
    if (user.role && user.role.toString().toLowerCase() === 'branchadmin') {
      // คืนคำขอที่ requester เป็น user นี้ หรือคำขอจากสาขาของ user นี้
      filter = { $or: [{ requesterId: user._id }, { fromBranch: user.branchId }] };
    }
    const requests = await MoveRequest.find(filter)
      .populate('requesterId subjectUserId fromBranch toBranch')
      .sort({ createdAt: -1 });
    return res.json({ moveRequests: requests });
  } catch (err) {
    console.error('list moveRequests err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// -----------------
// Approve (superAdmin)
// -----------------
router.put('/moveRequest/approve/:id', auth, role(['superAdmin']), async (req, res) => {
  try {
    const mv = await MoveRequest.findById(req.params.id);
    if (!mv) return res.status(404).json({ error: 'Move request not found' });
    if (mv.status !== 'pending') return res.status(400).json({ error: 'Move request already processed' });

    // ย้าย user
    const updatedUser = await User.findByIdAndUpdate(mv.subjectUserId, { branchId: mv.toBranch }, { new: true });
    if (!updatedUser) return res.status(404).json({ error: 'Subject user not found for update' });

    mv.status = 'approved';
    mv.processedBy = req.user._id;
    mv.processedAt = new Date();
    await mv.save();

    // (option) emit notification via req.io ifต้องการ
    try {
      if (req.io) req.io.emit('moveRequestApproved', { moveRequestId: mv._id, userId: mv.subjectUserId });
    } catch (e) { /* ignore socket errors */ }

    return res.json({ message: 'Move request approved and user moved', moveRequest: mv, updatedUser });
  } catch (err) {
    console.error('approve err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// -----------------
// Reject (superAdmin)
// -----------------
router.put('/moveRequest/reject/:id', auth, role(['superAdmin']), async (req, res) => {
  try {
    const mv = await MoveRequest.findById(req.params.id);
    if (!mv) return res.status(404).json({ error: 'Move request not found' });
    if (mv.status !== 'pending') return res.status(400).json({ error: 'Move request already processed' });

    mv.status = 'rejected';
    mv.processedBy = req.user._id;
    mv.processedAt = new Date();
    mv.metadata = { ...(mv.metadata || {}), rejectionReason: req.body.reason || 'No reason provided' };
    await mv.save();

    try {
      if (req.io) req.io.emit('moveRequestRejected', { moveRequestId: mv._id, userId: mv.subjectUserId });
    } catch (e) {}

    return res.json({ message: 'Move request rejected', moveRequest: mv });
  } catch (err) {
    console.error('reject err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// -----------------
// Direct move user (superAdmin)
// -----------------
router.put('/moveUser/:userId', auth, role(['superAdmin']), async (req, res) => {
  try {
    const { targetBranch } = req.body;
    if (!targetBranch) return res.status(422).json({ error: 'targetBranch required' });

    const updated = await User.findByIdAndUpdate(req.params.userId, { branchId: targetBranch }, { new: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });

    try {
      if (req.io) req.io.emit('userMoved', { userId: updated._id, newBranch: targetBranch });
    } catch (e) {}

    return res.json({ message: 'User moved successfully', updated });
  } catch (err) {
    console.error('moveUser err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ✅ branchAdmin ดูรายชื่อ user ในสาขาตัวเอง
router.get('/users', auth, role(['branchAdmin', 'superAdmin']), async (req, res) => {
  try {
    const filter = req.user.role === 'superAdmin'
      ? {} // superAdmin เห็นทั้งหมด
      : { branchId: req.user.branchId }; // branchAdmin เห็นเฉพาะสาขาตัวเอง

    const users = await User.find(filter).select('-password'); // ไม่ส่ง password กลับ
    res.json({ users });
  } catch (err) {
    console.error('list users error:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
