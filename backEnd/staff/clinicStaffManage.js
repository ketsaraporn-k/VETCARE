const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "petClinicSecretKey";
const isOid = (v) => mongoose.isValidObjectId(String(v || "").trim());

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token" });
  try {
    const token = auth.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
}

const isSuper = (u) => u?.role === "superAdmin";
const isBranchAdmin = (u) => u?.role === "branchAdmin";

function getPaging(q) {
  const page = Math.max(parseInt(q.page || 1, 10), 1);
  const pageSize = Math.min(Math.max(parseInt(q.pageSize || 10, 10), 1), 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function buildUserFilter(req) {
  const { q, role, branchId } = req.query || {};
  const filter = {};
  if (role && ["staff", "branchAdmin", "superAdmin"].includes(role)) filter.role = role;
  if (branchId && isOid(branchId)) filter.branchId = branchId;
  if (q && q.trim()) {
    const kw = q.trim();
    filter.$or = [
      { username: { $regex: kw, $options: "i" } },
      { name: { $regex: kw, $options: "i" } },
      { email: { $regex: kw, $options: "i" } },
      { phone: { $regex: kw, $options: "i" } },
    ];
  }
  if (isBranchAdmin(req.user)) filter.branchId = req.user.branchId || null;
  return filter;
}

router.post("/users", verifyToken, async (req, res) => {
  try {
    const { username, password, name, email, phone, role, branchId } = req.body;
    if (!isSuper(req.user) && !isBranchAdmin(req.user))
      return res.status(403).json({ error: "Permission denied" });
    if (isBranchAdmin(req.user) && role === "superAdmin")
      return res.status(403).json({ error: "branchAdmin cannot create superAdmin" });

    if (role === "staff" || role === "branchAdmin") {
      if (!branchId || !isOid(branchId)) return res.status(400).json({ error: "branchId required" });
      if (isBranchAdmin(req.user) && String(req.user.branchId) !== String(branchId))
        return res.status(403).json({ error: "Different branch" });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const doc = await User.create({
      username,
      password: hashed,
      name,
      email,
      phone,
      role,
      branchId: role === "superAdmin" ? null : branchId || null,
    });

    const out = doc.toObject();
    delete out.password;
    delete out.__v;
    res.status(201).json({ message: "User created", user: out });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/users", verifyToken, async (req, res) => {
  try {
    if (!isSuper(req.user) && !isBranchAdmin(req.user))
      return res.status(403).json({ error: "Permission denied" });
    const { page, pageSize, skip } = getPaging(req.query);
    const filter = buildUserFilter(req);
    const [total, data] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select("-password -__v").sort({ createdAt: -1 }).skip(skip).limit(pageSize),
    ]);
    res.json({ data, page, pageSize, total });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/users/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!isSuper(req.user) && !isBranchAdmin(req.user))
      return res.status(403).json({ error: "Permission denied" });
    const doc = await User.findById(id).select("-password -__v");
    if (!doc) return res.status(404).json({ error: "User not found" });
    if (isBranchAdmin(req.user) && String(doc.branchId || "") !== String(req.user.branchId || ""))
      return res.status(403).json({ error: "Different branch" });
    res.json(doc);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/users/:id/role", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const toRole = String(req.body.role || "").trim();
    const newBranchId = req.body.branchId;
    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!["staff", "branchAdmin", "superAdmin"].includes(toRole))
      return res.status(400).json({ error: "Invalid role" });

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (isBranchAdmin(req.user)) {
      if (target.role === "superAdmin" || toRole === "superAdmin")
        return res.status(403).json({ error: "branchAdmin cannot touch superAdmin" });
      if (String(req.user.branchId || "") !== String(target.branchId || ""))
        return res.status(403).json({ error: "Different branch" });
      if (!["staff", "branchAdmin"].includes(toRole))
        return res.status(403).json({ error: "Invalid transition" });
    } else if (!isSuper(req.user)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const update = { role: toRole };
    if (toRole === "superAdmin") {
      if (!isSuper(req.user)) return res.status(403).json({ error: "Only superAdmin can set superAdmin" });
      update.branchId = null;
    } else {
      const finalBranch = newBranchId ? String(newBranchId) : String(target.branchId || "");
      if (!finalBranch || !isOid(finalBranch))
        return res.status(400).json({ error: "branchId required when role is staff/branchAdmin" });
      if (isBranchAdmin(req.user) && String(req.user.branchId) !== finalBranch)
        return res.status(403).json({ error: "branchAdmin can only assign within own branch" });
      update.branchId = finalBranch;
    }

    const changed = await User.findByIdAndUpdate(id, update, { new: true }).select("-password -__v");
    res.json({ message: "Role updated", user: changed });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/users/:id/reset-password", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!newPassword || String(newPassword).length < 6)
      return res.status(400).json({ error: "newPassword too short" });

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (isSuper(req.user)) {
    } else if (isBranchAdmin(req.user)) {
      if (String(target.branchId || "") !== String(req.user.branchId || ""))
        return res.status(403).json({ error: "Different branch" });
      if (target.role === "superAdmin")
        return res.status(403).json({ error: "branchAdmin cannot touch superAdmin" });
    } else {
      return res.status(403).json({ error: "Permission denied" });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await User.findByIdAndUpdate(id, { password: hashed });
    res.json({ message: "Password reset" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.put("/users/change-password", verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: "currentPassword และ newPassword จำเป็น" });
    if (String(newPassword).length < 6)
      return res.status(400).json({ error: "รหัสใหม่ต้องยาวอย่างน้อย 6 ตัวอักษร" });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(String(currentPassword), me.password);
    if (!ok) return res.status(400).json({ error: "รหัสปัจจุบันไม่ถูกต้อง" });
    const same = await bcrypt.compare(String(newPassword), me.password);
    if (same) return res.status(400).json({ error: "รหัสใหม่ต้องแตกต่างจากรหัสเดิม" });

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await User.findByIdAndUpdate(me._id, { password: hashed });
    res.json({ message: "เปลี่ยนรหัสผ่านสำเร็จ" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.delete("/users/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (String(req.user.id) === String(id))
      return res.status(403).json({ error: "You cannot delete yourself" });

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (isSuper(req.user)) {
    } else if (isBranchAdmin(req.user)) {
      if (target.role !== "staff") return res.status(403).json({ error: "branchAdmin can delete only staff" });
      if (String(target.branchId || "") !== String(req.user.branchId || ""))
        return res.status(403).json({ error: "Different branch" });
    } else {
      return res.status(403).json({ error: "Permission denied" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// สร้าง superAdmin ครั้งแรก (ใช้หลังบ้านเฉพาะตอนเริ่มระบบ)
// เปิดใช้ตอนต้องการ แล้วคอมเม้น
router.post("/init-superadmin", async (req, res) => {
  try {
    const { username = "superadmin", password = "123456", name = "Super Admin", email, phone } = req.body || {};

    const exists = await User.findOne({ role: "superAdmin" });
    if (exists) return res.status(400).json({ error: "SuperAdmin already exists" });

    const hashed = await bcrypt.hash(String(password), 10);
    const user = await User.create({
      username,
      password: hashed,
      name,
      email: email || "",
      phone: phone || "",
      role: "superAdmin",
      branchId: null,
    });

    const out = user.toObject();
    delete out.password;
    delete out.__v;
    res.status(201).json({ message: "SuperAdmin created", user: out });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
