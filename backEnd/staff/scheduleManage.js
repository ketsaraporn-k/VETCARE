/* staff/scheduleManage.js */
const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { assertBranch, canSeeAll } = require("../middleware/scope");
const Branch = require("../models/Branch");
const User = require("../models/User");

const router = express.Router();
const isOid = (v) => mongoose.isValidObjectId(String(v || ""));

// ===== helpers =====
const getRole = (req) => String(req.user?.role || "").toLowerCase();
const getUserId = (req) => req.user?.id || req.user?._id || null;

/**
 * ใช้หา doctor จริง ๆ จาก schedule
 * - ถ้ามี doctorId ให้ใช้ก่อน
 * - ถ้าไม่มี (ข้อมูลเก่า) fallback ไปใช้ staffId
 */
function getScheduleDoctorId(s) {
  if (!s) return null;
  return s.doctorId || s.staffId || null;
}

/**
 * ให้หมอเห็นเฉพาะนัดของตัวเอง
 */
function filterForDoctor(req, rows) {
  const role = getRole(req);
  const me = getUserId(req);
  if (role !== "doctor" || !me) return rows;

  return (rows || []).filter((s) => {
    const did = getScheduleDoctorId(s);
    return did && String(did) === String(me);
  });
}

/**
 * เช็กว่ามีนัดของหมอ (doctorId) ที่เวลาชนกับช่วง [start, end] หรือไม่
 * - branchSchedules = branch.schedules ทั้งก้อน
 * - excludeId = ถ้าเป็นกรณีแก้ไข ให้ไม่นับตัวเอง (schedule._id)
 */
function hasDoctorConflict(branchSchedules, doctorId, start, end, excludeId = null) {
  if (!doctorId || !start || !end) return false;

  return (branchSchedules || []).some((s) => {
    // ข้ามตัวเอง (เวลาแก้ไข)
    if (excludeId && String(s._id) === String(excludeId)) return false;

    const schedDoctorId = getScheduleDoctorId(s);
    if (!schedDoctorId || String(schedDoctorId) !== String(doctorId)) return false;

    // ไม่ต้องเช็กชนกับนัดที่ถูกยกเลิกแล้ว
    if (s.status === "cancelled") return false;

    const sStart = new Date(s.scheduledAt);
    if (isNaN(sStart.getTime())) return false;

    // ถ้าไม่มี duration/ endAt (ของเก่า) ให้สมมติ 30 นาที
    const sDuration =
      typeof s.durationMinutes === "number" && s.durationMinutes > 0
        ? s.durationMinutes
        : 30;
    const sEnd = s.endAt
      ? new Date(s.endAt)
      : new Date(sStart.getTime() + sDuration * 60000);

    if (isNaN(sEnd.getTime())) return false;

    // เงื่อนไขชนเวลา: start < sEnd && end > sStart
    return start < sEnd && end > sStart;
  });
}

