// backEnd/staff/treatmentManage.js
const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { assertBranch, canSeeAll } = require("../middleware/scope");
const User = require("../models/User");
const Branch = require("../models/Branch");

const router = express.Router();
const isOid = (v) => mongoose.isValidObjectId(String(v || ""));

// ===================== CREATE TREATMENT =====================
// POST /api/staff/treatments/:ownerId/:petId
router.post(
  "/treatments/:ownerId/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      // เลือก branchId
      const branchId = canSeeAll(req)
        ? req.body.branchId || owner.branchId || req.user.branchId
        : req.user.branchId;

      if (!branchId) {
        return res.status(400).json({ error: "branchId required" });
      }

      const chk = assertBranch(req, branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      const {
        symptoms,
        diagnosis,
        notes,
        medicineId,
        medicineNameSnapshot,
        quantityUsed = 1,
        staffId,
        attachments,
        treatmentDate,
      } = req.body;

      // allergy check
      if (medicineNameSnapshot) {
        const allergy = owner.hasPetAllergy(petId, medicineNameSnapshot);
        if (allergy.matched) {
          return res
            .status(400)
            .json({ error: "Pet has allergy", entries: allergy.entries });
        }
      }

      // ลดสต็อกถ้าเลือกยา
      if (medicineId && isOid(medicineId)) {
        const med = branch.medicines.id(medicineId);
        if (!med) {
          return res
            .status(404)
            .json({ error: "Medicine not found in branch" });
        }

        const useQty = Math.max(
          0,
          Number.isFinite(+quantityUsed) ? +quantityUsed : 1
        );

        med.stock = Math.max(0, (med.stock || 0) - useQty);
        if ((med.stock || 0) <= (med.lowStockThreshold ?? 5)) {
          med.lowStockAlert = true;
        }

        await branch.save();
      }

      const treat = {
        symptoms: symptoms || null,
        diagnosis: diagnosis || null,
        notes: notes || null,
        branchId,
        medicineId: medicineId || null,
        medicineNameSnapshot: medicineNameSnapshot || null,
        quantityUsed: Number.isFinite(+quantityUsed) ? +quantityUsed : 1,
        treatmentDate: treatmentDate ? new Date(treatmentDate) : new Date(),
        staffId: staffId || req.user?.id || null,
        attachments: Array.isArray(attachments) ? attachments : [],
      };

      pet.treatments.push(treat);
      await owner.save();

      const newTreat = pet.treatments[pet.treatments.length - 1];
      return res.status(201).json(newTreat);
    } catch (err) {
      console.error("add treatment err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// ===================== LIST TREATMENTS BY PET =====================
// GET /api/staff/treatments/:ownerId/:petId
router.get(
  "/treatments/:ownerId/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const owner = await User.findById(ownerId)
        .select("pets name branchId")
        .lean();
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const chk = assertBranch(req, owner.branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });

      const pet = (owner.pets || []).find(
        (p) => String(p._id) === String(petId)
      );
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const treatments = (pet.treatments || [])
        .slice()
        .sort(
          (a, b) => new Date(b.treatmentDate) - new Date(a.treatmentDate)
        );

      return res.json({
        pet: { id: pet._id, name: pet.name },
        owner: { id: owner._id, name: owner.name, branchId: owner.branchId },
        treatments,
      });
    } catch (err) {
      console.error("list treatments err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

module.exports = router;
