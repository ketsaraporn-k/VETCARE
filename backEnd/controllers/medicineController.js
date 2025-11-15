// backEnd/controllers/medicineController.js
const mongoose = require('mongoose');
const Branch = require('../models/Branch');
const User = require('../models/User');
const { createNotification } = require('../utils/notify');

module.exports.updateMedicine = async (req, res) => {
  try {
    const { branchId, medId } = req.params; // expect route: /branches/:branchId/medicines/:medId
    const { change, setQuantity, reorderQty } = req.body;

    if (!mongoose.Types.ObjectId.isValid(branchId) || !mongoose.Types.ObjectId.isValid(medId)) {
      return res.status(400).json({ message: 'Invalid id(s)' });
    }

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ message: 'Branch not found' });

    const medicine = branch.medicines.id(medId);
    if (!medicine) return res.status(404).json({ message: 'Medicine not found in branch' });

    // 1) ปรับจำนวน
    if (typeof change === 'number') {
      medicine.stock = (medicine.stock || 0) + change;
    }
    if (typeof setQuantity === 'number') {
      medicine.stock = setQuantity;
    }
    if (typeof reorderQty === 'number') {
      medicine.lowStockThreshold = reorderQty;
    }

    // 2) ตรวจ low stock
    const threshold = (typeof medicine.lowStockThreshold === 'number') ? medicine.lowStockThreshold : 5;

    if ((medicine.stock || 0) <= threshold) {
      if (!medicine.lowStockAlert) {
        medicine.lowStockAlert = true;
        // notify branchAdmin(s)
        try {
          const branchAdmins = await User.find({ branchId: branch._id, role: 'branchAdmin' }).select('_id username name').lean();
          const recipients = (branchAdmins && branchAdmins.length) ? branchAdmins.map(b => b._id) : [req.user && (req.user.id || req.user._id)];

          await createNotification(recipients, {
            type: 'stock',
            message: `ยาใกล้หมด: ${medicine.medicineName} ที่ ${branch.branchName} (เหลือ ${medicine.stock})`,
            data: { branchId: branch._id.toString(), medId: medicine._id.toString() }
          });
        } catch (e) {
          console.warn('notif create failed', e);
        }
      }
    } else {
      // ถ้าเติมแล้ว ให้ปิด flag
      if (medicine.lowStockAlert) medicine.lowStockAlert = false;
    }

    medicine.updatedAtMedicine = new Date();
    await branch.save();

    // return the updated subdoc (convert to plain object)
    const updatedMed = branch.medicines.id(medId).toObject();
    return res.json(updatedMed);
  } catch (err) {
    console.error('updateMedicine error:', err);
    return res.status(500).json({ error: err.message });
  }
};
