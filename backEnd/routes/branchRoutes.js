// backEnd/routes/branchRoutes.js
const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');

// === CREATE ===
// เฉพาะ superAdmin ถึงจะสร้างสาขาได้
router.post('/', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const item = await Branch.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === LIST ALL (for-select) ===
// คืนทุกสาขา (ใช้สำหรับ dropdown เลือก target branch ในฟอร์มย้าย)
// เข้าถึงได้โดยผู้ที่ล็อกอิน (auth). หากต้องการจำกัดเฉพาะ superAdmin ให้เพิ่ม checkRole(['superAdmin'])
router.get('/all', auth, async (req, res) => {
  try {
    const items = await Branch.find().sort({ branchName: 1 });
    return res.json(items);
  } catch (err) {
    console.error('list all branches err', err);
    return res.status(500).json({ error: err.message });
  }
});

// === READ ALL ===
// superAdmin: คืนทุกสาขา
// branchAdmin: คืนเฉพาะสาขาของตัวเอง (req.user.branchId)
// ส่งกลับเป็น array เสมอ (frontend คาด list)
router.get('/', auth, checkRole(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const userRole = String(req.user.role || '').toLowerCase();

    if (userRole === 'superadmin') {
      const items = await Branch.find().sort({ branchName: 1 });
      return res.json(items);
    }

    // branchAdmin -> return only their branch as an array
    const branchId = req.user.branchId;
    if (!branchId) return res.status(403).json({ error: 'Permission denied — no branchId on user' });

    const item = await Branch.findById(branchId);
    return res.json(item ? [item] : []);
  } catch (err) {
    console.error('GET /branches err', err);
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
// superAdmin: คืนตาม id
// branchAdmin: คืนเฉพาะเมื่อ id === req.user.branchId
router.get('/:id', auth, checkRole(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const userRole = String(req.user.role || '').toLowerCase();
    const reqId = req.params.id;

    if (userRole === 'superadmin') {
      const item = await Branch.findById(reqId);
      if (!item) return res.status(404).json({ error: 'Not found' });
      return res.json(item);
    }

    // branchAdmin
    const branchId = String(req.user.branchId || '');
    if (branchId !== String(reqId)) {
      return res.status(403).json({ error: 'Permission denied — cannot view other branches' });
    }

    const item = await Branch.findById(reqId);
    if (!item) return res.status(404).json({ error: 'Not found' });
    return res.json(item);
  } catch (err) {
    console.error('GET /branches/:id err', err);
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE ===
// เฉพาะ superAdmin แก้ไขได้
router.put('/:id', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const item = await Branch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === DELETE ===
// superAdmin อย่างเดียวลบได้
router.delete('/:id', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const item = await Branch.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
