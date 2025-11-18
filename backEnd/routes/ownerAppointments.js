// backEnd/routes/ownerAppointments.js
const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Branch = require("../models/Branch");
const User = require("../models/User");

// GET /api/owner/appointments
// ดึงนัดทั้งหมดของ owner ที่ล็อกอินอยู่
router.get("/", auth, async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;

    // 1) หา owner + pets
    const user = await User.findById(ownerId).select("pets").lean();
    if (!user) {
      return res.status(404).json({ error: "Owner not found" });
    }

    const pets = user.pets || [];
    if (pets.length === 0) {
      return res.json([]); // ยังไม่มีสัตว์เลี้ยง
    }

    // map petId -> info 
    const petIds = pets.map((p) => p._id.toString());
    const petMap = {};
    pets.forEach((p) => {
      petMap[p._id.toString()] = {
        name: p.name,
        species: p.species,
      };
    });

    // 2) หา branch ที่มี schedules ของ pet 
    const branches = await Branch.find({
      "schedules.petId": { $in: petIds },
    })
      .select("branchName schedules")
      .lean();

    let result = [];

    branches.forEach((branch) => {
      (branch.schedules || []).forEach((s) => {
        const sPetId = s.petId && s.petId.toString();
        if (!sPetId) return;

        if (petIds.includes(sPetId)) {
          const petInfo = petMap[sPetId] || {};

          result.push({
            id: s._id.toString(),          // ใช้เป็น key ฝั่ง React
            petId: sPetId,
            petName: petInfo.name || null,
            petSpecies: petInfo.species || null,
            scheduledAt: s.scheduledAt,
            status: s.status,
            serviceType: s.serviceType,
            branchName: branch.branchName,
          });
        }
      });
    });

    // 3) เรียงตามเวลา
    result.sort(
      (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
    );

    return res.json(result);
  } catch (err) {
    console.error("owner get appointments error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// GET /api/owner/appointments/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const apptId = req.params.id;

    // ดึง owner + pets
    const user = await User.findById(ownerId).select("pets").lean();
    const petIds = user.pets.map(p => p._id.toString());

    // หา schedule ในทุก branch
    const branch = await Branch.findOne({
      "schedules._id": apptId,
      "schedules.petId": { $in: petIds }
    }).select("branchName schedules").lean();

    if (!branch) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const schedule = branch.schedules.find(s => s._id.toString() === apptId);

    return res.json({
      id: schedule._id,
      petId: schedule.petId,
      serviceType: schedule.serviceType,
      scheduledAt: schedule.scheduledAt,
      durationMinutes: schedule.durationMinutes,
      endAt: schedule.endAt,
      status: schedule.status,
      notes: schedule.notes,
      branchName: branch.branchName
    });

  } catch (err) {
    console.error("owner get appointment detail error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// PUT /api/owner/appointments/:id/cancel
router.put("/:id/cancel", auth, async (req, res) => {
  try {
    const ownerId = req.user.id || req.user._id;
    const apptId = req.params.id;

    const user = await User.findById(ownerId).select("pets").lean();
    const petIds = user.pets.map(p => p._id.toString());

    // หา branch ที่มีนัดนี้และเป็นของ owner
    const branch = await Branch.findOne({
      "schedules._id": apptId,
      "schedules.petId": { $in: petIds }
    });

    if (!branch) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    const schedule = branch.schedules.id(apptId);
    if (!schedule) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    schedule.status = "cancelled";
    schedule.notes = "Cancelled by owner";
    branch.updatedAt = new Date();
    await branch.save();

    return res.json({ message: "Appointment cancelled" });

  } catch (err) {
    console.error("owner cancel appointment error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});


module.exports = router;
