// backEnd/staff/vaccinationManage.js
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Branch = require("../models/Branch");
const Notification = (() => { try { return require("../models/Notification"); } catch(e){ return null; } })();
const auth = require("../middleware/auth");

const router = express.Router();
const isOid = v => mongoose.isValidObjectId(String(v || ""));
const isSuper = role => String(role || "").toLowerCase() === "superadmin";

function checkRoleBranch(req, roles = []) {
  const user = req.user || {};
  const role = user.role || "guest";
  if (!roles.includes(role) && !isSuper(role)) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (!isSuper(role) && user.branchId && reqBranch && String(user.branchId) !== String(reqBranch)) return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  return { ok: true };
}

function toDateOrNull(v, fieldName) {
  if (v == null) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    const err = new Error(`${fieldName} ไม่ถูกต้อง`);
    err.statusCode = 400;
    throw err;
  }
  return d;
}

// POST /:ownerId/:petId/vaccinations
router.post("/:ownerId/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, petId } = req.params;
    if (!isOid(ownerId) || !isOid(petId)) return res.status(400).json({ error: "Invalid id(s)" });

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: "Owner not found" });

    const pet = owner.pets.id(petId);
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    const branchId = isSuper(req.user.role) ? (req.body.branchId || owner.branchId || req.user.branchId) : req.user.branchId;
    if (!branchId) return res.status(400).json({ error: "branchId missing" });
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const vaccineTypeRaw = (req.body.vaccineType || req.body.vaccineName || "").toString().trim();
    if (!vaccineTypeRaw) return res.status(400).json({ error: "vaccineType required" });

    const dateGiven = req.body.dateGiven ? toDateOrNull(req.body.dateGiven, "dateGiven") : new Date();
    const nextDueDate = req.body.nextDueDate ? toDateOrNull(req.body.nextDueDate, "nextDueDate") : null;

    const v = {
      branchId,
      medicineId: req.body.medicineId || null,
      medicineNameSnapshot: req.body.vaccineName || vaccineTypeRaw,
      doseQty: Number(req.body.doseQty || 1),
      batch: req.body.batch || null,
      expiryDate: req.body.expiryDate ? toDateOrNull(req.body.expiryDate, "expiryDate") : null,
      dateGiven,
      nextDueDate,
      staffId: req.user.id || null,
      attachments: Array.isArray(req.body.attachments) ? req.body.attachments : []
    };

    pet.vaccinations.push(v);
    await owner.save();

    const newVac = pet.vaccinations[pet.vaccinations.length - 1];

    if (newVac.nextDueDate && Notification) {
      try {
        await Notification.create({
          userId: owner._id,
          message: `นัดฉีดวัคซีนของ ${pet.name} กำหนดวันที่ ${newVac.nextDueDate.toISOString()}`,
          type: 'vaccine',
          data: { petId: pet._id, nextDueDate: newVac.nextDueDate }
        });
      } catch (e) { console.warn('notif failed', e); }
    }

    res.status(201).json(newVac);
  } catch (err) {
    console.error("add vaccination err", err);
    const code = err.statusCode || 500;
    res.status(code).json({ error: err.message || "SERVER_ERROR" });
  }
});

// GET vaccinations by pet -> GET /:ownerId/:petId
router.get("/:ownerId/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, petId } = req.params;
    if (!isOid(ownerId) || !isOid(petId)) return res.status(400).json({ error: "Invalid id(s)" });

    const owner = await User.findById(ownerId).select("pets name branchId").lean();
    if (!owner) return res.status(404).json({ error: "Owner not found" });
    const pet = (owner.pets || []).find(p => String(p._id) === String(petId));
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(owner.branchId)) return res.status(403).json({ error: "Different branch" });

    const vaccinations = (pet.vaccinations || []).sort((a,b) => new Date(b.dateGiven) - new Date(a.dateGiven));
    res.json({ pet: { id: pet._id, name: pet.name }, owner: { id: owner._id, name: owner.name }, vaccinations });
  } catch (err) {
    console.error("get vacs err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
