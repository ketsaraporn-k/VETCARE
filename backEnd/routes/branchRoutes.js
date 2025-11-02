const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');

const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');

// === CREATE ===
// ✅ เฉพาะ superAdmin ถึงจะสร้างสาขาได้
router.post('/', auth, checkRole(['superAdmin']), async (req, res) => {
  try {
    const item = await Branch.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === READ ALL ===
// ✅ superAdmin, branchAdmin ดูได้
router.get('/', auth, checkRole(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const items = await Branch.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
// ✅ superAdmin, branchAdmin
router.get('/:id', auth, checkRole(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const item = await Branch.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE ===
// ✅ เฉพาะ superAdmin แก้ไขได้
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
// ✅ superAdmin อย่างเดียวลบได้
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
