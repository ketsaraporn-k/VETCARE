const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');
const Medicine = require('../models/Medicine');
const Vaccination = require('../models/Vaccination');
const Pet = require('../models/Pet');

// GET ข้อมูลรวมทุกสาขา
router.get('/branches', async (req, res) => {
  try {
    const branches = await Branch.find();
    res.json(branches);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET แจ้งเตือนสต๊อกยาต่ำ
router.get('/low-stock', async (req, res) => {
  try {
    const medicines = await Medicine.find({ quantity: { $lte: 5 } }); // สมมติต่ำกว่า 5
    res.json(medicines);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET แจ้งเตือนนัดวัคซีนใกล้ถึง (7 วันข้างหน้า)
router.get('/upcoming-vaccinations', async (req, res) => {
  try {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const vaccinations = await Vaccination.find({
      nextDueDate: { $gte: today, $lte: nextWeek }
    }).populate('petId', 'name');

    const result = vaccinations.map(v => ({
      petName: v.petId.name,
      vaccineType: v.vaccineType,
      nextDueDate: v.nextDueDate
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
