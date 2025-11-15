const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const role = require("../middleware/role"); // ของเพื่อน: ตรวจ role ตรงๆ
const { assertBranch, canSeeAll } = require("../middleware/scope"); // ของเรา
const User = require("../models/User");
const Branch = require("../models/Branch");

const router = express.Router();
const isOid = v => mongoose.isValidObjectId(String(v || ""));

// ---------------------- CREATE PET ----------------------
// POST /staff/pets  (body: ownerId, branchId, name, species, ... )
router.post(
  "/pets",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, branchId, name, species, breed, sex, age, metadata } = req.body;
      if (!ownerId || !branchId || !name) {
        return res.status(400).json({ error: "ต้องระบุ ownerId, branchId และ name" });
      }
      if (!isOid(ownerId) || !isOid(branchId)) {
        return res.status(400).json({ error: "ownerId หรือ branchId ไม่ถูกต้อง" });
      }

      // เช็คสิทธิ์สาขา (เว้น superAdmin)
      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) return res.status(403).json({ error: branchCheck.error });

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner user not found" });

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      // ถ้า owner ยังไม่มี branchId ให้ผูกเข้ากับ branch นี้ (ตามดุลยพินิจ)
      if (!owner.branchId) owner.branchId = branchId;

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
  }
);

// ---------------------- LIST PETS ----------------------
// GET /staff/pets?branchId=...&q=...&page=1&pageSize=10
// superAdmin ส่ง ?all=1 เพื่อดูทุกสาขา
router.get(
  "/pets",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page || 1, 10), 1);
      const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || 10, 10), 1), 100);
      const skip = (page - 1) * pageSize;

      const q = String(req.query.q || "").trim();
      const wantAll = String(req.query.all || "") === "1" && canSeeAll(req);
      const bidStr = (req.query.branchId || req.user?.branchId || "").toString();

      // แปลงเป็น ObjectId อย่างปลอดภัย (ถ้าไม่ใช่ก็ปล่อยเป็น string)
      let bid = null;
      if (mongoose.isValidObjectId(bidStr)) {
        bid = new mongoose.Types.ObjectId(bidStr);
      }

      let users = [];

      if (wantAll) {
        // superAdmin เห็นทั้งหมด
        users = await User.find({}).select("name username pets branchId").lean();
      } else {
        if (!bid && !bidStr) {
          return res.status(400).json({ error: "branchId required" });
        }

        // ตรวจสิทธิ์ด้วยค่าที่ผู้ใช้ล็อกอินถืออยู่ (ไม่พึ่งค่าจาก query อย่างเดียว)
        const branchCheck = assertBranch(req, bid || bidStr);
        if (!branchCheck.ok) return res.status(403).json({ error: branchCheck.error });

        // 1) ดึง owner ที่ branchId = สาขานี้ หรือ branchId = null (เจ้าของเก่าที่ยังไม่ผูกสาขา)
        const baseFilter = { $or: [{ branchId: bid || bidStr }, { branchId: null }] };

        users = await User.find(baseFilter).select("name username pets branchId").lean();

        // 2) กันพลาด: ถ้าไม่มีจริง ๆ ให้ fallback เป็นดึงทั้งหมดแล้วค่อย filter ทีหลัง
        if (!users.length) {
          users = await User.find({}).select("name username pets branchId").lean();
        }
      }

      // ==== DEBUG LOG ชัด ๆ ในแบ็กเอนด์ ====
      console.log("[/staff/pets] role:", req.user?.role,
                  " req.branchId:", req.user?.branchId,
                  " query.branchId:", req.query.branchId,
                  " usersFetched:", users.length);

      // สร้างรายการ pets ออกมา
      let rows = [];
      users.forEach(u => {
        (u.pets || []).forEach(p => {
          rows.push({
            ...p,
            owner: { id: u._id, name: u.name, username: u.username },
            branchId: u.branchId || null,
          });
        });
      });

      // ถ้าไม่ใช่ super และมี bid แล้ว ให้ filter ซ้ำฝั่งแอพ
      if (!wantAll && (bid || bidStr)) {
        rows = rows.filter(r => {
          // เจ้าของไม่มี branchId (null) = อนุโลมให้เห็น
          if (!r.branchId) return true;
          return String(r.branchId) === String(bid || bidStr);
        });
      }

      if (q) {
        const re = new RegExp(q, "i");
        rows = rows.filter(
          p => re.test(p.name) || re.test(p.species || "") || re.test(p.breed || "")
        );
      }

      const total = rows.length;
      const data = rows.slice(skip, skip + pageSize);

      res.json({
        data,
        page,
        pageSize,
        total,
        scope: wantAll ? "all" : "branch",
      });
    } catch (err) {
      console.error("fetch pets err", err);
      res.status(500).json({ error: "ดึงข้อมูลสัตว์ล้มเหลว" });
    }
  }
);

// ---------------------- GET SINGLE PET ----------------------
// GET /staff/pets/:ownerId/:petId
router.get(
  "/pets/:ownerId/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "id ไม่ถูกต้อง" });
      }

      const owner = await User.findById(ownerId).select("name branchId pets").lean();
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok) return res.status(403).json({ error: branchCheck.error });

      const pet = (owner.pets || []).find(p => String(p._id) === String(petId));
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      return res.json({
        ...pet,
        owner: { id: ownerId, name: owner.name, branchId: owner.branchId },
      });
    } catch (err) {
      console.error("get single pet error", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ---------------------- UPDATE PET ----------------------
// PUT /staff/pets/:ownerId/:petId
router.put(
  "/pets/:ownerId/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "id ไม่ถูกต้อง" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok) return res.status(403).json({ error: branchCheck.error });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

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
  }
);

// ---------------------- DELETE PET ----------------------
// DELETE /staff/pets/:ownerId/:petId
router.delete(
  "/pets/:ownerId/:petId",
  auth,
  role(["branchAdmin", "superAdmin"]), // ลบจำกัดที่ branchAdmin/superAdmin
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "id ไม่ถูกต้อง" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok) return res.status(403).json({ error: branchCheck.error });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      pet.remove();
      await owner.save();
      res.json({ message: "ลบข้อมูลสำเร็จ" });
    } catch (err) {
      console.error("delete pet err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// GET /staff/owners?branchId=...&q=...&all=1
router.get(
  "/owners",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const q = String(req.query.q || "").trim();
      if (!q) {
        return res.json({ data: [] });
      }

      const wantAll = String(req.query.all || "") === "1" && canSeeAll(req);
      const bid = req.query.branchId || req.user?.branchId;

      const filter = { role: "owner" };

      if (!wantAll) {
        if (!bid) {
          return res.status(400).json({ error: "branchId required" });
        }
        const branchCheck = assertBranch(req, bid);
        if (!branchCheck.ok) {
          return res.status(403).json({ error: branchCheck.error });
        }
        filter.branchId = bid;
      }

      const regex = new RegExp(q, "i");

      const owners = await User.find(filter)
        .select("name username email phone branchId")
        .limit(20)
        .lean();

      const data = owners
        .filter((o) => {
          const idStr = String(o._id);
          return (
            regex.test(o.name || "") ||
            regex.test(o.username || "") ||
            regex.test(o.email || "") ||
            regex.test(o.phone || "") ||
            idStr.includes(q)
          );
        })
        .map((o) => ({
          id: o._id,
          name: o.name,
          username: o.username,
          branchId: o.branchId || null,
        }));

      res.json({ data });
    } catch (err) {
      console.error("search owners err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

module.exports = router;
