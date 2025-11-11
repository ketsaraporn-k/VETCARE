// backEnd/routes/checkAlerts.js
const Branch = require('../models/Branch');
const User = require('../models/User');
const { sendNotification } = require('../utils/notify'); // สมมติว่ามี util นี้

// ตรวจหา medicines ในทุก branch ที่มี stock ต่ำกว่าค่า threshold
async function checkLowStock() {
  // เรา scan branches แล้วหา medicine ที่ lowStockAlert === false และ stock <= lowStockThreshold (หรือ stock < 10 fallback)
  const branches = await Branch.find({}).lean();
  for (const b of branches) {
    const meds = (b.medicines || []).filter(m => {
      const threshold = (typeof m.lowStockThreshold === 'number') ? m.lowStockThreshold : 10;
      return (m.stock || 0) <= threshold && !m.lowStockAlert;
    });
    for (const m of meds) {
      // sendNotification expects (userId, message, type) — ปรับตาม util ของคุณ
      try {
        // notify branch manager if exists
        if (b.managerId) await sendNotification(b.managerId, `ยา ${m.medicineName} ที่ ${b.branchName} เหลือน้อย (${m.stock})`, 'stock');
        // mark lowStockAlert
        await Branch.updateOne(
          { _id: b._id, 'medicines._id': m._id },
          { $set: { 'medicines.$.lowStockAlert': true } }
        );
      } catch (e) {
        console.warn('Failed to notify low stock', e);
      }
    }
  }
}

// ตรวจหา vaccination ที่จะถึงกำหนด (nextDueDate) จาก User.pets.vaccinations
async function checkUpcomingVaccines() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  // efficient approach: query Users who have pets with vaccinations nextDueDate in range using aggregation
  const users = await User.aggregate([
    { $unwind: '$pets' },
    { $unwind: '$pets.vaccinations' },
    {
      $match: {
        'pets.vaccinations.nextDueDate': { $gte: today, $lte: nextWeek }
      }
    },
    {
      $project: {
        _id: 1,
        username: 1,
        name: 1,
        'pets._id': 1,
        'pets.name': 1,
        'pets.vaccinations': 1
      }
    }
  ]);

  for (const u of users) {
    try {
      const pet = u.pets;
      const vacs = Array.isArray(pet.vaccinations) ? pet.vaccinations.filter(v => v.nextDueDate && new Date(v.nextDueDate) >= today && new Date(v.nextDueDate) <= nextWeek) : [];
      for (const v of vacs) {
        // send notification to owner (user._id) or pet owner field if exist
        await sendNotification(u._id, `นัดฉีดวัคซีนของ ${pet.name} ภายใน 7 วัน`, 'vaccine');
      }
    } catch (e) {
      console.warn('Failed notify upcoming vaccine', e);
    }
  }
}

module.exports = { checkLowStock, checkUpcomingVaccines };
