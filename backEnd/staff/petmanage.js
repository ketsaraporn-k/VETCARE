const express = require("express");
const mongoose = require("mongoose");
const Pet = require("../models/Pet");
const auth = require("../middleware/auth");

const router = express.Router();

const isSuper = (role) => String(role || "").toLowerCase() === "superadmin";

function checkRoleBranch(req, roles) {
  const user = req.user || {};
  const role = user.role || "guest";
  if (!roles.includes(role) && !isSuper(role)) return { ok: false, error: "ไม่มีสิทธิ์เข้าถึง" };

  const reqBranch = req.body?.branchId || req.query?.branchId || req.params?.branchId;
  if (!isSuper(role) && user.branchId && reqBranch && String(user.branchId) !== String(reqBranch)) {
    return { ok: false, error: "เข้าถึงได้เฉพาะสาขาของตนเอง" };
  }
  return { ok: true };
}

router.post("/pets", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, branchId, name, species, breed, gender, age, healthStatus } = req.body;
    if (!ownerId || !branchId || !name) return res.status(400).json({ error: "ต้องระบุ ownerId, branchId และ name" });
    if (!mongoose.isValidObjectId(ownerId) || !mongoose.isValidObjectId(branchId))
      return res.status(400).json({ error: "ownerId หรือ branchId ไม่ถูกต้อง" });

    const doc = {
      ownerId,
      branchId,
      name: String(name).trim(),
      species: species || "",
      breed: breed || "",
      gender: gender || "",
      healthStatus: healthStatus || ""
    };
    if (age) {
      const d = new Date(age);
      if (isNaN(d.getTime())) return res.status(400).json({ error: "รูปแบบ age ไม่ถูกต้อง" });
      doc.age = d;
    }

    const pet = await Pet.create(doc);
    res.status(201).json(pet);
  } catch (err) {
    console.error("create pet error:", err.message);
    res.status(500).json({ error: "สร้างข้อมูลสัตว์ล้มเหลว" });
  }
});

router.get("/pets", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || 10, 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const filter = {};
    const bid = req.query.branchId || req.user?.branchId;
    if (bid && mongoose.isValidObjectId(bid)) filter.branchId = new mongoose.Types.ObjectId(bid);

    const q = String(req.query.q || "").trim();
    if (q) {
      filter.$or = [
        { name: new RegExp(q, "i") },
        { species: new RegExp(q, "i") },
        { breed: new RegExp(q, "i") },
        { gender: new RegExp(q, "i") },
        { healthStatus: new RegExp(q, "i") }
      ];
      if (mongoose.isValidObjectId(q)) filter.$or.push({ _id: new mongoose.Types.ObjectId(q) });
    }

    const [total, data] = await Promise.all([
      Pet.countDocuments(filter),
      Pet.find(filter).populate("ownerId", "name phone").sort({ createdAt: -1 }).skip(skip).limit(pageSize)
    ]);
    res.json({ data, page, pageSize, total });
  } catch (err) {
    console.error("fetch pets error:", err.message);
    res.status(500).json({ error: "ดึงข้อมูลสัตว์ล้มเหลว" });
  }
});

router.put("/pets/:id", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

    const current = await Pet.findById(id).select("branchId");
    if (!current) return res.status(404).json({ error: "ไม่พบสัตว์เลี้ยง" });
    if (!isSuper(req.user?.role) && req.user?.branchId && String(req.user.branchId) !== String(current.branchId))
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });

    const pet = await Pet.findByIdAndUpdate(id, req.body, { new: true });
    res.json({ message: "อัปเดตสำเร็จ", data: pet });
  } catch (err) {
    console.error("update pet error:", err.message);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});


router.delete("/pets/:id", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

    const current = await Pet.findById(id).select("branchId");
    if (!current) return res.status(404).json({ error: "ไม่พบสัตว์เลี้ยง" });
    if (!isSuper(req.user?.role) && req.user?.branchId && String(req.user.branchId) !== String(current.branchId))
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });

    await Pet.findByIdAndDelete(id);
    res.json({ message: "ลบข้อมูลสำเร็จ" });
  } catch (err) {
    console.error("delete pet error:", err.message);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
