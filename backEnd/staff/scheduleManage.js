// backEnd/staff/scheduleManage.js
const express = require("express");
const mongoose = require("mongoose");
const Branch = require("../models/Branch");
const User = require("../models/User"); // for owner/staff populate if needed
const auth = require("../middleware/auth");

const router = express.Router();
const isOid = v => mongoose.isValidObjectId(String(v || ""));
const isSuper = role => String(role || "").toLowerCase() === "superadmin";

function checkRoleBranch(req, roles = []) {
  const user = req.user || {};
  const role = user.role || "guest";
  if (!roles.includes(role) && !isSuper(role)) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };
  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (!isSuper(role) && user.branchId && reqBranch && String(user.branchId) !== String(reqBranch)) {
    return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  }
  return { ok: true };
}

// CREATE schedule -> POST /staff/schedules (body must include branchId, petId, scheduledAt)
router.post("/", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { branchId, petId, staffId, serviceType, scheduledAt, notes } = req.body;
    if (!branchId || !petId || !scheduledAt) return res.status(422).json({ error: "branchId, petId, scheduledAt required" });
    if (!isOid(branchId) || !isOid(petId)) return res.status(400).json({ error: "Invalid id(s)" });

    // branch permission
    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(branchId)) return res.status(403).json({ error: "Different branch" });

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const schedule = {
      petId,
      staffId: staffId || req.user.id || null,
      serviceType: serviceType || null,
      scheduledAt: new Date(scheduledAt),
      status: 'pending',
      notes: notes || null,
      createdAt: new Date()
    };

    branch.schedules.push(schedule);
    await branch.save();

    const newSched = branch.schedules[branch.schedules.length - 1];
    res.status(201).json(newSched);
  } catch (err) {
    console.error("create schedule err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// LIST schedules by branch -> GET /staff/schedules/:branchId
router.get("/:branchId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { branchId } = req.params;
    if (!isOid(branchId)) return res.status(400).json({ error: "branchId invalid" });

    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(branchId)) return res.status(403).json({ error: "Different branch" });

    const branch = await Branch.findById(branchId).select("branchName schedules").lean();
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const rows = (branch.schedules || []).sort((a,b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
    res.json(rows);
  } catch (err) {
    console.error("list schedules err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// LIST by pet -> GET /staff/schedules/by-pet/:petId
router.get("/by-pet/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { petId } = req.params;
    if (!isOid(petId)) return res.status(400).json({ error: "petId invalid" });

    // find branches that have this pet scheduled
    const branches = await Branch.find({ 'schedules.petId': petId }).select('branchName schedules').lean();
    let rows = [];
    branches.forEach(b => {
      (b.schedules || []).forEach(s => {
        if (String(s.petId) === String(petId)) rows.push({ ...s, branch: { id: b._id, branchName: b.branchName } });
      });
    });

    if (!rows.length) return res.status(404).json({ message: "ยังไม่มีการนัดสำหรับสัตว์ตัวนี้" });
    rows = rows.sort((a,b) => new Date(b.scheduledAt) - new Date(a.scheduledAt));
    res.json({ petId, total: rows.length, data: rows });
  } catch (err) {
    console.error("schedules by pet err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// UPDATE schedule -> PUT /staff/schedules/:branchId/:scheduleId
router.put("/:branchId/:id", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { branchId, id } = req.params;
    if (!isOid(branchId) || !isOid(id)) return res.status(400).json({ error: "Invalid id(s)" });

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(branchId)) return res.status(403).json({ error: "Different branch" });

    const sched = branch.schedules.id(id);
    if (!sched) return res.status(404).json({ error: "Schedule not found" });

    // validate scheduledAt if provided
    if (req.body.scheduledAt) {
      const d = new Date(req.body.scheduledAt);
      if (isNaN(d.getTime())) return res.status(400).json({ error: "scheduledAt invalid" });
      sched.scheduledAt = d;
    }
    if (req.body.status) sched.status = req.body.status;
    if (req.body.notes !== undefined) sched.notes = req.body.notes;
    if (req.body.staffId !== undefined) sched.staffId = req.body.staffId;

    await branch.save();
    res.json({ message: "อัปเดตสำเร็จ", data: sched });
  } catch (err) {
    console.error("update schedule err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Update status only -> PUT /staff/schedules/:branchId/:id/status
router.put("/:branchId/:id/status", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { branchId, id } = req.params;
    const { status } = req.body || {};
    if (!isOid(branchId) || !isOid(id)) return res.status(400).json({ error: "Invalid id(s)" });
    if (!["pending", "confirmed", "done", "cancelled"].includes(String(status || ""))) return res.status(400).json({ error: "status invalid" });

    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });
    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(branchId)) return res.status(403).json({ error: "Different branch" });

    const sched = branch.schedules.id(id);
    if (!sched) return res.status(404).json({ error: "Schedule not found" });

    sched.status = status;
    await branch.save();
    res.json({ message: "เปลี่ยนสถานะสำเร็จ", data: sched });
  } catch (err) {
    console.error("update status err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
