const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

//Nori
const auth = require('../middleware/auth');
const controller = require('../controllers/notificationController');
router.get('/', auth, controller.getNotifications);
router.put('/:id/read', auth, controller.markRead);

// === CREATE ===
router.post('/', async (req, res) => {
  try {
    const item = await Notification.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// // === CREATE ===
// router.post('/', async (req, res) => {
//   try {
//     const item = await Notification.create(req.body);
//     res.status(201).json(item);
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });

// === READ ALL ===
router.get('/', async (req, res) => {
  try {
    const items = await Notification.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === READ ONE ===
router.get('/:id', async (req, res) => {
  try {
    const item = await Notification.findById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === UPDATE ===
router.put('/:id', async (req, res) => {
  try {
    const item = await Notification.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// === DELETE ===
router.delete('/:id', async (req, res) => {
  try {
    const item = await Notification.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
