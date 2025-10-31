const express = require('express');
const router = express.Router();
const Pet = require('../../models/Pet');
const Vaccination = require('../../models/Vaccination');
const Treatment = require('../../models/Treatment');
const Branch = require('../../models/Branch');

// GET สรุปรายงาน
router.get('/summary', async (req, res) => {
  try {
    const totalPets = await Pet.countDocuments();
    const totalVaccinations = await Vaccination.countDocuments();
    const totalTreatments = await Treatment.countDocuments();
    const totalBranches = await Branch.countDocuments();

    // สมมติรายได้ = จำนวน Treatment * 500 (ตัวอย่าง)
    const estimatedRevenue = totalTreatments * 500;

    res.json({
      totalPets,
      totalVaccinations,
      totalTreatments,
      totalBranches,
      estimatedRevenue
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
