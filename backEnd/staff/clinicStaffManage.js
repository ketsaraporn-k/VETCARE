// backEnd/staff/clinicStaffManage.js
const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const User = require("../models/User");
const auth = require("../middleware/auth");

const {
  isSuperRole,
  isBranchRole,
  assertBranch,
} = require("../middleware/scope");

const router = express.Router();
const isOid = (v) => mongoose.isValidObjectId(String(v || "").trim());

function isSuper(u) {
  return isSuperRole(u);
}
function isBranchAdmin(u) {
  return isBranchRole(u, "branchAdmin");
}

function getPaging(q) {
  const page = Math.max(parseInt(q.page || 1, 10), 1);
  const pageSize = Math.min(
    Math.max(parseInt(q.pageSize || 10, 10), 1),
    100
  );
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function buildUserFilter(req) {
  const { q, role, branchId } = req.query || {};
  const filter = {};

  if (role && ["owner","staff", "branchAdmin", "superAdmin", "doctor"].includes(role)) {
    filter.role = role;
  }

  if (branchId && isOid(branchId)) {
    filter.branchId = branchId;
  }

  if (q && q.trim()) {
    const kw = q.trim();
    filter.$or = [
      { username: { $regex: kw, $options: "i" } },
      { name: { $regex: kw, $options: "i" } },
      { email: { $regex: kw, $options: "i" } },
      { phone: { $regex: kw, $options: "i" } },
    ];
  }

  // branchAdmin เห็นเฉพาะคนในสาขาตัวเอง (บังคับทับ branchId ใน query)
  if (isBranchAdmin(req.user)) {
    filter.branchId = req.user.branchId || null;
  }

  return filter;
}

// Create user (superAdmin or branchAdmin)
router.post("/users", auth, async (req, res) => {
  try {
    if (!isSuper(req.user) && !isBranchAdmin(req.user)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { username, password, name, email, phone, role, branchId } = req.body;
    if (!username || !password || !name) {
      return res
        .status(422)
        .json({ error: "username, password, name required" });
    }

    if (isBranchAdmin(req.user) && role === "superAdmin") {
      return res
        .status(403)
        .json({ error: "branchAdmin cannot create superAdmin" });
    }

    // roles ที่ต้องมี branchId
    if (["staff", "branchAdmin", "doctor"].includes(role)) {
      if (!branchId || !isOid(branchId)) {
        return res
          .status(400)
          .json({ error: "branchId required for this role" });
      }

      // branchAdmin สร้างได้เฉพาะในสาขาตัวเอง
      const chk = assertBranch(req, branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });
    }

    const exists = await User.findOne({ username });
    if (exists) return res.status(400).json({ error: "Username already exists" });

    const hashed = await bcrypt.hash(String(password), 10);
    const doc = new User({
      username,
      password: hashed,
      name,
      email,
      phone,
      role,
      branchId: role === "superAdmin" ? null : (branchId || null),
      createdBy: req.user.id || null,
      updatedBy: req.user.id || null,
    });
    await doc.save();

    const out = doc.toJSON ? doc.toJSON() : doc;
    delete out.password;
    res.status(201).json({ message: "User created", user: out });
  } catch (e) {
    console.error("create user err", e);
    res.status(400).json({ error: e.message });
  }
});

// List users
router.get("/users", auth, async (req, res) => {
  try {
    if (!isSuper(req.user) && !isBranchAdmin(req.user)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const { page, pageSize, skip } = getPaging(req.query);
    const filter = buildUserFilter(req);

    const [total, data] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("-password -__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(pageSize),
    ]);

    res.json({ data, page, pageSize, total });
  } catch (e) {
    console.error("list users err", e);
    res.status(400).json({ error: e.message });
  }
});

// Get single user
router.get("/users/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!isSuper(req.user) && !isBranchAdmin(req.user)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const doc = await User.findById(id).select("-password -__v");
    if (!doc) return res.status(404).json({ error: "User not found" });

    if (isBranchAdmin(req.user)) {
      const chk = assertBranch(req, doc.branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });
    }

    res.json(doc);
  } catch (e) {
    console.error("get user err", e);
    res.status(400).json({ error: e.message });
  }
});

