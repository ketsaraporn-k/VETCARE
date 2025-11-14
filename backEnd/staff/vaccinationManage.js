const express = require("express");
const mongoose = require("mongoose");
const Vaccination = require("../models/Vaccination");
const Notification = require("../models/Notification");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

const isSuper = (role) => String(role || "").toLowerCase() === "superadmin";

// ตรวจสิทธิ์และสาขา
function checkRoleBranch(req, roles = []) {
  const user = req.user || {};
  const role = user.role || "guest";

  if (!roles.includes(role) && !isSuper(role)) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }

  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (!isSuper(role) && user.branchId && reqBranch && String(user.branchId) !== String(reqBranch)) {
    return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  }
  return { ok: true };
}

// Helper: parse/validate date 
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

// เพิ่มข้อมูลการฉีดวัคซีน
router.post("/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { petId } = req.params;
    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({ error: "petId ไม่ถูกต้อง" });
    }

    const pet = await Pet.findById(petId).select("branchId ownerId");
    if (!pet) return res.status(404).json({ error: "ไม่พบสัตว์เลี้ยง" });

    // ตรวจสาขา
    if (!isSuper(req.user.role) && String(req.user.branchId) !== String(pet.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    const userId = req.user?.id || req.user?._id;         
    const userBranchId = req.user?.branchId;
    const branchId = isSuper(req.user.role) ? (req.body.branchId || pet.branchId) : userBranchId;
    if (!branchId) return res.status(400).json({ error: "branchId ของผู้ใช้ไม่พบใน token" });

    
    // ยอมรับได้ทั้ง vaccineType และ vaccineName; ถ้าไม่ได้ส่ง type มา จะ map จาก name ให้
    const vaccineTypeRaw = (req.body.vaccineType || req.body.vaccineName || "").toString().trim();
    if (!vaccineTypeRaw) {
      return res.status(400).json({ error: "vaccineType จำเป็น" });
    }

    const dateGiven = req.body.dateGiven ? toDateOrNull(req.body.dateGiven, "dateGiven") : new Date();
    const nextDueDate = toDateOrNull(req.body.nextDueDate, "nextDueDate");

    const doc = {
      petId,
      staffId: userId,
      branchId,
      vaccineType: vaccineTypeRaw,                    
      vaccineName: req.body.vaccineName || vaccineTypeRaw,
      dateGiven,
      nextDueDate,
      note: req.body.note || ""
    };

    const saved = await Vaccination.create(doc);

    // แจ้งเตือนวัคซีนรอบหน้า (ถ้ามี)
    if (saved.nextDueDate) {
      await Notification.create({
        userId: pet.ownerId,
        message: `Vaccination reminder for pet — due on ${saved.nextDueDate.toISOString()}`,
        type: "vaccine", 
      });
    }

    res.status(201).json(saved);
  } catch (err) {
    console.error("create vaccination error:", err);
    const code = err.statusCode || (err.name === "ValidationError" ? 400 : 500);
    res.status(code).json({ error: err.message || "SERVER_ERROR" });
  }
});

// ดูประวัติการฉีดวัคซีนของสัตว์
router.get("/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { petId } = req.params;
    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({ error: "petId ไม่ถูกต้อง" });
    }

    const pet = await Pet.findById(petId).select("branchId");
    if (!pet) return res.status(404).json({ error: "ไม่พบสัตว์เลี้ยง" });

    if (!isSuper(req.user.role) && String(req.user.branchId) !== String(pet.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    const rows = await Vaccination.find({ petId })
      .populate("staffId", "name role")
      .sort({ dateGiven: -1 });

    res.json(rows);
  } catch (err) {
    console.error("fetch vaccination error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ดูข้อมูลวัคซีนทั้งหมดในสาขา
router.get("/branch/:branchId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { branchId } = req.params;
    if (!mongoose.isValidObjectId(branchId)) {
      return res.status(400).json({ error: "branchId ไม่ถูกต้อง" });
    }

    const rows = await Vaccination.find({ branchId })
      .populate("petId", "name species")
      .populate("staffId", "name role")
      .sort({ dateGiven: -1 });

    res.json(rows);
  } catch (err) {
    console.error("fetch vaccination by branch error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
