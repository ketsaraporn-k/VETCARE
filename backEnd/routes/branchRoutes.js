// backEnd/routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Branch = require('../models/Branch');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');

// helper: validate id
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// allowed fields to create/update (sanitize)
const ALLOWED_FIELDS = ['branchName', 'addressBranch', 'phone', 'managerId', 'metadata', 'isActive'];

// === CREATE === (superAdmin only)
router.post('/', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const payload = {};
    // pick allowed fields only
    ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) payload[f] = req.body[f]; });

    // audit
    payload.createdBy = req.user._id;
    payload.updatedBy = req.user._id;

    const item = await Branch.create(payload);
    return res.status(201).json(item);
  } catch (err) {
    console.error('POST /branches err', err);
    return res.status(400).json({ error: err.message });
  }
});

// === LIST ALL (for-select) ===
router.get('/all', auth, async (req, res) => {
  try {
    const items = await Branch.find().sort({ branchName: 1 }).select('-__v');
    return res.json(items);
  } catch (err) {
    console.error('list all branches err', err);
    return res.status(500).json({ error: err.message });
  }
});

// === READ ALL ===
router.get('/', auth, checkRole(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const userRole = String(req.user.role || '').toLowerCase();

    if (userRole === 'superadmin') {
      const items = await Branch.find().sort({ branchName: 1 }).select('-__v');
      return res.json(items);
    }

    const branchId = req.user.branchId;
    if (!branchId) return res.status(403).json({ error: 'Permission denied — no branchId on user' });

    const item = await Branch.findById(branchId).select('-__v');
    return res.json(item ? [item] : []);
  } catch (err) {
    console.error('GET /branches err', err);
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
router.get('/:id', auth, checkRole(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const reqId = req.params.id;
    if (!isValidId(reqId)) return res.status(400).json({ error: 'Invalid id' });

    const userRole = String(req.user.role || '').toLowerCase();

    if (userRole === 'superadmin') {
      const item = await Branch.findById(reqId).select('-__v');
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.json(item);
    }

    // branchAdmin: only own branch
    const branchId = String(req.user.branchId || '');
    if (branchId !== String(reqId)) {
      return res.status(403).json({ error: 'Permission denied — cannot view other branches' });
    }

    const item = await Branch.findById(reqId).select('-__v');
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('GET /branches/:id err', err);
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE ===
router.put('/:id', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const reqId = req.params.id;
    if (!isValidId(reqId)) return res.status(400).json({ error: 'Invalid id' });

    const payload = {};
    ALLOWED_FIELDS.forEach(f => { if (req.body[f] !== undefined) payload[f] = req.body[f]; });
    payload.updatedBy = req.user._id;

    const item = await Branch.findByIdAndUpdate(reqId, payload, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('PUT /branches/:id err', err);
    res.status(400).json({ error: err.message });
  }
});

// === DELETE ===
router.delete('/:id', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const reqId = req.params.id;
    if (!isValidId(reqId)) return res.status(400).json({ error: 'Invalid id' });

    const item = await Branch.findByIdAndDelete(reqId);
    if (!item) return res.status(404).json({ error: 'Not found' });

    // Optional: you may want to clear branchId from users who belonged to this branch
    // await User.updateMany({ branchId: reqId }, { $set: { branchId: null, updatedBy: req.user._id } });

    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('DELETE /branches/:id err', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
