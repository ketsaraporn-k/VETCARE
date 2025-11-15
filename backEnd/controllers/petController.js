// backEnd/controllers/petController.js
const mongoose = require('mongoose');
const User = require('../models/User');

// POST /users/:userId/pets  (owner หรือ staff/doctor เพิ่ม pet ให้ owner)
// หรือถ้ต้องการ auto attach owner = req.user -> support both
exports.createPet = async (req, res) => {
  try {
    const ownerId = req.params.userId || req.body.ownerId || (req.user && req.user.id);
    if (!ownerId) return res.status(422).json({ error: 'ownerId required' });

    const user = await User.findById(ownerId);
    if (!user) return res.status(404).json({ error: 'Owner user not found' });

    const petPayload = {
      name: req.body.name,
      species: req.body.species || null,
      sex: req.body.sex || null,
      age: req.body.age || null,
      breed: req.body.breed || null,
      metadata: req.body.metadata || {}
    };

    // prefer using static helper if exists
    if (typeof User.createPetForOwner === 'function') {
      const newPet = await User.createPetForOwner(ownerId, petPayload);
      return res.status(201).json(newPet);
    }

    user.pets.push(petPayload);
    await user.save();
    const newPet = user.pets[user.pets.length - 1];
    return res.status(201).json(newPet);
  } catch (err) {
    console.error('createPet err', err);
    return res.status(400).json({ error: err.message });
  }
};

// GET /pets/by-branch/:branchId  => return pets whose owner's branchId === branchId
exports.getPetsByBranch = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) return res.status(422).json({ error: 'branchId required' });

    // find users that belong to branch and unwind pets
    const users = await User.find({ branchId }).select('username name pets').lean();
    // flatten pets with owner info
    const pets = [];
    users.forEach(u => {
      (u.pets || []).forEach(p => {
        pets.push({
          ...p,
          owner: { id: u._id, username: u.username, name: u.name }
        });
      });
    });
    return res.json(pets);
  } catch (err) {
    console.error('getPetsByBranch err', err);
    return res.status(500).json({ error: err.message });
  }
};
