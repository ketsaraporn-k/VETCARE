// backEnd/routes/ownerAppointments.js
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const Branch = require("../models/Branch");
const User = require("../models/User");

// GET all appointments for the owner
router.get("/", auth, async (req, res) => {
  try {
    const ownerId = req.user.id;

    const user = await User.findById(ownerId).lean();
    if (!user) return res.status(404).json({ error: "Owner not found" });

    const petIds = (user.pets || []).map(p => p._id.toString());
    if (petIds.length === 0) return res.json([]);

    const branches = await Branch.find({ "schedules.petId": { $in: petIds } })
      .select("branchName schedules")
      .lean();

    let result = [];
    branches.forEach(branch => {
      (branch.schedules || []).forEach(s => {
        if (petIds.includes(String(s.petId))) {
          result.push({
            ...s,
            branchName: branch.branchName
          });
        }
      });
    });

    result.sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    res.json(result);

  } catch (err) {
    console.error("owner get appointments error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
