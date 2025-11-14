const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

//Nori
const controller = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// === CREATE ===
// ✅ superAdmin + branchAdmin + staff สามารถสร้าง medicine ได้
router.post('/', auth, role(['superAdmin', 'branchAdmin', 'staff']), async (req, res) => {
  try {
    // ✅ ประกาศตัวแปร data ก่อน
    const data = { ...req.body };

    // ถ้า user มี branchId ให้ใส่อัตโนมัติ
    if (req.user.branchId) data.branchId = req.user.branchId;

    const item = await Medicine.create(data);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// === READ ALL ===
// ✅ superAdmin + branchAdmin + staff เท่านั้น
router.get('/', auth, role(['superAdmin', 'branchAdmin', 'staff']), async (req, res) => {
  try {
    const items = await Medicine.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
// ✅ superAdmin + branchAdmin + staff เท่านั้น
router.get('/:id', auth, role(['superAdmin', 'branchAdmin', 'staff']), async (req, res) => {
  try {
    const item = await Medicine.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE (with stock alert) ===
// 🔒 ใช้ role เดิม branchAdmin (ถ้าอยากแก้ก็ปรับตามต้องการ)
router.put('/:id', auth, role(['superAdmin', 'branchAdmin']), controller.updateMedicine);

// === DELETE ===
// 🔒 ใช้ role เดิม branchAdmin (ถ้าอยากแก้ก็ปรับตามต้องการ)
router.delete('/:id', auth, role(['superAdmin', 'branchAdmin']), async (req, res) => {
  try {
    const item = await Medicine.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
