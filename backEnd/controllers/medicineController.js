const Medicine = require('../models/Medicine');
const Notification = require('../models/Notification');
const User = require('../models/User');

module.exports.updateMedicine = async (req, res) => {
  try {
    const updated = await Medicine.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: 'Not found' });

    // แจ้งเตือนถ้าใกล้หมด
    if (updated.quantity <= 5) {
      const branchAdmin = await User.findOne({
        branchId: updated.branchId,
        role: 'branchAdmin'
      });

      if (branchAdmin) {
        await Notification.create({
          userId: branchAdmin._id,
          message: `ยาเกือบหมด: ${updated.name}`,
          type: 'stock'
        });
      }

      req.io.emit('notification', {
        message: `⚠️ ยาใกล้หมด: ${updated.name}`,
        type: 'stock'
      });
    }

    res.json(updated);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
