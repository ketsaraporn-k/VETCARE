// backEnd/staff/treatmentManage.js
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Branch = require("../models/Branch");
const auth = require("../middleware/auth");

const router = express.Router();
const isOid = v => mongoose.isValidObjectId(String(v || ""));
const isSuper = (role) => String(role || "").toLowerCase() === "superadmin";

function checkRoleBranch(req, roles = []) {
  const u = req.user || {};
  const role = u.role || "guest";
  if (!roles.includes(role) && !isSuper(role)) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (!isSuper(role) && u.branchId && reqBranch && String(u.branchId) !== String(reqBranch)) return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  return { ok: true };
}

// Create treatment -> POST /staff/treatments/:ownerId/:petId
router.post("/treatments/:ownerId/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, petId } = req.params;
    if (!isOid(ownerId) || !isOid(petId)) return res.status(400).json({ error: "Invalid id" });

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: "Owner not found" });

    const pet = owner.pets.id(petId);
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    // branch check using owner.branchId (or branchId in body)
    const branchId = isSuper(req.user.role) ? (req.body.branchId || owner.branchId || req.user.branchId) : req.user.branchId;
    if (!branchId) return res.status(400).json({ error: "branchId required" });

    // optional: check branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const { symptoms, diagnosis, notes, medicineId, medicineNameSnapshot, quantityUsed = 1, staffId } = req.body;

    // allergy check using User method
    if (medicineNameSnapshot) {
      const allergy = owner.hasPetAllergy(petId, medicineNameSnapshot);
      if (allergy.matched) return res.status(400).json({ error: "Pet has allergy", entries: allergy.entries });
    }

    // reduce stock if medicineId provided (medicine is subdoc in branch)
    if (medicineId && isOid(medicineId)) {
      const med = branch.medicines.id(medicineId);
      if (!med) return res.status(404).json({ error: "Medicine not found in branch" });
      med.stock = Math.max(0, (med.stock || 0) - Number(quantityUsed));
      if ((med.stock || 0) <= (med.lowStockThreshold ?? 5)) med.lowStockAlert = true;
      await branch.save();
    }

    // push treatment subdoc to pet
    const treat = {
      symptoms: symptoms || null,
      diagnosis: diagnosis || null,
      notes: notes || null,
      branchId,
      medicineId: medicineId || null,
      medicineNameSnapshot: medicineNameSnapshot || null,
      quantityUsed: Number(quantityUsed) || 1,
      treatmentDate: req.body.treatmentDate ? new Date(req.body.treatmentDate) : new Date(),
      staffId: staffId || req.user.id || null,
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : []
    };

    pet.treatments.push(treat);
    await owner.save();

    const newTreat = pet.treatments[pet.treatments.length - 1];
    return res.status(201).json(newTreat);
  } catch (err) {
    console.error("add treatment err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// List treatments by pet -> GET /staff/treatments/:ownerId/:petId
router.get("/treatments/:ownerId/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, petId } = req.params;
    if (!isOid(ownerId) || !isOid(petId)) return res.status(400).json({ error: "Invalid id" });

    const owner = await User.findById(ownerId).select("pets name branchId").lean();
    if (!owner) return res.status(404).json({ error: "Owner not found" });
    const pet = (owner.pets || []).find(p => String(p._id) === String(petId));
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    // branch permission check
    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(owner.branchId)) return res.status(403).json({ error: "Different branch" });

    // return treatments sorted
    const treatments = (pet.treatments || []).sort((a,b) => new Date(b.treatmentDate) - new Date(a.treatmentDate));
    res.json({ pet: { id: pet._id, name: pet.name }, owner: { id: owner._id, name: owner.name }, treatments });
  } catch (err) {
    console.error("list treatments err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
