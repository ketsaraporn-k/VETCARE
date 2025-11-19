// backEnd/routes/medicineRoutes.js
const express = require('express');
const router = express.Router();
const Branch = require('../models/Branch');     // <- ../
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const controller = require('../controllers/medicineController');

// CREATE medicine (สร้าง medicine ใน branch ของผู้ใช้ ถ้า req.user.branchId มี)
router.post('/', auth, role(['superAdmin', 'branchAdmin', 'doctor']), async (req, res) => {
  try {
    const data = { ...req.body };
    const branchId = req.user.branchId || data.branchId;
    if (!branchId) return res.status(422).json({ error: 'branchId required (or user must have branchId)' });

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const newMed = {
      medicineName: data.medicineName,
      stock: data.stock || 0,
      unit: data.unit || 'pcs',
      lowStockThreshold: data.lowStockThreshold || 5,
      manufacturer: data.manufacturer || null,
      category: data.category || null,
      batches: data.batches || []
    };
    branch.medicines.push(newMed);
    await branch.save();
    const created = branch.medicines[branch.medicines.length - 1];
    return res.status(201).json(created);
  } catch (err) {
    console.error('create medicine err', err);
    return res.status(400).json({ error: err.message });
  }
});

// READ all medicines (optionally filter by branch)
// READ all medicines (optionally filter by branch)
router.get('/', auth, role(['superAdmin', 'branchAdmin', 'staff', 'doctor']), async (req, res) => {
  try {
    if (req.user.role && req.user.role.toLowerCase() === 'superadmin') {
      const branches = await Branch.find().select('branchName medicines');
      return res.json(branches);
    }
    // non-super -> return only user's branch medicines
    const branch = await Branch.findById(req.user.branchId).select('branchName medicines');
    return res.json(branch ? [branch] : []);
  } catch (err) {
    console.error('list medicines err', err);
    return res.status(500).json({ error: err.message });
  }
});

// READ one medicine by branchId + medId
router.get('/:branchId/:medId', auth, role(['superAdmin', 'branchAdmin', 'staff', 'doctor']), async (req, res) => {
  try {
    const { branchId, medId } = req.params;
    // if non-super, ensure branchId matches user's branch
    if ((req.user.role || '').toLowerCase() !== 'superadmin' && String(req.user.branchId) !== String(branchId)) {
      return res.status(403).json({ error: 'Permission denied' });
    }
    const branch = await Branch.findById(branchId).select('branchName medicines');
    if (!branch) return res.status(404).json({ error: 'Branch not found' });
    const medicine = branch.medicines.id(medId);
    if (!medicine) return res.status(404).json({ error: 'Medicine not found' });
    return res.json({ branch: { _id: branch._id, branchName: branch.branchName }, medicine });
  } catch (err) {
    console.error('get medicine err', err);
    return res.status(500).json({ error: err.message });
  }
});

// UPDATE medicine (including updating stock or lowStockAlert)
router.put('/:branchId/:medId', auth, role(['superAdmin', 'branchAdmin', 'doctor']), controller.updateMedicine)

// DELETE medicine
router.delete('/:branchId/:medId', auth, role(['superAdmin', 'branchAdmin', 'doctor']), async (req, res) => {
  try {
    const { branchId, medId } = req.params;

    // permission: superAdmin หรือ branchAdmin/doctor ของสาขานั้น
    const userRole = (req.user?.role || '').toString().toLowerCase();
    if (userRole !== 'superadmin') {
      const userBranch = String(req.user.branchId || req.user.branch || '');
      if (!userBranch || String(userBranch) !== String(branchId)) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    // atomic remove using $pull so we don't rely on subdoc methods
    const result = await Branch.updateOne(
      { _id: branchId },
      { $pull: { medicines: { _id: medId } } }
    );

    // handle different mongoose versions (modifiedCount/matchedCount or nModified/n)
    const matched = (result.matchedCount !== undefined) ? result.matchedCount : result.n;
    const modified = (result.modifiedCount !== undefined) ? result.modifiedCount : result.nModified;

    if (!matched) {
      return res.status(404).json({ error: 'Branch not found' });
    }
    if (!modified) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    return res.json({ message: 'Deleted successfully' });
  } catch (err) {
    console.error('delete medicine err', err);
    return res.status(500).json({ error: 'Server error' });
  }
});


module.exports = router;
