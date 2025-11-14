// cron/checkAlerts.js
const Medicine = require('../models/Medicine');
const Vaccination = require('../models/Vaccination');
const { sendNotification } = require('../utils/notify');

async function checkLowStock() {
  const meds = await Medicine.find({ quantity: { $lt: 10 } }); // สมมุติ <10 ถือว่าต่ำ
  for (const med of meds) {
    await sendNotification(med.branchId, `ยา ${med.name} เหลือน้อยกว่า 10 หน่วย`, 'stock');
    await Medicine.findByIdAndUpdate(med._id, { lowStockAlert: true });
  }
}

async function checkUpcomingVaccines() {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const upcoming = await Vaccination.find({
    nextDueDate: { $gte: today, $lte: nextWeek },
  }).populate('petId staffId');

  for (const v of upcoming) {
    await sendNotification(v.petId.ownerId, `นัดฉีดวัคซีนของ ${v.petId.name} ภายใน 7 วัน`, 'vaccine');
  }
}

module.exports = { checkLowStock, checkUpcomingVaccines };
