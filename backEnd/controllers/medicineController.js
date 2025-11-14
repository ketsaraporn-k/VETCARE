const Medicine = require('../models/Medicine');
const Notification = require('../models/Notification');
const User = require('../models/User');

module.exports.updateMedicine = async (req, res) => {
  try {
    const { id } = req.params;
    const { change, setQuantity, reorderQty } = req.body;

    const medicine = await Medicine.findById(id);
    if (!medicine) return res.status(404).json({ message: 'Not found' });

    // 1️⃣ คำนวณจำนวนใหม่
    if (typeof change === "number") {
      medicine.quantity = (medicine.quantity ?? 0) + change;
    }
    if (typeof setQuantity === "number") {
      medicine.quantity = setQuantity;
    }
    if (typeof reorderQty === "number") {
      medicine.reorderQty = reorderQty;
    }

    // 2️⃣ ตรวจสอบสถานะ Low Stock
    const threshold = medicine.reorderQty ?? 5;

    if (medicine.quantity <= threshold) {
      medicine.lowStockAlert = true;

      // 🔔 แจ้งเตือนเมื่อยาใกล้หมด (เฉพาะตอนที่ยังไม่เคยเตือน)
      const branchAdmin = await User.findOne({
        branchId: medicine.branchId,
        role: 'branchAdmin'
      });

      if (branchAdmin) {
        await Notification.create({
          userId: branchAdmin._id,
          message: `ยาใกล้หมด: ${medicine.name} (เหลือ ${medicine.quantity})`,
          type: 'stock'
        });
        console.log(`⚠️ แจ้งเตือนยาใกล้หมด: ${medicine.name}`);
      }

    } else {
      // ✅ ถ้ามีของมากพอ → ปิด alert อัตโนมัติ
      if (medicine.lowStockAlert === true) {
        console.log(`✅ ยาเติมแล้ว: ${medicine.name}, ปิดการแจ้งเตือน`);
      }
      medicine.lowStockAlert = false;
    }

    medicine.updatedAt = new Date();
    const updated = await medicine.save();

    res.json(updated);

  } catch (err) {
    console.error("updateMedicine error:", err);
    res.status(500).json({ error: err.message });
  }
};
