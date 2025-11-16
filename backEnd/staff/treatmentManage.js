const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { assertBranch, canSeeAll } = require("../middleware/scope");
const User = require("../models/User");
const Branch = require("../models/Branch");

const router = express.Router();
const isOid = (v) => mongoose.isValidObjectId(String(v || ""));

// helper: doctor
async function resolveDoctor({ req, branchId, fallbackExistingDoctorId }) {
  const actor = req.user || {};
  const actorRole = String(actor.role || "").toLowerCase();

  // ถ้าเป็นหมอ → auto ใช้ตัวเอง
  if (actorRole === "doctor") {
    return {
      doctorId: actor.id || actor._id,
      doctorName: actor.name || null,
    };
  }

  // ไม่ใช่หมอ ต้องเลือกหมอเอง
  const rawId = req.body.doctorId || req.body.staffId || fallbackExistingDoctorId;
  if (!rawId) throw new Error("DOCTOR_REQUIRED");
  if (!isOid(rawId)) throw new Error("DOCTOR_INVALID");

  const doctor = await User.findOne({
    _id: rawId,
    role: "doctor",
    isActive: true,
    $or: [
      { branchId: branchId },
      { "doctorProfile.availableBranches": branchId },
    ],
  });

  if (!doctor) throw new Error("DOCTOR_NOT_IN_BRANCH");

  return {
    doctorId: doctor._id,
    doctorName: doctor.name || null,
  };
}

// helper: ดึง list ยาจาก body (รองรับหลายยา + fallback แบบเก่า) 
function extractMedicineUsages(body) {
  const list = Array.isArray(body.medicines) ? body.medicines : [];

  const mapped = list
    .map((m) => {
      const id = m.medicineId || m._id;
      const name = m.medicineNameSnapshot || m.medicineName || "";
      const qty = Number(m.quantityUsed ?? m.qty ?? 0) || 0; // เริ่มจาก 0
      if (!id || !name || qty <= 0) return null; // ไม่เอา record ที่ qty <= 0
      return { medicineId: id, medicineNameSnapshot: name, quantityUsed: qty };
    })
    .filter(Boolean);

  // fallback single field แบบเก่า
  if (!mapped.length && body.medicineId && body.medicineNameSnapshot) {
    const qty = Number(body.quantityUsed || 0) || 0;
    if (qty > 0) {
      mapped.push({
        medicineId: body.medicineId,
        medicineNameSnapshot: body.medicineNameSnapshot,
        quantityUsed: qty,
      });
    }
  }

  return mapped;
}

// helper: low stock flag 
function updateLowStockFlag(medDoc) {
  if (!medDoc) return;
  if ((medDoc.stock || 0) <= (medDoc.lowStockThreshold ?? 5)) {
    medDoc.lowStockAlert = true;
  } else {
    medDoc.lowStockAlert = false;
  }
}

