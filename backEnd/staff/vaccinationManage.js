const express = require("express");
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const role = require("../middleware/role");
const { assertBranch, canSeeAll } = require("../middleware/scope");
const User = require("../models/User");
const Branch = require("../models/Branch");
const Notification = (() => {
  try {
    return require("../models/Notification");
  } catch (e) {
    return null;
  }
})();

const router = express.Router();
const isOid = (v) => mongoose.isValidObjectId(String(v || ""));

function toDateOrNull(v, fieldName) {
  if (v == null) return null;
  const d = new Date(v);
  if (isNaN(d.getTime())) {
    const err = new Error(`${fieldName} ไม่ถูกต้อง`);
    err.statusCode = 400;
    throw err;
  }
  return d;
}

/**
 * ตัดสต็อกจาก Branch.medicines แบบ FIFO ตาม expiryDate
 * คืน snapshot สำหรับเก็บใน vaccination
 */
async function deductStock(branchDoc, medicineId, qtyUsed) {
  if (!branchDoc || !medicineId) return null;

  const useQty = Number(qtyUsed || 0);
  if (useQty <= 0) return null;

  const med = branchDoc.medicines.id(medicineId);
  if (!med) {
    const err = new Error("ไม่พบรายการยา/วัคซีนในสาขา");
    err.statusCode = 400;
    throw err;
  }

  const currentStock = Number(med.stock || 0);
  if (currentStock < useQty) {
    const err = new Error("สต็อกไม่เพียงพอ");
    err.statusCode = 400;
    throw err;
  }

  const batches = med.batches || [];
  // FIFO: batch หมดอายุก่อน ใช้ก่อน
  batches.sort((a, b) => {
    const ea = a.expiryDate ? new Date(a.expiryDate).getTime() : Infinity;
    const eb = b.expiryDate ? new Date(b.expiryDate).getTime() : Infinity;
    return ea - eb;
  });

  let remain = useQty;
  let firstBatchUsed = null;

  for (const bt of batches) {
    if (!bt || bt.qty <= 0) continue;
    if (remain <= 0) break;

    const take = Math.min(bt.qty, remain);
    if (take <= 0) continue;

    if (!firstBatchUsed) {
      firstBatchUsed = bt;
    }

    bt.qty -= take;
    remain -= take;
  }

  // กันเคสไม่มี batch แต่ stock โดยรวมพอ
  if ((!batches.length || !firstBatchUsed) && currentStock >= useQty) {
    remain = 0;
  }

  if (remain > 0) {
    const err = new Error("สต็อกใน batch ไม่เพียงพอ");
    err.statusCode = 400;
    throw err;
  }

  med.stock = currentStock - useQty;

  const threshold =
    typeof med.lowStockThreshold === "number" ? med.lowStockThreshold : 0;
  med.lowStockAlert = threshold > 0 && med.stock <= threshold;

  branchDoc.markModified("medicines");
  await branchDoc.save();

  return firstBatchUsed
    ? {
        batchId: firstBatchUsed.batchId || null,
        expiryDate: firstBatchUsed.expiryDate || null,
        medicineName: med.medicineName,
      }
    : {
        batchId: null,
        expiryDate: null,
        medicineName: med.medicineName,
      };
}

// POST /api/staff/vaccinations/:ownerId/:petId
router.post(
  "/:ownerId/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const branchId = canSeeAll(req)
        ? req.body.branchId || owner.branchId || req.user.branchId
        : req.user.branchId;

      if (!branchId) return res.status(400).json({ error: "branchId missing" });

      const branchCheck = assertBranch(req, branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const branch = await Branch.findById(branchId);
      if (!branch) return res.status(404).json({ error: "Branch not found" });

      const vaccineTypeRaw = (
        req.body.vaccineType ||
        req.body.vaccineName ||
        ""
      )
        .toString()
        .trim();
      if (!vaccineTypeRaw) {
        return res.status(400).json({ error: "vaccineType required" });
      }

      const dateGiven = req.body.dateGiven
        ? toDateOrNull(req.body.dateGiven, "dateGiven")
        : new Date();
      const nextDueDate = req.body.nextDueDate
        ? toDateOrNull(req.body.nextDueDate, "nextDueDate")
        : null;

      const doseQty = Number(req.body.doseQty || 1);

      let stockSnapshot = null;
      let finalMedicineId = null;

      const bodyMedId = req.body.medicineId;
      const hasMedicineId = bodyMedId && isOid(bodyMedId);

      // กรณีเลือก medicineId จาก stock โดยตรง
      if (hasMedicineId && doseQty > 0) {
        stockSnapshot = await deductStock(branch, bodyMedId, doseQty);
        finalMedicineId = bodyMedId;
      } else {
        // ไม่ได้ส่ง medicineId → พยายาม match ชื่อกับ medicine category='vaccine'
        const needle = vaccineTypeRaw.toLowerCase();
        const candidate = (branch.medicines || []).find((m) => {
          const name = (m.medicineName || "").toLowerCase();
          const cat = (m.category || "").toLowerCase();
          return cat === "vaccine" && name.includes(needle);
        });

        if (candidate && doseQty > 0) {
          stockSnapshot = await deductStock(branch, candidate._id, doseQty);
          finalMedicineId = candidate._id;
        }
      }

      const v = {
        branchId,
        medicineId: finalMedicineId,
        medicineNameSnapshot:
          (stockSnapshot && stockSnapshot.medicineName) ||
          req.body.vaccineName ||
          vaccineTypeRaw,
        vaccineType: vaccineTypeRaw,
        doseQty,
        batch:
          (stockSnapshot && stockSnapshot.batchId) ||
          req.body.batch ||
          null,
        note: req.body.note || "",
        expiryDate:
          (stockSnapshot && stockSnapshot.expiryDate) ||
          (req.body.expiryDate
            ? toDateOrNull(req.body.expiryDate, "expiryDate")
            : null),
        dateGiven,
        nextDueDate,
        staffId: req.user.id || null,
        attachments: Array.isArray(req.body.attachments)
          ? req.body.attachments
          : [],
      };

      pet.vaccinations.push(v);
      await owner.save();

      const newVac = pet.vaccinations[pet.vaccinations.length - 1];

      if (newVac.nextDueDate && Notification) {
        try {
          await Notification.create({
            userId: owner._id,
            message: `นัดฉีดวัคซีนของ ${pet.name} กำหนดวันที่ ${newVac.nextDueDate.toISOString()}`,
            type: "vaccine",
            data: { petId: pet._id, nextDueDate: newVac.nextDueDate },
          });
        } catch (e) {
          console.warn("notif failed", e);
        }
      }

      res.status(201).json(newVac);
    } catch (err) {
      console.error("add vaccination err", err);
      const code = err.statusCode || 500;
      res.status(code).json({ error: err.message || "SERVER_ERROR" });
    }
  }
);

