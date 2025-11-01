const express = require('express');
const router = express.Router();
const Medicine = require('../models/Medicine');

//Nori
const controller = require('../controllers/medicineController');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// === CREATE ===
router.post('/', auth, role(['branchAdmin']), async (req, res) => {
  try {
    const item = await Medicine.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === READ ALL ===
router.get('/', async (req, res) => {
  try {
    const items = await Medicine.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
router.get('/:id', async (req, res) => {
  try {
    const item = await Medicine.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE (with stock alert) ===
router.put('/:id', auth, role(['branchAdmin']), controller.updateMedicine);

// === DELETE ===
router.delete('/:id', auth, role(['branchAdmin']), async (req, res) => {
  try {
    const item = await Medicine.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
