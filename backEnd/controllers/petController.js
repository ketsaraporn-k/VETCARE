const Pet = require('../models/Pet');

exports.createPet = async (req, res) => {
  try {
    const pet = new Pet(req.body);
    await pet.save();
    res.json(pet);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getPetsByBranch = async (req, res) => {
  try {
    const pets = await Pet.find({ branchId: req.params.branchId })
      .populate('ownerId')
      .populate('branchId');
    res.json(pets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