// CREATE TREATMENT 
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
        attachments,
        treatmentDate,
      } = req.body;

      // doctor 
      let doctorInfo;
      try {
        doctorInfo = await resolveDoctor({ req, branchId });
      } catch (e) {
        if (e.message === "DOCTOR_REQUIRED") {
          return res
            .status(400)
            .json({ error: "Doctor is required for this treatment" });
        }
        if (e.message === "DOCTOR_INVALID") {
          return res.status(400).json({ error: "Invalid doctor id" });
        }
        if (e.message === "DOCTOR_NOT_IN_BRANCH") {
          return res
            .status(400)
            .json({ error: "Doctor must belong to this branch" });
        }
        throw e;
      }

      // medicines: หลายตัว 
      const medUsages = extractMedicineUsages(req.body);

      // allergy check
      for (const mu of medUsages) {
        const allergy = owner.hasPetAllergy(petId, mu.medicineNameSnapshot);
        if (allergy.matched) {
          return res.status(400).json({
            error: `Pet has allergy to ${mu.medicineNameSnapshot}`,
            entries: allergy.entries,
          });
        }
      }

      // ปรับ stock ตามยาที่ใช้
      for (const mu of medUsages) {
        if (!mu.medicineId || !isOid(mu.medicineId)) continue;
        const med = branch.medicines.id(mu.medicineId);
        if (!med) {
          return res
            .status(404)
            .json({ error: "Medicine not found in branch" });
        }
        const useQty = Math.max(0, Number(mu.quantityUsed) || 1);
        med.stock = Math.max(0, (med.stock || 0) - useQty);
        updateLowStockFlag(med);
      }
      if (medUsages.length) {
        await branch.save();
      }

      const sanitizedMeds = medUsages.map((m) => ({
        medicineId: m.medicineId,
        medicineNameSnapshot: m.medicineNameSnapshot,
        quantityUsed: Number(m.quantityUsed) || 1,
      }));
      const primary = sanitizedMeds[0] || {};

      const treat = {
        symptoms: symptoms || null,
        diagnosis: diagnosis || null,
        notes: notes || null,

        branchId,
        branchNameSnapshot: branch.branchName || branch.name || null,

        staffId: doctorInfo.doctorId,
        doctorNameSnapshot: doctorInfo.doctorName,

        medicines: sanitizedMeds,

        // เก็บตัวแรกซ้ำไว้ 
        medicineId: primary.medicineId || null,
        medicineNameSnapshot: primary.medicineNameSnapshot || null,
        quantityUsed: primary.quantityUsed || 1,

        treatmentDate: treatmentDate ? new Date(treatmentDate) : new Date(),
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

// LIST TREATMENTS BY PET 
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

// UPDATE TREATMENT 
// PUT /api/staff/treatments/:ownerId/:petId/:treatId
router.put(
  "/treatments/:ownerId/:petId/:treatId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId, treatId } = req.params;
      if (!isOid(ownerId) || !isOid(petId) || !isOid(treatId)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const treat = pet.treatments.id(treatId);
      if (!treat) return res.status(404).json({ error: "Treatment not found" });

      const branchId = treat.branchId || owner.branchId || req.user.branchId;
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
        attachments,
        treatmentDate,
      } = req.body;

      // doctor (ใช้คนเดิมถ้าไม่ส่งมาใหม่) 
      let doctorInfo;
      try {
        doctorInfo = await resolveDoctor({
          req,
          branchId,
          fallbackExistingDoctorId: treat.staffId,
        });
      } catch (e) {
        if (e.message === "DOCTOR_REQUIRED") {
          return res
            .status(400)
            .json({ error: "Doctor is required for this treatment" });
        }
        if (e.message === "DOCTOR_INVALID") {
          return res.status(400).json({ error: "Invalid doctor id" });
        }
        if (e.message === "DOCTOR_NOT_IN_BRANCH") {
          return res
            .status(400)
            .json({ error: "Doctor must belong to this branch" });
        }
        throw e;
      }

      // medicines: คำนวณเก่า-ใหม่
      const oldMeds =
        Array.isArray(treat.medicines) && treat.medicines.length
          ? treat.medicines.map((m) => ({
              medicineId: m.medicineId,
              quantityUsed: Number(m.quantityUsed) || 1,
            }))
          : treat.medicineId
          ? [
              {
                medicineId: treat.medicineId,
                quantityUsed: Number(treat.quantityUsed || 1) || 1,
              },
            ]
          : [];

      const newMedUsages = extractMedicineUsages(req.body);

      // allergy check (ยาใหม่)
      for (const mu of newMedUsages) {
        const allergy = owner.hasPetAllergy(petId, mu.medicineNameSnapshot);
        if (allergy.matched) {
          return res.status(400).json({
            error: `Pet has allergy to ${mu.medicineNameSnapshot}`,
            entries: allergy.entries,
          });
        }
      }

      // คืน stock เก่าทั้งหมด
      for (const om of oldMeds) {
        if (!om.medicineId || !isOid(om.medicineId)) continue;
        const med = branch.medicines.id(om.medicineId);
        if (!med) continue;
        med.stock = (med.stock || 0) + (Number(om.quantityUsed) || 0);
        updateLowStockFlag(med);
      }

      // หัก stock ใหม่
      for (const nm of newMedUsages) {
        if (!nm.medicineId || !isOid(nm.medicineId)) continue;
        const med = branch.medicines.id(nm.medicineId);
        if (!med) {
          return res
            .status(404)
            .json({ error: "Medicine not found in branch" });
        }
        const useQty = Math.max(0, Number(nm.quantityUsed) || 1);
        med.stock = Math.max(0, (med.stock || 0) - useQty);
        updateLowStockFlag(med);
      }

      if (oldMeds.length || newMedUsages.length) {
        await branch.save();
      }

      const sanitizedMeds = newMedUsages.map((m) => ({
        medicineId: m.medicineId,
        medicineNameSnapshot: m.medicineNameSnapshot,
        quantityUsed: Number(m.quantityUsed) || 1,
      }));
      const primary = sanitizedMeds[0] || {};

      // update fields 
      treat.symptoms = symptoms || null;
      treat.diagnosis = diagnosis || null;
      treat.notes = notes || null;

      treat.branchId = branchId;
      treat.branchNameSnapshot = branch.branchName || branch.name || null;

      treat.staffId = doctorInfo.doctorId;
      treat.doctorNameSnapshot = doctorInfo.doctorName;

      treat.medicines = sanitizedMeds;
      treat.medicineId = primary.medicineId || null;
      treat.medicineNameSnapshot = primary.medicineNameSnapshot || null;
      treat.quantityUsed = primary.quantityUsed || 1;

      if (treatmentDate) {
        treat.treatmentDate = new Date(treatmentDate);
      }
      if (Array.isArray(attachments)) {
        treat.attachments = attachments;
      }

      await owner.save();
      return res.json(treat);
    } catch (err) {
      console.error("update treatment err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// DELETE TREATMENT 
router.delete(
  "/treatments/:ownerId/:petId/:treatId",
  auth,
  role(["branchAdmin", "doctor"]),
  async (req, res) => {
    try {
      const { ownerId, petId, treatId } = req.params;
      if (!isOid(ownerId) || !isOid(petId) || !isOid(treatId)) {
        return res.status(400).json({ error: "Invalid id" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const chk = assertBranch(req, owner.branchId);
      if (!chk.ok) return res.status(403).json({ error: chk.error });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const treat = pet.treatments.id(treatId);
      if (!treat) {
        return res.status(404).json({ error: "Treatment not found" });
      }

      treat.deleteOne();
      await owner.save();

      return res.json({ message: "ลบประวัติการรักษาเรียบร้อย" });
    } catch (err) {
      console.error("delete treatment err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

module.exports = router;
