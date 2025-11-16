const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const role = require("../middleware/role"); // ตรวจ role ตรงๆ
const { assertBranch, canSeeAll } = require("../middleware/scope");
const User = require("../models/User");
const Branch = require("../models/Branch");

const router = express.Router();
const isOid = (v) => mongoose.isValidObjectId(String(v || ""));

/* CREATE PET POST /staff/pets */
router.post(
  "/pets",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const {
        ownerId,
        branchId,
        name,
        species,
        breed,
        sex,
        age,
        metadata,
      } = req.body;

      if (!ownerId || !branchId || !name) {
        return res
          .status(400)
          .json({ error: "ต้องระบุ ownerId, branchId และ name" });
      }
      if (!isOid(ownerId) || !isOid(branchId)) {
        return res
          .status(400)
          .json({ error: "ownerId หรือ branchId ไม่ถูกต้อง" });
      }

      // เช็คสิทธิ์สาขา (เว้น superAdmin)
      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok)
        return res.status(403).json({ error: branchCheck.error });

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner user not found" });

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      // ถ้า owner ยังไม่มี branchId ให้ผูกเข้ากับ branch นี้
      if (!owner.branchId) owner.branchId = branchId;

      const petPayload = {
        name: String(name).trim(),
        species: species || null,
        sex: sex || null,
        age: age || null,
        breed: breed || null,
        metadata: metadata || {},
        createdAt: new Date(),
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

/* LIST PETS GET /staff/pets */
// ?branchId=...&q=...&page=1&pageSize=10
// superAdmin: ?all=1 เพื่อดูทุกสาขา หรือ ?branchId=... เพื่อดูเฉพาะสาขา
router.get(
  "/pets",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const page = Math.max(parseInt(req.query.page || 1, 10), 1);
      const pageSize = Math.min(
        Math.max(parseInt(req.query.pageSize || 10, 10), 1),
        100
      );
      const skip = (page - 1) * pageSize;

      const q = String(req.query.q || "").trim();
      const wantAll = String(req.query.all || "") === "1" && canSeeAll(req);
      const bidStr = (req.query.branchId || req.user?.branchId || "").toString();

      let bid = null;
      if (mongoose.isValidObjectId(bidStr)) {
        bid = new mongoose.Types.ObjectId(bidStr);
      }

      let users = [];

      if (wantAll) {
        // superAdmin เห็นทุกสาขา
        users = await User.find({})
          .select("name username pets branchId")
          .lean();
      } else {
        if (!bid && !bidStr) {
          return res.status(400).json({ error: "branchId required" });
        }

        // ตรวจสิทธิ์ด้วย branch ที่ผูกกับ user
        const branchCheck = assertBranch(req, bid || bidStr);
        if (!branchCheck.ok)
          return res.status(403).json({ error: branchCheck.error });

        const baseFilter = {
          $or: [{ branchId: bid || bidStr }, { branchId: null }],
        };

        users = await User.find(baseFilter)
          .select("name username pets branchId")
          .lean();

        if (!users.length) {
          users = await User.find({})
            .select("name username pets branchId")
            .lean();
        }
      }

      // preload branch name ทั้งหมดครั้งเดียว
      const branchIds = [
        ...new Set(
          users
            .map((u) => u.branchId)
            .filter(Boolean)
            .map((id) => id.toString())
        ),
      ];

      let branchMap = new Map();
      if (branchIds.length) {
        const branches = await Branch.find({ _id: { $in: branchIds } })
          .select("branchName name code")
          .lean();
        branchMap = new Map(
          branches.map((b) => [String(b._id), b])
        );
      }

      let rows = [];
      users.forEach((u) => {
        const bDoc = u.branchId
          ? branchMap.get(String(u.branchId)) || null
          : null;
        const branchName =
          bDoc?.branchName || bDoc?.name || (bDoc?.code || "").toString();

        (u.pets || []).forEach((p) => {
          rows.push({
            ...p,
            owner: {
              id: u._id,
              name: u.name,
              username: u.username,
              branchId: u.branchId || null,
              branchName: branchName || null,
            },
            branchId: u.branchId || null,
            branchName: branchName || null,
          });
        });
      });

      if (!wantAll && (bid || bidStr)) {
        rows = rows.filter((r) => {
          if (!r.branchId) return true;
          return String(r.branchId) === String(bid || bidStr);
        });
      }

      if (q) {
        const re = new RegExp(q, "i");
        rows = rows.filter(
          (p) =>
            re.test(p.name) || re.test(p.species || "") || re.test(p.breed || "")
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

/* GET SINGLE PET GET /staff/pets/:ownerId/:petId */
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

      const owner = await User.findById(ownerId)
        .select("name branchId pets")
        .lean();
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok)
        return res.status(403).json({ error: branchCheck.error });

      const pet = (owner.pets || []).find(
        (p) => String(p._id) === String(petId)
      );
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      let branchName = null;
      if (owner.branchId) {
        const b = await Branch.findById(owner.branchId)
          .select("branchName name code")
          .lean();
        if (b) {
          branchName =
            b.branchName || b.name || (b.code || "").toString();
        }
      }

      return res.json({
        ...pet,
        owner: {
          id: ownerId,
          name: owner.name,
          branchId: owner.branchId,
          branchName,
        },
        branchId: owner.branchId,
        branchName,
      });
    } catch (err) {
      console.error("get single pet error", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

/* UPDATE PET
   PUT /staff/pets/:ownerId/:petId */

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
      if (!branchCheck.ok)
        return res.status(403).json({ error: branchCheck.error });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const allowed = [
        "name",
        "species",
        "sex",
        "age",
        "breed",
        "metadata",
        "isArchived",
        "healthStatus",
        "drugAllergies",
      ];

      allowed.forEach((k) => {
        if (req.body[k] !== undefined) {
          pet[k] = req.body[k];
        }
      });

      await owner.save();
      res.json({ message: "อัปเดตสำเร็จ", pet });
    } catch (err) {
      console.error("update pet err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

/* DELETE PET
   DELETE /staff/pets/:ownerId/:petId */

router.delete(
  "/pets/:ownerId/:petId",
  auth,
  role(["branchAdmin", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "id ไม่ถูกต้อง" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok)
        return res.status(403).json({ error: branchCheck.error });

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

/* SEARCH OWNERS
   GET /staff/owners */

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

/* BRANCH LIST FOR DROPDOWN
   GET /staff/branches */

router.get(
  "/branches",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const wantAll = String(req.query.all || "") === "1" && canSeeAll(req);

      const filter = { isActive: { $ne: false } };

      if (!wantAll) {
        const bid = req.user?.branchId;
        if (!bid) {
          return res.status(400).json({ error: "branchId required" });
        }
        filter._id = bid;
      }

      const branches = await Branch.find(filter)
        .select("branchName name code")
        .lean();

      res.json({ data: branches });
    } catch (err) {
      console.error("list branches err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

/* BRANCH DETAIL (ใช้ใน PetDetail)
   GET /staff/branches/:id */

router.get(
  "/branches/:id",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { id } = req.params;
      if (!isOid(id)) {
        return res.status(400).json({ error: "branchId ไม่ถูกต้อง" });
      }

      if (!canSeeAll(req)) {
        const check = assertBranch(req, id);
        if (!check.ok) {
          return res.status(403).json({ error: check.error });
        }
      }

      const branch = await Branch.findById(id)
        .select("branchName name code addressBranch phone")
        .lean();
      if (!branch) {
        return res.status(404).json({ error: "Branch not found" });
      }

      res.json(branch);
    } catch (err) {
      console.error("branch detail err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

module.exports = router;
