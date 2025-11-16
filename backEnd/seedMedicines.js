// seedMedicines.js
// เติมสต็อก "ยารักษาโรคทั่วไป" (ไม่ใช่วัคซีน) เข้า Branch.medicines

const mongoose = require("mongoose");
const Branch = require("./models/Branch"); // แก้ path ตามโปรเจ็กต์จริง

// ---- ตั้งค่า Mongo URI ----
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/petClinic";

// ---- ข้อมูลยา (category = Medicine) ----
const medicineDocs = [
  // ===== Antibiotics =====
  {
    medicineName: "Amoxicillin-Clavulanate 250 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 120,
    batches: [
      {
        batchId: "AMOCLAV-250-2025-A",
        qty: 120,
        expiryDate: new Date("2027-01-31"),
      },
    ],
  },
  {
    medicineName: "Cefalexin 250 mg – Dog",
    category: "Medicine",
    unit: "capsule",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 100,
    batches: [
      {
        batchId: "CEF-250-2025-A",
        qty: 100,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName: "Enrofloxacin 50 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      {
        batchId: "ENRO-50-2025-A",
        qty: 80,
        expiryDate: new Date("2026-10-31"),
      },
    ],
  },
  {
    medicineName: "Metronidazole 250 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 90,
    batches: [
      {
        batchId: "METRO-250-2025-A",
        qty: 90,
        expiryDate: new Date("2026-09-30"),
      },
    ],
  },

  // ===== Pain / Anti-inflammatory =====
  {
    medicineName: "Carprofen 25 mg – Dog",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      {
        batchId: "CARP-25-2025-A",
        qty: 80,
        expiryDate: new Date("2027-03-31"),
      },
    ],
  },
  {
    medicineName: "Carprofen 75 mg – Dog",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 60,
    batches: [
      {
        batchId: "CARP-75-2025-A",
        qty: 60,
        expiryDate: new Date("2027-03-31"),
      },
    ],
  },
  {
    medicineName: "Meloxicam 1.5 mg/ml Oral Suspension – Dog",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 50,
    manufacturer: "VetCare",
    stock: 250,
    batches: [
      {
        batchId: "MELO-1_5-2025-A",
        qty: 250,
        expiryDate: new Date("2027-02-28"),
      },
    ],
  },
  {
    medicineName: "Prednisolone 5 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 100,
    batches: [
      {
        batchId: "PRED-5-2025-A",
        qty: 100,
        expiryDate: new Date("2026-11-30"),
      },
    ],
  },

  // ===== GI / Anti-emetic =====
  {
    medicineName: "Omeprazole 10 mg – Dog/Cat",
    category: "Medicine",
    unit: "capsule",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      {
        batchId: "OME-10-2025-A",
        qty: 80,
        expiryDate: new Date("2026-10-31"),
      },
    ],
  },
  {
    medicineName: "Maropitant (Cerenia) 10 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 40,
    batches: [
      {
        batchId: "MARO-10-2025-A",
        qty: 40,
        expiryDate: new Date("2026-09-30"),
      },
    ],
  },
  {
    medicineName: "Electrolyte Oral Solution – Dog/Cat",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 100,
    manufacturer: "VetCare",
    stock: 500,
    batches: [
      {
        batchId: "ELECTRO-2025-A",
        qty: 500,
        expiryDate: new Date("2026-08-31"),
      },
    ],
  },

  // ===== Dewormer / Parasite control =====
  {
    medicineName: "Praziquantel 50 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      {
        batchId: "PRAZ-50-2025-A",
        qty: 80,
        expiryDate: new Date("2027-01-31"),
      },
    ],
  },
  {
    medicineName: "Pyrantel Pamoate Oral Suspension – Puppy/Kitten",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 50,
    manufacturer: "VetCare",
    stock: 200,
    batches: [
      {
        batchId: "PYRA-2025-A",
        qty: 200,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName: "Milbemycin Oxime + Praziquantel – Dog",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 60,
    batches: [
      {
        batchId: "MILB-PRAZ-2025-A",
        qty: 60,
        expiryDate: new Date("2027-04-30"),
      },
    ],
  },
  {
    medicineName: "Fipronil Spot-on – Dog 10–20 kg",
    category: "Medicine",
    unit: "pipette",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 40,
    batches: [
      {
        batchId: "FIPRO-DOG-M-2025-A",
        qty: 40,
        expiryDate: new Date("2026-10-31"),
      },
    ],
  },
  {
    medicineName: "Fipronil Spot-on – Cat",
    category: "Medicine",
    unit: "pipette",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 40,
    batches: [
      {
        batchId: "FIPRO-CAT-2025-A",
        qty: 40,
        expiryDate: new Date("2026-10-31"),
      },
    ],
  },

  // ===== Allergy / Skin / Ear / Eye =====
  {
    medicineName: "Chlorpheniramine 4 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 120,
    batches: [
      {
        batchId: "CPM-4-2025-A",
        qty: 120,
        expiryDate: new Date("2026-09-30"),
      },
    ],
  },
  {
    medicineName: "Ear Drops (Gentamicin + Clotrimazole + Betamethasone)",
    category: "Medicine",
    unit: "bottle",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 30,
    batches: [
      {
        batchId: "EAR-GCB-2025-A",
        qty: 30,
        expiryDate: new Date("2026-08-31"),
      },
    ],
  },
  {
    medicineName: "Eye Drops (Chloramphenicol)",
    category: "Medicine",
    unit: "bottle",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 30,
    batches: [
      {
        batchId: "EYE-CHLOR-2025-A",
        qty: 30,
        expiryDate: new Date("2026-07-31"),
      },
    ],
  },
  {
    medicineName: "Skin Ointment (Miconazole + Hydrocortisone)",
    category: "Medicine",
    unit: "tube",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 25,
    batches: [
      {
        batchId: "SKIN-MH-2025-A",
        qty: 25,
        expiryDate: new Date("2026-09-30"),
      },
    ],
  },

  // ===== Fluids / Injectables =====
  {
    medicineName: "Lactated Ringer’s Solution",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 500,
    manufacturer: "VetCare",
    stock: 2000,
    batches: [
      {
        batchId: "LR-2025-A",
        qty: 2000,
        expiryDate: new Date("2027-01-31"),
      },
    ],
  },
  {
    medicineName: "0.9% Sodium Chloride (Normal Saline)",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 500,
    manufacturer: "VetCare",
    stock: 2000,
    batches: [
      {
        batchId: "NS-2025-A",
        qty: 2000,
        expiryDate: new Date("2027-01-31"),
      },
    ],
  },
  {
    medicineName: "Vitamin B-Complex Injection",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 100,
    manufacturer: "VetCare",
    stock: 500,
    batches: [
      {
        batchId: "VB-2025-A",
        qty: 500,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },

  // ===== Sedation / Misc =====
  {
    medicineName: "Butorphanol 10 mg/ml Injection",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 100,
    batches: [
      {
        batchId: "BUTOR-2025-A",
        qty: 100,
        expiryDate: new Date("2026-11-30"),
      },
    ],
  },
  {
    medicineName: "Acepromazine 2 mg/ml Injection",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 100,
    batches: [
      {
        batchId: "ACE-2025-A",
        qty: 100,
        expiryDate: new Date("2026-11-30"),
      },
    ],
  },
];

// ---- main seeding logic ----
async function main() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);

    // หา branch เป้าหมาย
    let branch = await Branch.findOne({ branchName: "North Clinic" });
    if (!branch) {
      console.warn(
        '⚠️ ไม่พบสาขา "North Clinic" จะใช้สาขาแรกในระบบแทน (ถ้ามี)'
      );
      branch = await Branch.findOne({});
    }

    if (!branch) {
      console.error("❌ ไม่พบ branch ในฐานข้อมูลเลย หยุดทำงาน");
      process.exit(1);
    }

    console.log("Using branch:", branch.branchName, branch._id.toString());

    const existing = branch.medicines || [];
    let added = 0;

    for (const v of medicineDocs) {
      const found = existing.find(
        (m) =>
          (m.medicineName || "").toLowerCase() ===
            v.medicineName.toLowerCase() &&
          (m.category || "").toLowerCase() === v.category.toLowerCase()
      );
      if (found) {
        console.log("• ข้าม (มีอยู่แล้ว):", v.medicineName);
        continue;
      }
      branch.medicines.push(v);
      added++;
      console.log("✓ เพิ่ม:", v.medicineName);
    }

    if (added > 0) {
      await branch.save();
      console.log(`✅ บันทึกเรียบร้อย เพิ่มใหม่ทั้งหมด ${added} รายการ`);
    } else {
      console.log("ℹ️ ไม่มี Medicine ใหม่ให้เพิ่ม (รายการทั้งหมดมีอยู่แล้ว)");
    }
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

main();