// GET /api/staff/vaccinations/:ownerId/:petId
router.get(
  "/:ownerId/:petId",
  auth,
  role(["staff", "branchAdmin", "doctor", "superAdmin"]),
  async (req, res) => {
    try {
      const { ownerId, petId } = req.params;
      if (!isOid(ownerId) || !isOid(petId)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }

      const owner = await User.findById(ownerId)
        .select("pets name branchId")
        .lean();
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const pet = (owner.pets || []).find(
        (p) => String(p._id) === String(petId)
      );
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const vaccinations = (pet.vaccinations || []).sort(
        (a, b) => new Date(b.dateGiven) - new Date(a.dateGiven)
      );

      res.json({
        pet: { id: pet._id, name: pet.name },
        owner: { id: owner._id, name: owner.name },
        vaccinations,
      });
    } catch (err) {
      console.error("get vacs err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// GET /api/staff/vaccinations
router.get(
  "/",
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

        const users = await User.find({ branchId })
          .select("username name pets")
          .lean();

        const rows = [];
        users.forEach((u) => {
          (u.pets || []).forEach((p) => {
            (p.vaccinations || []).forEach((v) => {
              if (!v) return;
              if (!v.branchId || String(v.branchId) === String(branchId)) {
                rows.push({
                  vaccination: v,
                  pet: { id: p._id, name: p.name },
                  owner: {
                    id: u._id,
                    username: u.username,
                    name: u.name,
                  },
                });
              }
            });
          });
        });

        rows.sort(
          (a, b) =>
            new Date(b.vaccination.dateGiven) -
            new Date(a.vaccination.dateGiven)
        );

        return res.json({
          scope: "branch",
          branchId,
          total: rows.length,
          data: rows,
        });
      }

      const usersAll = await User.find({})
        .select("username name pets branchId")
        .lean();

      const rowsAll = [];
      usersAll.forEach((u) => {
        (u.pets || []).forEach((p) => {
          (p.vaccinations || []).forEach((v) => {
            if (!v) return;
            rowsAll.push({
              vaccination: v,
              pet: { id: p._id, name: p.name },
              owner: {
                id: u._id,
                username: u.username,
                name: u.name,
              },
              branchId: u.branchId || null,
            });
          });
        });
      });

      rowsAll.sort(
        (a, b) =>
          new Date(b.vaccination.dateGiven) -
          new Date(a.vaccination.dateGiven)
      );

      return res.json({ scope: "all", total: rowsAll.length, data: rowsAll });
    } catch (err) {
      console.error("list vacs err", err);
      res.status(500).json({ error: "SERVER_ERROR" });
    }
  }
);

// DELETE /api/staff/vaccinations/:ownerId/:petId/:vacId
router.delete(
  "/:ownerId/:petId/:vacId",
  auth,
  role(["branchAdmin", "doctor"]),
  async (req, res) => {
    try {
      const { ownerId, petId, vacId } = req.params;

      const isOidLocal = (v) => mongoose.isValidObjectId(String(v || ""));
      if (![ownerId, petId, vacId].every(isOidLocal)) {
        return res.status(400).json({ error: "Invalid id(s)" });
      }

      const owner = await User.findById(ownerId);
      if (!owner) return res.status(404).json({ error: "Owner not found" });

      const branchCheck = assertBranch(req, owner.branchId);
      if (!branchCheck.ok) {
        return res.status(403).json({ error: branchCheck.error });
      }

      const pet = owner.pets.id(petId);
      if (!pet) return res.status(404).json({ error: "Pet not found" });

      const idx = (pet.vaccinations || []).findIndex(
        (v) => String(v._id) === String(vacId)
      );
      if (idx === -1) {
        return res.status(404).json({ error: "Vaccination not found" });
      }

      pet.vaccinations.splice(idx, 1);
      await owner.save();

      return res.json({ message: "Deleted", id: vacId });
    } catch (err) {
      console.error("delete vaccination err:", err);
      return res.status(500).json({ error: err.message || "SERVER_ERROR" });
    }
  }
);

module.exports = router;
