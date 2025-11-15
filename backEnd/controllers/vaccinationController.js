// backEnd/controllers/vaccinationController.js
const mongoose = require('mongoose');
const User = require('../models/User');

exports.addVaccination = async (req, res) => {
  try {
    // Expect route: POST /users/:userId/pets/:petId/vaccinations
    const { userId, petId } = req.params;
    const { branchId, medicineId, medicineNameSnapshot, doseQty = 1, batch, expiryDate, dateGiven, nextDueDate, staffId, attachments } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId) || !mongoose.Types.ObjectId.isValid(petId)) {
      return res.status(400).json({ error: 'Invalid id(s)' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const pet = user.pets.id(petId);
    if (!pet) return res.status(404).json({ error: 'Pet not found' });

    const vac = {
      branchId: branchId || null,
      medicineId: medicineId || null,
      medicineNameSnapshot: medicineNameSnapshot || null,
      doseQty,
      batch: batch || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
      dateGiven: dateGiven ? new Date(dateGiven) : new Date(),
      nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
      staffId: staffId || req.user?.id || null,
      attachments: Array.isArray(attachments) ? attachments : []
    };

    pet.vaccinations.push(vac);
    await user.save();

    // create notification if nextDueDate provided
    if (vac.nextDueDate) {
      try {
        await User.createNotificationForUser(user._id, {
          type: 'vaccine',
          message: `นัดฉีดวัคซีนของสัตว์เลี้ยง ${pet.name} กำหนดวันที่ ${vac.nextDueDate.toISOString()}`,
          data: { petId: pet._id, nextDueDate: vac.nextDueDate },
          status: 'unread'
        });
      } catch (e) { console.warn('notif create failed', e); }
    }

    const newVac = pet.vaccinations[pet.vaccinations.length - 1];
    return res.status(201).json(newVac);
  } catch (err) {
    console.error('addVaccination err', err);
    return res.status(400).json({ error: err.message });
  }
};

exports.getByPet = async (req, res) => {
  try {
    const { id } = req.params; // pet id
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid pet id' });

    // find user that contains this pet
    const user = await User.findOne({ 'pets._id': id }).select('username name pets').lean();
    if (!user) return res.status(404).json({ error: 'Pet not found' });
    const pet = (user.pets || []).find(p => String(p._id) === String(id));
    return res.json({ pet, owner: { id: user._id, username: user.username, name: user.name } });
  } catch (err) {
    console.error('getByPet err', err);
    return res.status(500).json({ error: err.message });
  }
};

exports.getByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) return res.status(422).json({ error: 'branchId required' });

    // find users in branch and collect vaccinations with branchId
    const users = await User.find({ branchId }).select('username name pets').lean();
    const results = [];
    users.forEach(u => {
      (u.pets || []).forEach(p => {
        (p.vaccinations || []).forEach(v => {
          if (!v) return;
          if (!v.branchId || String(v.branchId) === String(branchId)) {
            results.push({ vaccination: v, pet: { id: p._id, name: p.name }, owner: { id: u._id, username: u.username, name: u.name } });
          }
        });
      });
    });

    return res.json(results);
  } catch (err) {
    console.error('getByBranch err', err);
    return res.status(500).json({ error: err.message });
  }
};
