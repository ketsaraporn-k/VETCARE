//statistics.js
const express = require('express');
const router = express.Router();
const Pet = require('../models/Pet');
const Vaccination = require('../models/Vaccination');
const Treatment = require('../models/Treatment');
const Medicine = require('../models/Medicine');
const auth = require('../middleware/auth');
const role = require('../middleware/role');

// ✅ สถิติทุกสาขา (SuperAdmin)
router.get('/all', auth, role(['superAdmin']), async (req, res) => {
  const petCount = await Pet.countDocuments();
  const vaccineCount = await Vaccination.countDocuments();
  const treatmentCount = await Treatment.countDocuments();
  const medicines = await Medicine.find();

  const totalStock = medicines.reduce((sum, m) => sum + m.quantity, 0);

  res.json({ petCount, vaccineCount, treatmentCount, totalStock });
});

// ✅ สถิติเฉพาะสาขาผู้ใช้ (Admin)
router.get('/branch/:branchId', auth, role(['branchAdmin']), async (req, res) => {
  const branchId = req.params.branchId;

  const petCount = await Pet.countDocuments({ branchId });
  const vaccineCount = await Vaccination.countDocuments({ branchId });
  const treatmentCount = await Treatment.countDocuments({ branchId });
  const medicines = await Medicine.find({ branchId });

  const totalStock = medicines.reduce((sum, m) => sum + m.quantity, 0);

  res.json({ petCount, vaccineCount, treatmentCount, totalStock });
});

module.exports = router;
