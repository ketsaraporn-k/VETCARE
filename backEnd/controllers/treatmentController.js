// backEnd/controllers/treatmentController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Branch = require('../models/Branch');
const { createNotification } = require('../utils/notify');

exports.addTreatment = async (req, res) => {
  try {
    const { userId, petId } = req.params; // route: POST /users/:userId/pets/:petId/treatments
    const { branchId, medicineId, medicineNameSnapshot, quantityUsed = 1, symptoms, diagnosis, staffId, attachments } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ error: 'Invalid userId or petId' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const pet = user.pets.id(petId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    // allergy check
    if (medicineNameSnapshot) {
      const allergyCheck = user.hasPetAllergy(petId, medicineNameSnapshot);
      if (allergyCheck.matched) {
        return res.status(400).json({ error: 'Pet has allergy', entries: allergyCheck.entries });
      }
    }

    // reduce stock in branch.medicines
    if (branchId && mongoose.Types.ObjectId.isValid(branchId) && medicineId && mongoose.Types.ObjectId.isValid(medicineId)) {
      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: 'Branch not found' });
      const med = branch.medicines.id(medicineId);
      if (!med) return res.status(404).json({ error: 'Medicine not found in branch' });

      med.stock = Math.max(0, (med.stock || 0) - quantityUsed);

      // optionally set lowStockAlert and notify branch admins
      if ((med.stock || 0) <= (med.lowStockThreshold ?? 5) && !med.lowStockAlert) {
        med.lowStockAlert = true;
        try {
          const branchAdmins = await User.find({ branchId: branch._id, role: 'branchAdmin' }).select('_id username name').lean();
          const recipients = (branchAdmins && branchAdmins.length) ? branchAdmins.map(b => b._id) : [req.user && (req.user.id || req.user._id)];

          await createNotification(recipients, {
            type: 'stock',
            message: `ยาใกล้หมด: ${med.medicineName} ที่ ${branch.branchName} (เหลือ ${med.stock})`,
            data: { branchId: branch._id.toString(), medId: med._id.toString() }
          });
        } catch (e) {
          console.warn('notif fail', e);
        }
      }
      await branch.save();
    }

    // push treatment to pet
    const treat = {
      symptoms: symptoms || null,
      diagnosis: diagnosis || null,
      notes: req.body.notes || null,
      branchId: branchId || null,
      medicineId: medicineId || null,
      medicineNameSnapshot: medicineNameSnapshot || null,
      quantityUsed,
      treatmentDate: new Date(),
      staffId: staffId || req.user?.id || null,
      attachments: Array.isArray(attachments) ? attachments : []
    };

    pet.treatments.push(treat);
    await user.save();

    const newTreatment = pet.treatments[pet.treatments.length - 1];
    return res.status(201).json(newTreatment);
  } catch (err) {
    console.error('addTreatment err', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) return res.status(422).json({ error: 'branchId required' });

    // aggregate: find users whose pets contain treatments with branchId
    const users = await User.find({ 'pets.treatments.branchId': branchId }).select('username name pets').lean();
    const results = [];
    users.forEach(u => {
      (u.pets || []).forEach(p => {
        (p.treatments || []).forEach(t => {
          if (String(t.branchId) === String(branchId)) {
            results.push({
              treatment: t,
              pet: { id: p._id, name: p.name },
              owner: { id: u._id, username: u.username, name: u.name }
            });
          }
        });
      });
    });

    return res.json(results);
  } catch (err) {
    console.error('get treatments by branch err', err);
    return res.status(500).json({ error: err.message });
  }
};
