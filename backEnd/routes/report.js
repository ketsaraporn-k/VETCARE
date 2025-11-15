// backEnd/routes/report.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Branch = require('../models/Branch');     // <-- ขยับขึ้นมา ../
const auth = require('../middleware/auth');

const isOid = (v) => mongoose.isValidObjectId(String(v || '').trim());


/**
 * GET /api/report/medicines
 * List all medicines across branches (with branch info)
 */
router.get('/medicines', auth, async (req, res) => {
  try {
    const limit = Math.min(1000, Number(req.query.limit || 1000));
    const meds = await Branch.aggregate([
      { $unwind: { path: '$medicines', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          branchId: '$_id',
          branchName: '$branchName',
          medicineId: '$medicines._id',
          medicineName: '$medicines.medicineName',
          stock: '$medicines.stock',
          unit: '$medicines.unit',
          lowStockThreshold: '$medicines.lowStockThreshold',
          lowStockAlert: '$medicines.lowStockAlert',
          manufacturer: '$medicines.manufacturer',
          category: '$medicines.category',
          batches: '$medicines.batches',
          updatedAtMedicine: '$medicines.updatedAtMedicine',
          createdAtMedicine: '$medicines.createdAtMedicine',
        }
      },
      { $sort: { medicineName: 1 } },
      { $limit: limit }
    ]).exec();

    res.json(meds);
  } catch (err) {
    console.error('GET /report/medicines err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/report/medicines/low
 * List medicines considered low stock (stock <= threshold OR lowStockAlert true)
 */
router.get('/medicines/low', auth, async (req, res) => {
  try {
    const meds = await Branch.aggregate([
      { $unwind: { path: '$medicines', preserveNullAndEmptyArrays: false } },
      {
        $addFields: {
          'medicines._branchId': '$_id',
          'medicines._branchName': '$branchName'
        }
      },
      {
        $replaceRoot: { newRoot: { $mergeObjects: ['$medicines', { branchId: '$_id', branchName: '$branchName' }] } }
      },
      {
        $match: {
          $expr: {
            $or: [
              { $lte: ['$stock', { $ifNull: ['$lowStockThreshold', 5] }] },
              { $eq: ['$lowStockAlert', true] }
            ]
          }
        }
      },
      {
        $project: {
          medicineId: '$_id',
          medicineName: '$medicineName',
          stock: 1,
          unit: 1,
          lowStockThreshold: 1,
          lowStockAlert: 1,
          branchId: 1,
          branchName: 1,
          batches: 1
        }
      },
      { $sort: { stock: 1, medicineName: 1 } }
    ]).exec();

    res.json(meds);
  } catch (err) {
    console.error('GET /report/medicines/low err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/report/branches/:branchId/medicines
 * List medicines in a single branch
 */
router.get('/branches/:branchId/medicines', auth, async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!isOid(branchId)) return res.status(400).json({ error: 'Invalid branchId' });

    const branch = await Branch.findById(branchId).select('branchName medicines').lean();
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    // return medicines array with some branch info
    const meds = (branch.medicines || []).map(m => ({
      branchId: branch._id,
      branchName: branch.branchName,
      medicineId: m._id,
      medicineName: m.medicineName,
      stock: m.stock,
      unit: m.unit,
      lowStockThreshold: m.lowStockThreshold,
      lowStockAlert: m.lowStockAlert,
      batches: m.batches
    }));

    res.json(meds);
  } catch (err) {
    console.error('GET /report/branches/:branchId/medicines err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/report/medicines/:medId
 * Find a medicine subdoc by its _id and return it with branch info
 */
router.get('/medicines/:medId', auth, async (req, res) => {
  try {
    const { medId } = req.params;
    if (!isOid(medId)) return res.status(400).json({ error: 'Invalid medId' });

    // find branch containing the medicine subdoc
    const branch = await Branch.findOne({ 'medicines._id': medId }).select('branchName medicines').lean();
    if (!branch) return res.status(404).json({ error: 'Medicine not found' });

    const med = (branch.medicines || []).find(m => String(m._id) === String(medId));
    if (!med) return res.status(404).json({ error: 'Medicine not found' });

    res.json({
      branchId: branch._id,
      branchName: branch.branchName,
      medicineId: med._id,
      medicineName: med.medicineName,
      stock: med.stock,
      unit: med.unit,
      lowStockThreshold: med.lowStockThreshold,
      lowStockAlert: med.lowStockAlert,
      batches: med.batches
    });
  } catch (err) {
    console.error('GET /report/medicines/:medId err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
