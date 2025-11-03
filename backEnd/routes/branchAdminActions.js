// backEnd/routes/noriApi/branchAdminActions.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const MoveRequest = require('../models/MoveRequest');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

/**
 * Helper: populate history.by -> { _id, username, name }
 * Accepts an array of moveRequests (Mongoose docs) and mutates them in-place.
 */
async function populateHistoryUsers(moveRequests) {
  if (!Array.isArray(moveRequests)) return moveRequests;
  const ids = new Set();
  moveRequests.forEach(r => {
    if (!r.history) return;
    r.history.forEach(h => { if (h && h.by) ids.add(String(h.by)); });
  });
  if (ids.size === 0) return moveRequests;

  const users = await User.find({ _id: { $in: Array.from(ids) } }).select('username name');
  const userMap = {};
  users.forEach(u => { userMap[String(u._id)] = { _id: u._id, username: u.username, name: u.name }; });

  moveRequests.forEach(r => {
    if (!r.history) return;
    r.history = r.history.map(h => {
      const newH = h._doc ? { ...h._doc } : { ...h };
      if (newH.by) {
        const found = userMap[String(newH.by)];
        if (found) newH.by = found;
      }
      return newH;
    });
  });

  return moveRequests;
}

/*
  Branch admin actions:
  - POST   /moveRequest
  - GET    /moveRequests
  - GET    /moveRequests/history
  - PUT    /moveRequest/approve/:id
  - PUT    /moveRequest/reject/:id
  - PUT    /moveRequest/cancel/:id
  - PUT    /moveUser/:userId
  - GET    /users
*/

