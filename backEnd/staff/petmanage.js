// backEnd/staff/petmanage.js
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const Branch = require("../models/Branch");
const auth = require("../middleware/auth");

const router = express.Router();
const isOid = v => mongoose.isValidObjectId(String(v || ""));

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

// Create pet => POST /staff/pets  (body: ownerId, branchId, name, ...)
router.post("/pets", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, branchId, name, species, breed, sex, age, healthStatus, metadata } = req.body;
    if (!ownerId || !branchId || !name) return res.status(400).json({ error: "ต้องระบุ ownerId, branchId และ name" });
    if (!isOid(ownerId) || !isOid(branchId)) return res.status(400).json({ error: "ownerId หรือ branchId ไม่ถูกต้อง" });

    // check owner exists
    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: "Owner user not found" });

    // optional: ensure branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) return res.status(404).json({ error: "Branch not found" });

    const petPayload = {
      name: String(name).trim(),
      species: species || null,
      sex: sex || null,
      age: age || null,
      breed: breed || null,
      metadata: metadata || {},
      createdAt: new Date()
    };

    owner.pets.push(petPayload);
    await owner.save();

    const newPet = owner.pets[owner.pets.length - 1];
    return res.status(201).json({ message: "Pet created", pet: newPet });
  } catch (err) {
    console.error("create pet err", err);
    res.status(500).json({ error: "สร้างข้อมูลสัตว์ล้มเหลว" });
  }
});

// GET pets by branch => GET /staff/pets?branchId=...
router.get("/pets", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const page = Math.max(parseInt(req.query.page || 1, 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || 10, 10), 1), 100);
    const skip = (page - 1) * pageSize;

    const bid = req.query.branchId || req.user?.branchId;
    if (!bid) return res.status(400).json({ error: "branchId required" });

    const q = String(req.query.q || "").trim();

    // Find users in branch and return their pets flattened
    const users = await User.find({ branchId: bid }).select("name username pets").lean();
    let pets = [];
    users.forEach(u => {
      (u.pets || []).forEach(p => {
        pets.push({
          ...p,
          owner: { id: u._id, name: u.name, username: u.username }
        });
      });
    });

    // simple search filter on flattened pets if q provided
    if (q) {
      const re = new RegExp(q, "i");
      pets = pets.filter(p => re.test(p.name) || re.test(p.species || "") || re.test(p.breed || ""));
    }

    const total = pets.length;
    const data = pets.slice(skip, skip + pageSize);
    res.json({ data, page, pageSize, total });
  } catch (err) {
    console.error("fetch pets err", err);
    res.status(500).json({ error: "ดึงข้อมูลสัตว์ล้มเหลว" });
  }
});

// UPDATE pet (we need ownerId + petId) => PUT /staff/pets/:ownerId/:petId
router.put("/pets/:ownerId/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["staff", "branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, petId } = req.params;
    if (!isOid(ownerId) || !isOid(petId)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: "Owner not found" });

    const pet = owner.pets.id(petId);
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    // branch check: if user not super, ensure user's branch matches owner's branch (we assume owner.branchId is set)
    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(owner.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    // apply allowed updates
    const allowed = ['name','species','sex','age','breed','metadata','isArchived','healthStatus'];
    allowed.forEach(k => {
      if (req.body[k] !== undefined) pet[k] = req.body[k];
    });

    await owner.save();
    res.json({ message: "อัปเดตสำเร็จ", pet });
  } catch (err) {
    console.error("update pet err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// DELETE pet => DELETE /staff/pets/:ownerId/:petId
router.delete("/pets/:ownerId/:petId", auth, async (req, res) => {
  const chk = checkRoleBranch(req, ["branchAdmin"]);
  if (!chk.ok) return res.status(403).json({ error: chk.error });

  try {
    const { ownerId, petId } = req.params;
    if (!isOid(ownerId) || !isOid(petId)) return res.status(400).json({ error: "id ไม่ถูกต้อง" });

    const owner = await User.findById(ownerId);
    if (!owner) return res.status(404).json({ error: "Owner not found" });

    const pet = owner.pets.id(petId);
    if (!pet) return res.status(404).json({ error: "Pet not found" });

    // branch check (assume owner.branchId)
    if (!isSuper(req.user.role) && req.user.branchId && String(req.user.branchId) !== String(owner.branchId)) {
      return res.status(403).json({ error: "เข้าถึงได้เฉพาะสาขาของตนเอง" });
    }

    pet.remove();
    await owner.save();
    res.json({ message: "ลบข้อมูลสำเร็จ" });
  } catch (err) {
    console.error("delete pet err", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
