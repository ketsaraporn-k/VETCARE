const Vaccination = require('../models/Vaccination');
const Notification = require('../models/Notification');

exports.addVaccination = async (req, res) => {
  try {
    const record = new Vaccination(req.body);
    await record.save();

    if (record.nextDueDate) {
      await Notification.create({
        userId: req.body.ownerId,
        message: `Vaccination reminder for pet — due on ${record.nextDueDate}`,
        type: 'vaccine'
      });
    }

    res.json(record);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getByPet = async (req, res) => {
  try {
    const data = await Vaccination.find({ petId: req.params.id })
      .populate('petId')
      .populate('staffId')
      .populate('branchId');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