// ---------------------- CREATE (appointment) ----------------------
// POST /staff/schedules
// body: { branchId, petId, scheduledAt, durationMinutes?, serviceType?, notes?, doctorId?, staffId? }
router.post(
  "/schedules",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const {
        branchId,
        petId,
        scheduledAt,
        durationMinutes,
        serviceType,
        notes,
        doctorId,
        staffId,
      } = req.body;

      if (!branchId || !petId || !scheduledAt) {
        return res
          .status(422)
          .json({ error: "branchId, petId, scheduledAt required" });
      }
      if (!isOid(branchId) || !isOid(petId)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }

      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      // ====== เตรียมเวลาเริ่ม–เลิก + หมอ ======
      const start = new Date(scheduledAt);
      if (isNaN(start.getTime())) {
        return res.status(400).json({ error: "scheduledAt invalid" });
      }

      const duration =
        typeof durationMinutes === "number" && durationMinutes > 0
          ? durationMinutes
          : 30; // default 30 นาที

      const end = new Date(start.getTime() + duration * 60000);

      // ถ้า front เลือกหมอมา → ใช้ค่านั้น
      // ถ้าไม่เลือก และคนสร้างเป็นหมอ → ผูกหมอกับ user ปัจจุบัน
      const bodyDoctorId = doctorId && isOid(doctorId) ? doctorId : null;
      const roleNow = getRole(req);
      const me = getUserId(req);
      const effectiveDoctorId =
        bodyDoctorId || (roleNow === "doctor" ? me : null);

      // ====== เช็กชนตารางหมอ ถ้าเลือกหมอแล้ว ======
      if (effectiveDoctorId) {
        const conflict = hasDoctorConflict(
          branch.schedules,
          effectiveDoctorId,
          start,
          end
        );
        if (conflict) {
          return res
            .status(409)
            .json({ error: "ตารางนัดของคุณหมอซ้อนทับกับนัดอื่นอยู่" });
        }
      }

      const appt = {
        petId,
        staffId: staffId || me || null, // คนสร้างนัด
        doctorId: effectiveDoctorId || null,
        serviceType: serviceType || null,
        scheduledAt: start,
        durationMinutes: duration,
        endAt: end,
        status: "pending",
        notes: notes || null,
        createdAt: new Date(),
      };

      branch.schedules.push(appt);
      await branch.save();

      const newAppt = branch.schedules[branch.schedules.length - 1];
      res.status(201).json(newAppt);
    } catch (err) {
      console.error("create schedule err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ---------------------- LIST (by branch OR all for super) ----------------------
// GET /staff/schedules?branchId=...&all=0|1
router.get(
  "/schedules",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const wantAll = String(req.query.all || "") === "1" && canSeeAll(req);
      const branchId = req.query.branchId;

      if (!wantAll) {
        if (!branchId || !isOid(branchId)) {
          return res
            .status(400)
            .json({ error: "branchId invalid or missing" });
        }
        const branchCheck = assertBranch(req, branchId);
        if (!branchCheck.ok) {
          return res.status(403).json({ error: branchCheck.error });
        }

        const b = await Branch.findById(branchId)
          .select("branchName schedules")
          .lean();
        if (!b) return res.status(404).json({ error: "Branch not found" });

        let rows = (b.schedules || []).sort(
          (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
        );

        // ⭐ หมอเห็นเฉพาะนัดของตัวเอง
        rows = filterForDoctor(req, rows);

        return res.json({
          scope: "branch",
          branchId,
          branchName: b.branchName,
          total: rows.length,
          data: rows,
        });
      }

      // superAdmin: รวมทุกสาขา
      const branches = await Branch.find({})
        .select("branchName schedules")
        .lean();
      let rows = [];
      branches.forEach((b) => {
        (b.schedules || []).forEach((s) => {
          rows.push({
            ...s,
            branch: { id: b._id, branchName: b.branchName },
          });
        });
      });

      rows = rows.sort(
        (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
      );
      return res.json({ scope: "all", total: rows.length, data: rows });
    } catch (err) {
      console.error("list schedules err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// GET /staff/doctors?branchId=...
router.get(
  "/doctors",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const branchId = req.query.branchId;
      if (!branchId || !isOid(branchId)) {
        return res.status(400).json({ error: "branchId invalid or missing" });
      }

      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const doctors = await User.find({
        role: "doctor",
        isActive: true,
        $or: [{ branchId }, { "doctorProfile.availableBranches": branchId }],
      })
        .select("_id name doctorProfile")
        .lean();

      res.json({
        branchId,
        total: doctors.length,
        data: doctors,
      });
    } catch (err) {
      console.error("list doctors err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ---------------------- LIST (by branch path) ----------------------
// GET /staff/schedules/:branchId
router.get(
  "/schedules/:branchId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { branchId } = req.params;
      if (!isOid(branchId)) {
        return res.status(400).json({ error: "branchId invalid" });
      }

      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const b = await Branch.findById(branchId)
        .select("branchName schedules")
        .lean();
      if (!b) return res.status(404).json({ error: "Branch not found" });

      let rows = (b.schedules || []).sort(
        (a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt)
      );

      // ⭐ หมอเห็นเฉพาะนัดของตัวเอง
      rows = filterForDoctor(req, rows);

      res.json(rows);
    } catch (err) {
      console.error("list schedules err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ---------------------- LIST (by pet) ----------------------
// GET /staff/schedules/by-pet/:petId
router.get(
  "/schedules/by-pet/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { petId } = req.params;
      if (!isOid(petId)) {
        return res.status(400).json({ error: "petId invalid" });
      }

      const branches = await Branch.find({ "schedules.petId": petId })
        .select("branchName schedules")
        .lean();

      let rows = [];
      branches.forEach((b) => {
        (b.schedules || []).forEach((s) => {
          if (String(s.petId) === String(petId)) {
            rows.push({
              ...s,
              branch: { id: b._id, branchName: b.branchName },
            });
          }
        });
      });

      if (!rows.length) {
        return res
          .status(404)
          .json({ message: "ยังไม่มีการนัดสำหรับสัตว์ตัวนี้" });
      }

      // ⭐ ถ้าเป็นหมอ ให้เห็นเฉพาะนัดของตัวเอง
      rows = filterForDoctor(req, rows);

      rows = rows.sort(
        (a, b) => new Date(b.scheduledAt) - new Date(a.scheduledAt)
      );
      res.json({ petId, total: rows.length, data: rows });
    } catch (err) {
      console.error("schedules by pet err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ---------------------- UPDATE (full) ----------------------
// PUT /staff/schedules/:branchId/:id
// body: { scheduledAt?, durationMinutes?, status?, notes?, serviceType?, doctorId?, staffId? }
router.put(
  "/schedules/:branchId/:id",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { branchId, id } = req.params;
      if (!isOid(branchId) || !isOid(id)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }

      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      const sched = branch.schedules.id(id);
      if (!sched) return res.status(404).json({ error: "Schedule not found" });

      // ===== เตรียมค่าใหม่ไว้เช็กชนก่อน =====
      let newStart = sched.scheduledAt ? new Date(sched.scheduledAt) : null;
      if (req.body.scheduledAt) {
        const d = new Date(req.body.scheduledAt);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ error: "scheduledAt invalid" });
        }
        newStart = d;
      }

      let newDuration =
        typeof sched.durationMinutes === "number" && sched.durationMinutes > 0
          ? sched.durationMinutes
          : 30;
      if (req.body.durationMinutes !== undefined) {
        const dv = Number(req.body.durationMinutes);
        if (!Number.isFinite(dv) || dv <= 0) {
          return res.status(400).json({ error: "durationMinutes invalid" });
        }
        newDuration = dv;
      }

      const newEnd = new Date(newStart.getTime() + newDuration * 60000);

      let newDoctorId = getScheduleDoctorId(sched);
      if (req.body.doctorId && isOid(req.body.doctorId)) {
        newDoctorId = req.body.doctorId;
      }

      // ถ้ามีหมอกำกับอยู่ ให้เช็กชน
      if (newDoctorId) {
        const conflict = hasDoctorConflict(
          branch.schedules,
          newDoctorId,
          newStart,
          newEnd,
          id // exclude ตัวเอง
        );
        if (conflict) {
          return res
            .status(409)
            .json({ error: "ตารางนัดของคุณหมอซ้อนทับกับนัดอื่นอยู่" });
        }
      }

      // ===== ผ่านแล้วค่อยอัปเดตจริง =====
      sched.scheduledAt = newStart;
      sched.durationMinutes = newDuration;
      sched.endAt = newEnd;
      sched.doctorId = newDoctorId || null;

      if (req.body.status) sched.status = req.body.status;
      if (req.body.notes !== undefined) sched.notes = req.body.notes;
      if (req.body.staffId !== undefined) sched.staffId = req.body.staffId;
      if (req.body.serviceType !== undefined)
        sched.serviceType = req.body.serviceType;

      await branch.save();
      res.json({ message: "อัปเดตสำเร็จ", data: sched });
    } catch (err) {
      console.error("update schedule err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ---------------------- UPDATE (status only) ----------------------
// PUT /staff/schedules/:branchId/:id/status
router.put(
  "/schedules/:branchId/:id/status",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { branchId, id } = req.params;
      const { status } = req.body || {};
      if (!isOid(branchId) || !isOid(id)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }
      const allowed = ["pending", "confirmed", "done", "cancelled"];
      if (!allowed.includes(String(status || ""))) {
        return res.status(400).json({ error: "status invalid" });
      }

      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      const sched = branch.schedules.id(id);
      if (!sched) return res.status(404).json({ error: "Schedule not found" });

      sched.status = status;
      await branch.save();
      res.json({ message: "เปลี่ยนสถานะสำเร็จ", data: sched });
    } catch (err) {
      console.error("update status err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

module.exports = router;
