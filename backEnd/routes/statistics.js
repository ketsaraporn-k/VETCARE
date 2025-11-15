// backEnd/routes/statistics.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/User');         // <-- ../
const Branch = require('../models/Branch');     // <-- ../
const auth = require('../middleware/auth');

const isOid = v => mongoose.isValidObjectId(String(v || ''));

/**
 * GET /api/stat/summary
 * Summary metrics: totalUsers, totalPets, totalBranches, totalTreatments (approx), unreadNotifications (for current user)
 */
router.get('/summary', auth, async (req, res) => {
  try {
    const [totalUsers, totalBranches] = await Promise.all([
      User.countDocuments({}),
      Branch.countDocuments({})
    ]);

    // total pets (aggregate)
    const petAgg = await User.aggregate([
      { $project: { petCount: { $size: { $ifNull: ['$pets', []] } } } },
      { $group: { _id: null, totalPets: { $sum: '$petCount' } } }
    ]);

    // total treatments (approx): sum sizes of pets.treatments
    const treatmentAgg = await User.aggregate([
      { $unwind: { path: '$pets', preserveNullAndEmptyArrays: true } },
      { $project: { treatmentCount: { $size: { $ifNull: ['$pets.treatments', []] } } } },
      { $group: { _id: null, totalTreatments: { $sum: '$treatmentCount' } } }
    ]);

    const totalPets = (petAgg[0] && petAgg[0].totalPets) || 0;
    const totalTreatments = (treatmentAgg[0] && treatmentAgg[0].totalTreatments) || 0;

    // unread for current user
    const me = await User.findById(req.user.id).select('unreadNotifications').lean();

    res.json({
      totalUsers,
      totalBranches,
      totalPets,
      totalTreatments,
      myUnreadNotifications: me ? (me.unreadNotifications || 0) : 0
    });
  } catch (err) {
    console.error('stat/summary err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/stat/pets-by-branch
 * returns counts of pets grouped by branchId (uses users.branchId as owner branch)
 */
router.get('/pets-by-branch', auth, async (req, res) => {
  try {
    // For each user that has branchId, sum their pets
    const agg = await User.aggregate([
      { $match: { branchId: { $ne: null } } },
      { $project: { branchId: 1, petCount: { $size: { $ifNull: ['$pets', []] } } } },
      { $group: { _id: '$branchId', totalPets: { $sum: '$petCount' } } },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      { $project: { branchId: '$_id', branchName: '$branch.branchName', totalPets: 1 } },
      { $sort: { totalPets: -1 } }
    ]);

    res.json(agg);
  } catch (err) {
    console.error('pets-by-branch err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/stat/treatments-by-branch?from=2025-01-01&to=2025-12-31
 * Count treatments grouped by branchId within date range (uses pets.treatments.treatmentDate)
 */
router.get('/treatments-by-branch', auth, async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from) : new Date(0);
    const to = req.query.to ? new Date(req.query.to) : new Date();

    const agg = await User.aggregate([
      { $unwind: { path: '$pets', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$pets.treatments', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'pets.treatments.treatmentDate': { $gte: from, $lte: to }
        }
      },
      {
        $group: {
          _id: '$pets.treatments.branchId',
          count: { $sum: 1 }
        }
      },
      { $lookup: { from: 'branches', localField: '_id', foreignField: '_id', as: 'branch' } },
      { $unwind: { path: '$branch', preserveNullAndEmptyArrays: true } },
      { $project: { branchId: '$_id', branchName: '$branch.branchName', count: 1 } },
      { $sort: { count: -1 } }
    ]);

    res.json(agg);
  } catch (err) {
    console.error('treatments-by-branch err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/stat/upcoming-vaccinations?days=7
 * List vaccinations (nextDueDate) within next X days across users/pets
 */
router.get('/upcoming-vaccinations', auth, async (req, res) => {
  try {
    const days = Math.max(1, Number(req.query.days || 7));
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + days);

    const agg = await User.aggregate([
      { $unwind: { path: '$pets', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$pets.vaccinations', preserveNullAndEmptyArrays: true } },
      {
        $match: {
          'pets.vaccinations.nextDueDate': { $gte: now, $lte: end }
        }
      },
      {
        $project: {
          ownerId: '$_id',
          ownerName: '$name',
          petId: '$pets._id',
          petName: '$pets.name',
          vaccineName: '$pets.vaccinations.medicineNameSnapshot',
          nextDueDate: '$pets.vaccinations.nextDueDate',
        }
      },
      { $sort: { nextDueDate: 1 } }
    ]);

    res.json(agg);
  } catch (err) {
    console.error('upcoming-vaccinations err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

/**
 * GET /api/stat/schedules/:branchId
 * Returns schedules for a branch (from Branch.schedules)
 */
router.get('/schedules/:branchId', auth, async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!isOid(branchId)) return res.status(400).json({ error: 'Invalid branchId' });

    const branch = await Branch.findById(branchId).select('branchName schedules').lean();
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const rows = (branch.schedules || []).slice().sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    res.json({ branchId: branch._id, branchName: branch.branchName, total: rows.length, data: rows });
  } catch (err) {
    console.error('schedules by branch err', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
});

module.exports = router;
