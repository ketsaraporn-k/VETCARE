const express = require('express');
const router = express.Router();
const Treatment = require('../models/Treatment');

//Nori
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/treatmentController');

router.post('/', auth, role(['staff', 'branchAdmin']), controller.addTreatment);
router.get('/branch/:branchId', auth, controller.getByBranch);


// // === CREATE ===
// router.post('/', async (req, res) => {
//   try {
//     const item = await Model.create(req.body);
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// === READ ALL ===
router.get('/', async (req, res) => {
  try {
    const items = await Treatment.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
router.get('/:id', async (req, res) => {
  try {
    const item = await Treatment.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE ===
router.put('/:id', async (req, res) => {
  try {
    const item = await Treatment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === DELETE ===
router.delete('/:id', async (req, res) => {
  try {
    const item = await Treatment.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