// ----------------- Create (branchAdmin) -----------------
router.post('/moveRequest', auth, role(['branchAdmin']), async (req, res) => {
  try {
    const { subjectUserId, toBranch, reason, metadata } = req.body;
    if (!subjectUserId || !toBranch) return res.status(422).json({ error: 'subjectUserId and toBranch required' });

    const subjectUser = await User.findById(subjectUserId);
    if (!subjectUser) return res.status(404).json({ error: 'Subject user not found' });

    const requesterBranch = req.user.branchId ? String(req.user.branchId) : null;
    const subjectBranch = subjectUser.branchId ? String(subjectUser.branchId) : null;
    if (!requesterBranch || requesterBranch !== subjectBranch) {
      return res.status(403).json({ error: 'You can only request moves for users in your branch' });
    }

    // Prevent duplicate pending by same requester + same subject
    const existing = await MoveRequest.findOne({
      subjectUserId: subjectUserId,
      requesterId: req.user._id,
      status: 'pending'
    });
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending move request for this user' });
    }

    const mv = new MoveRequest({
      requesterId: req.user._id,
      subjectUserId,
      fromBranch: subjectUser.branchId,
      toBranch,
      reason,
      metadata,
      status: 'pending',
      history: [{
        action: 'created',
        by: req.user._id,
        at: new Date(),
        reason: reason || null,
        note: `from:${subjectUser.branchId} to:${toBranch}`
      }]
    });

    await mv.save();
    const populated = await MoveRequest.findById(mv._id).populate('requesterId subjectUserId fromBranch toBranch');
    await populateHistoryUsers([populated]);

    try { if (req.io) req.io.emit('moveRequestCreated', { moveRequest: populated }); } catch(e){}

    return res.status(201).json({ message: 'Move request created', moveRequest: populated });
  } catch (err) {
    console.error('create moveRequest err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- List (branchAdmin|superAdmin) -----------------
router.get('/moveRequests', auth, role(['branchAdmin', 'superAdmin']), async (req, res) => {
  try {
    const user = req.user;
    let filter = {};
    if (user.role && user.role.toString().toLowerCase() === 'branchadmin') {
      filter = { $or: [{ requesterId: user._id }, { fromBranch: user.branchId }] };
    }
    const requests = await MoveRequest.find(filter).populate('requesterId subjectUserId fromBranch toBranch').sort({ createdAt: -1 });
    await populateHistoryUsers(requests);
    return res.json({ moveRequests: requests });
  } catch (err) {
    console.error('list moveRequests err:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- History for current user (or all for superAdmin) -----------------
router.get('/moveRequests/history', auth, role(['branchAdmin', 'superAdmin']), async (req, res) => {
  try {
    const isSuper = (req.user.role || '').toString().toLowerCase() === 'superadmin';
    const userId = req.user._id;
    let filter = {};
    if (!isSuper) {
      filter = { $or: [{ requesterId: userId }, { subjectUserId: userId }] };
    }
    const requests = await MoveRequest.find(filter).populate('requesterId subjectUserId fromBranch toBranch').sort({ createdAt: -1 });
    await populateHistoryUsers(requests);
    return res.json({ moveRequests: requests });
  } catch (err) {
    console.error('history err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- Approve (superAdmin) -----------------
router.put('/moveRequest/approve/:id', auth, role(['superAdmin']), async (req, res) => {
  try {
    const mv = await MoveRequest.findById(req.params.id);
    if (!mv) return res.status(404).json({ error: 'Move request not found' });
    if (mv.status !== 'pending') return res.status(400).json({ error: 'Move request already processed' });

    const updatedUser = await User.findByIdAndUpdate(mv.subjectUserId, { branchId: mv.toBranch }, { new: true });
    if (!updatedUser) return res.status(404).json({ error: 'Subject user not found for update' });

    mv.status = 'approved';
    mv.processedBy = req.user._id;
    mv.processedAt = new Date();
    mv.history = mv.history || [];
    mv.history.push({ action: 'approved', by: req.user._id, at: mv.processedAt, reason: null, note: `moved to:${mv.toBranch}` });

    await mv.save();
    const populated = await MoveRequest.findById(mv._id).populate('requesterId subjectUserId fromBranch toBranch');
    await populateHistoryUsers([populated]);

    try { if (req.io) req.io.emit('moveRequestApproved', { moveRequest: populated, updatedUser }); } catch(e){}

    return res.json({ message: 'Move request approved and user moved', moveRequest: populated, updatedUser });
  } catch (err) {
    console.error('approve err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- Reject (superAdmin) -----------------
router.put('/moveRequest/reject/:id', auth, role(['superAdmin']), async (req, res) => {
  try {
    const mv = await MoveRequest.findById(req.params.id);
    if (!mv) return res.status(404).json({ error: 'Move request not found' });
    if (mv.status !== 'pending') return res.status(400).json({ error: 'Move request already processed' });

    mv.status = 'rejected';
    mv.processedBy = req.user._id;
    mv.processedAt = new Date();
    mv.metadata = { ...(mv.metadata || {}), rejectionReason: req.body.reason || 'No reason provided' };
    mv.history = mv.history || [];
    mv.history.push({ action: 'rejected', by: req.user._id, at: mv.processedAt, reason: req.body.reason || null, note: null });

    await mv.save();
    const populated = await MoveRequest.findById(mv._id).populate('requesterId subjectUserId fromBranch toBranch');
    await populateHistoryUsers([populated]);

    try { if (req.io) req.io.emit('moveRequestRejected', { moveRequest: populated }); } catch(e){}

    return res.json({ message: 'Move request rejected', moveRequest: populated });
  } catch (err) {
    console.error('reject err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- Cancel (soft) (branchAdmin requester OR superAdmin) -----------------
router.put('/moveRequest/cancel/:id', auth, role(['branchAdmin', 'superAdmin']), async (req, res) => {
  try {
    const mv = await MoveRequest.findById(req.params.id);
    if (!mv) return res.status(404).json({ error: 'Move request not found' });

    const userRole = (req.user.role || '').toString().toLowerCase();
    const isSuper = userRole === 'superadmin';
    const isRequester = mv.requesterId && String(mv.requesterId) === String(req.user._id);

    if (!isSuper) {
      if (!isRequester) return res.status(403).json({ error: 'Permission denied — only requester can cancel' });
      if (mv.status !== 'pending') return res.status(400).json({ error: 'Only pending requests can be cancelled' });
    }

    mv.status = 'cancelled';
    mv.processedBy = req.user._id;
    mv.processedAt = new Date();
    mv.metadata = { ...(mv.metadata || {}), cancelledBy: req.user._id, cancelledAt: mv.processedAt, cancelledReason: req.body?.reason || null };
    mv.history = mv.history || [];
    mv.history.push({
      action: 'cancelled',
      by: req.user._id,
      at: mv.processedAt,
      reason: req.body?.reason || null,
      note: isSuper ? 'cancelled by superAdmin' : 'cancelled by requester'
    });

    const updated = await mv.save();
    const populated = await MoveRequest.findById(updated._id).populate('requesterId subjectUserId fromBranch toBranch');
    await populateHistoryUsers([populated]);

    try { if (req.io) req.io.emit('moveRequestCancelled', { moveRequest: populated }); } catch(e){}

    return res.json({ message: 'Move request cancelled', moveRequest: populated });
  } catch (err) {
    console.error('cancel moveRequest err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- Direct move (superAdmin) -----------------
router.put('/moveUser/:userId', auth, role(['superAdmin']), async (req, res) => {
  try {
    const { targetBranch } = req.body;
    if (!targetBranch) return res.status(422).json({ error: 'targetBranch required' });

    const updated = await User.findByIdAndUpdate(req.params.userId, { branchId: targetBranch }, { new: true });
    if (!updated) return res.status(404).json({ error: 'User not found' });

    // Optionally update pending MoveRequests for this user
    try {
      const now = new Date();
      await MoveRequest.updateMany(
        { subjectUserId: req.params.userId, status: 'pending' },
        {
          $set: { status: 'approved', processedBy: req.user._id, processedAt: now },
          $push: { history: { action: 'approved', by: req.user._id, at: now, reason: 'direct move by superAdmin', note: `moved to:${targetBranch}` } }
        }
      );
    } catch (e) {
      console.warn('Warning: failed to update pending requests after direct move', e);
    }

    try { if (req.io) req.io.emit('userMoved', { userId: updated._id, newBranch: targetBranch }); } catch(e){}

    return res.json({ message: 'User moved successfully', updated });
  } catch (err) {
    console.error('moveUser err', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
});

// ----------------- List users (branchAdmin|superAdmin) -----------------
router.get('/users', auth, role(['branchAdmin', 'superAdmin']), async (req, res) => {
  try {
    const isSuper = (req.user.role || '').toString().toLowerCase() === 'superadmin';
    const filter = isSuper ? {} : { branchId: req.user.branchId };
    const users = await User.find(filter).select('-password');
    res.json({ users });
  } catch (err) {
    console.error('list users error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