// Change role
router.put("/users/:id/role", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const toRole = String(req.body.role || "").trim();
    const newBranchId = req.body.branchId;

    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!["staff", "branchAdmin", "superAdmin", "doctor", "owner"].includes(toRole)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (isBranchAdmin(req.user)) {
      if (target.role === "superAdmin" || toRole === "superAdmin") {
        return res
          .status(403)
          .json({ error: "branchAdmin cannot touch superAdmin" });
      }

      const chk = assertBranch(req, target.branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });

      if (!["staff", "branchAdmin", "doctor"].includes(toRole)) {
        return res.status(403).json({ error: "Invalid transition" });
      }
    } else if (!isSuper(req.user)) {
      return res.status(403).json({ error: "Permission denied" });
    }

    const update = { role: toRole, updatedBy: req.user.id || null };

    if (toRole === "superAdmin") {
      if (!isSuper(req.user)) {
        return res
          .status(403)
          .json({ error: "Only superAdmin can set superAdmin" });
      }
      update.branchId = null;
    } else {
      const finalBranch = newBranchId
        ? String(newBranchId)
        : String(target.branchId || "");
      if (!finalBranch || !isOid(finalBranch)) {
        return res.status(400).json({
          error: "branchId required when role is staff/branchAdmin/doctor",
        });
      }

      if (isBranchAdmin(req.user)) {
        const chk = assertBranch(req, finalBranch);
        if (!chk.ok) return res.status(403).json({ error: chk.error });
      }

      update.branchId = finalBranch;
    }

    const changed = await User.findByIdAndUpdate(id, update, {
      new: true,
    }).select("-password -__v");

    res.json({ message: "Role updated", user: changed });
  } catch (e) {
    console.error("change role err", e);
    res.status(400).json({ error: e.message });
  }
});

// Reset password (by admin)
router.put("/users/:id/reset-password", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};

    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ error: "newPassword too short" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (isSuper(req.user)) {
      // ok
    } else if (isBranchAdmin(req.user)) {
      const chk = assertBranch(req, target.branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });
      if (target.role === "superAdmin") {
        return res
          .status(403)
          .json({ error: "branchAdmin cannot touch superAdmin" });
      }
    } else {
      return res.status(403).json({ error: "Permission denied" });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await User.findByIdAndUpdate(id, {
      password: hashed,
      updatedBy: req.user.id || null,
    });

    res.json({ message: "Password reset" });
  } catch (e) {
    console.error("reset pwd err", e);
    res.status(400).json({ error: e.message });
  }
});

// Change own password
router.put("/users/change-password", auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "currentPassword and newPassword required" });
    }
    if (String(newPassword).length < 6) {
      return res
        .status(400)
        .json({ error: "new password must be at least 6 chars" });
    }

    const me = await User.findById(req.user.id).select("+password");
    if (!me) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(String(currentPassword), me.password);
    if (!ok) return res.status(400).json({ error: "current password invalid" });

    const same = await bcrypt.compare(String(newPassword), me.password);
    if (same) {
      return res
        .status(400)
        .json({ error: "new password must differ" });
    }

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await User.findByIdAndUpdate(me._id, {
      password: hashed,
      updatedBy: req.user.id || null,
    });

    res.json({ message: "Password changed" });
  } catch (e) {
    console.error("change pwd err", e);
    res.status(400).json({ error: e.message });
  }
});

// Delete user
router.delete("/users/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isOid(id)) return res.status(400).json({ error: "Invalid id" });
    if (String(req.user.id) === String(id)) {
      return res.status(403).json({ error: "You cannot delete yourself" });
    }

    const target = await User.findById(id);
    if (!target) return res.status(404).json({ error: "User not found" });

    if (isSuper(req.user)) {
      // ok
    } else if (isBranchAdmin(req.user)) {
      if (target.role !== "staff") {
        return res
          .status(403)
          .json({ error: "branchAdmin can delete only staff" });
      }
      const chk = assertBranch(req, target.branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });
    } else {
      return res.status(403).json({ error: "Permission denied" });
    }

    await User.findByIdAndDelete(id);
    res.json({ message: "User deleted" });
  } catch (e) {
    console.error("delete user err", e);
    res.status(400).json({ error: e.message });
  }
});

// Optional: init-superadmin (keep disabled in prod)
router.post("/init-superadmin", async (req, res) => {
  try {
    const {
      username = "superadmin",
      password = "123456",
      name = "Super Admin",
      email,
      phone,
    } = req.body || {};

    const exists = await User.findOne({ role: "superAdmin" });
    if (exists) {
      return res.status(400).json({ error: "SuperAdmin already exists" });
    }

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

    const out = user.toJSON ? user.toJSON() : user;
    delete out.password;

    res.status(201).json({ message: "SuperAdmin created", user: out });
  } catch (err) {
    console.error("init super err", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
