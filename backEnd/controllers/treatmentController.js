const Treatment = require('../models/Treatment');

exports.addTreatment = async (req, res) => {
  try {
    const treatment = new Treatment(req.body);
    await treatment.save();
    res.json(treatment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getByBranch = async (req, res) => {
  try {
    const data = await Treatment.find({ branchId: req.params.branchId })
      .populate('petId')
      .populate('staffId');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
