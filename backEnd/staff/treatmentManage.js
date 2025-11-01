const express = require("express");
const mongoose = require("mongoose");
const Treatment = require("../models/Treatment");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

function isSuper(role) {
  return String(role || "").toLowerCase() === "superadmin";
}

function checkRoleBranch(req, roles = []) {
  const u = req.user || {};
  const role = u.role || "guest";
  if (!roles.includes(role) && !isSuper(role)) {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }
  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (!isSuper(role) && u.branchId && reqBranch && String(u.branchId) !== String(reqBranch)) {
    return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  }
  return { ok: true };
}

// CREATE (บันทึกการตรวจรักษา)
router.post("/treatments/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { petId } = req.params;
    if (!mongoose.isValidObjectId(petId)) return res.status(400).json({ error: "petId ไม่ถูกต้อง" });

    const pet = await Pet.findById(petId).select("branchId");
    if (!pet) return res.status(404).json({ error: "ไม่พบข้อมูลสัตว์เลี้ยง" });

    // non-super ต้องอยู่สาขาเดียวกับ pet
    if (!isSuper(req.user.role) && String(req.user.branchId) !== String(pet.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    // รองรับทั้ง treatmentDate/visitDate
    const when = req.body.treatmentDate || req.body.visitDate;
    const d = new Date(when);
    if (!when || isNaN(d.getTime())) return res.status(400).json({ error: "treatmentDate ไม่ถูกต้อง" });

    // super กำหนด branchId ได้; ถ้าไม่ส่ง ใช้ของ pet
    const branchId = isSuper(req.user.role)
      ? (req.body.branchId || pet.branchId || req.user.branchId)
      : req.user.branchId;

    if (!branchId) return res.status(400).json({ error: "branchId จำเป็น" });

    const doc = {
      petId,
      staffId: req.user.id,
      branchId,
      treatmentDate: d,
      symptoms: req.body.symptoms || "",
      diagnosis: req.body.diagnosis || "",
      prescription: req.body.prescription || ""
    };

    const saved = await Treatment.create(doc);
    res.status(201).json(saved);
  } catch (err) {
    console.error("create treatment error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// LIST by pet
router.get("/treatments/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { petId } = req.params;
    if (!mongoose.isValidObjectId(petId)) return res.status(400).json({ error: "petId ไม่ถูกต้อง" });

    const pet = await Pet.findById(petId).select("branchId");
    if (!pet) return res.status(404).json({ error: "ไม่พบข้อมูลสัตว์เลี้ยง" });

    if (!isSuper(req.user.role) && String(req.user.branchId) !== String(pet.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    const rows = await Treatment.find({ petId })
      .populate("staffId", "name role")
      .sort({ treatmentDate: -1 });

    res.json(rows);
  } catch (err) {
    console.error("fetch treatment error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// UPDATE
router.put("/treatments/:id", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

    const current = await Treatment.findById(id).select("branchId");
    if (!current) return res.status(404).json({ error: "ไม่พบข้อมูล" });

    if (!isSuper(req.user.role) && String(req.user.branchId) !== String(current.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    if (req.body.treatmentDate || req.body.visitDate) {
      const when = req.body.treatmentDate || req.body.visitDate;
      const d = new Date(when);
      if (isNaN(d.getTime())) return res.status(400).json({ error: "treatmentDate ไม่ถูกต้อง" });
      req.body.treatmentDate = d;
      delete req.body.visitDate;
    }

    // non-super ห้ามย้าย branchId
    if (!isSuper(req.user.role) && typeof req.body.branchId !== "undefined") {
      delete req.body.branchId;
    }

    const updated = await Treatment.findByIdAndUpdate(id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "ไม่พบข้อมูล" });

    res.json({ message: "อัปเดตสำเร็จ", data: updated });
  } catch (err) {
    console.error("update treatment error:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
