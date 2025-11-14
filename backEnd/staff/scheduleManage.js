const express = require("express");
const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const auth = require("../middleware/auth");

const router = express.Router();

function checkRoleBranch(req, roles = []) {
  const user = req.user || {};
  const role = user.role || "guest";
  if (!roles.includes(role) && role !== "superAdmin") {
    return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  }
  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (
    role !== "superAdmin" &&
    user.branchId &&
    reqBranch &&
    String(user.branchId) !== String(reqBranch)
  ) {
    return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  }
  return { ok: true };
}

// CREATE
router.post("/", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });
  try {
    const doc = await Schedule.create(req.body);
    res.status(201).json(doc);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// LIST BY BRANCH
router.get("/:branchId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });
  try {
    const rows = await Schedule.find({ branchId: req.params.branchId })
      .populate("petId", "name species")
      .populate("ownerId", "name phone")
      .populate("staffId", "name")
      .sort({ scheduledAt: 1 });
    res.json(rows);
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// LIST BY PET
router.get("/by-pet/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });
  try {
    const { petId } = req.params;
    if (!mongoose.isValidObjectId(petId)) {
      return res.status(400).json({ error: "petId ไม่ถูกต้อง" });
    }
    const rows = await Schedule.find({ petId })
      .populate("branchId", "branchName")
      .populate("staffId", "name role")
      .sort({ scheduledAt: -1 });
    if (!rows.length) return res.status(404).json({ message: "ยังไม่มีการนัดสำหรับสัตว์ตัวนี้" });
    res.json({ petId, total: rows.length, data: rows });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// UPDATE
router.put("/:id", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

    const current = await Schedule.findById(id).select("branchId");
    if (!current) return res.status(404).json({ error: "ไม่พบรายการนัด" });
    if (
      req.user.role !== "superAdmin" &&
      req.user.branchId &&
      String(req.user.branchId) !== String(current.branchId)
    ) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    const doc = await Schedule.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: "อัปเดตสำเร็จ", data: doc });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// UPDATE STATUS ONLY
router.put("/:id/status", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { id } = req.params;
    const { status } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });
    if (!["pending", "confirmed", "done", "canceled"].includes(String(status || ""))) {
      return res.status(400).json({ error: "status ไม่ถูกต้อง" });
    }

    const current = await Schedule.findById(id).select("branchId");
    if (!current) return res.status(404).json({ error: "ไม่พบรายการนัด" });
    if (
      req.user.role !== "superAdmin" &&
      req.user.branchId &&
      String(req.user.branchId) !== String(current.branchId)
    ) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    const doc = await Schedule.findByIdAndUpdate(id, { status }, { new: true });
    res.json({ message: "เปลี่ยนสถานะสำเร็จ", data: doc });
  } catch {
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
