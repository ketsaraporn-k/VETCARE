// backEnd/routes/OwnerPets.js
console.log("🔥 OwnerPets.js loaded");

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/auth');

const User = require('../models/User');

/* =============================
   1) GET all pets ของ owner ที่ login
   GET /api/pets/my
============================= */
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const user = await User.findById(ownerId).lean();
    if (!user) return res.status(404).json({ error: 'Owner not found' });

    res.json(user.pets || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =============================
   2) GET pet detail by id
   GET /api/pets/:id
============================= */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const petId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ error: 'Invalid pet ID' });
    }

    // หา user ที่มี pet นี้
    const user = await User.findOne({ 'pets._id': petId }).lean();
    if (!user) return res.status(404).json({ error: 'Pet not found' });

    const pet = user.pets.find(p => p._id.toString() === petId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    return res.json({
      ...pet,
      owner: { id: user._id, name: user.name, username: user.username },
      treatments: pet.treatments || [],
      vaccinations: pet.vaccinations || [],
      drugAllergies: pet.drugAllergies || [],
      profilePicture: pet.profilePicture || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* =============================
   3) GET appointments ของ pet
   GET /api/pets/:id/appointments
============================= */
router.get('/:id/appointments', authMiddleware, async (req, res) => {
  // ยังไม่ทำจริง
  res.json([]);
});

module.exports = router;
