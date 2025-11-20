// seedVaccines.js
// เติมสต็อกวัคซีนเข้า Branch.medicines สำหรับสาขา 1

const mongoose = require("mongoose");
const Branch = require("./models/Branch");
 // แก้ path ตามโปรเจกต์จริงได้เลย

// ---- ตั้งค่า Mongo URI ----
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/petClinic";

// ---- ข้อมูลวัคซีนทั้งหมด (ตาม VACCINE_OPTIONS) ----
const vaccineDocs = [
  {
    medicineName: "Rabies – Dog/Cat",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 50,
    batches: [
      { batchId: "RAB-2025-A", qty: 50, expiryDate: new Date("2026-12-31") },
    ],
  },
  {
    medicineName: "DHPP (Distemper, Hepatitis, Parvo, Parainfluenza) – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 40,
    batches: [
      { batchId: "DHPP-2025-A", qty: 40, expiryDate: new Date("2026-11-30") },
    ],
  },
  {
    medicineName: "DA2PP (Distemper, Adenovirus, Parvo, Parainfluenza) – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 40,
    batches: [
      { batchId: "DA2PP-2025-A", qty: 40, expiryDate: new Date("2026-11-30") },
    ],
  },
  {
    medicineName: "DA2PP + Leptospirosis – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 30,
    batches: [
      {
        batchId: "DA2PP-LEP-2025-A",
        qty: 30,
        expiryDate: new Date("2026-10-15"),
      },
    ],
  },
  {
    medicineName: "Bordetella (Kennel Cough) – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 30,
    batches: [
      {
        batchId: "BORD-DOG-2025-A",
        qty: 30,
        expiryDate: new Date("2026-09-30"),
      },
    ],
  },
  {
    medicineName: "Leptospirosis – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 30,
    batches: [
      {
        batchId: "LEPTO-2025-A",
        qty: 30,
        expiryDate: new Date("2026-09-10"),
      },
    ],
  },
  {
    medicineName: "Lyme Disease – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "LYME-2025-A",
        qty: 20,
        expiryDate: new Date("2026-08-15"),
      },
    ],
  },
  {
    medicineName: "Canine Influenza – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "CIV-2025-A",
        qty: 20,
        expiryDate: new Date("2026-07-10"),
      },
    ],
  },
  {
    medicineName: "Parvovirus Only – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "PARVO-2025-A",
        qty: 20,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName: "Distemper Only – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "DISTEMPER-2025-A",
        qty: 20,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName:
      "FVRCP (Rhinotracheitis, Calicivirus, Panleukopenia) – Cat",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 40,
    batches: [
      {
        batchId: "FVRCP-2025-A",
        qty: 40,
        expiryDate: new Date("2026-10-01"),
      },
    ],
  },
  {
    medicineName: "Feline Leukemia (FeLV) – Cat",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 30,
    batches: [
      {
        batchId: "FELV-2025-A",
        qty: 30,
        expiryDate: new Date("2026-09-01"),
      },
    ],
  },
  {
    medicineName: "Feline Immunodeficiency (FIV) – Cat",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "FIV-2025-A",
        qty: 20,
        expiryDate: new Date("2026-08-01"),
      },
    ],
  },
  {
    medicineName: "Bordetella – Cat",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "BORD-CAT-2025-A",
        qty: 20,
        expiryDate: new Date("2026-11-01"),
      },
    ],
  },
  {
    medicineName: "Chlamydia (Chlamydophila felis) – Cat",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "CHLAM-2025-A",
        qty: 20,
        expiryDate: new Date("2026-10-15"),
      },
    ],
  },
  {
    medicineName: "Puppy Combo (DHPP + Lepto)",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "PUPPY-2025-A",
        qty: 20,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName: "Kitten Combo (FVRCP + FeLV)",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "KITTEN-2025-A",
        qty: 20,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName: "Canine Coronavirus – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "CCV-2025-A",
        qty: 20,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
  {
    medicineName: "Giardia – Dog",
    category: "Vaccine",
    unit: "dose",
    lowStockThreshold: 10,
    manufacturer: "VetCare",
    stock: 20,
    batches: [
      {
        batchId: "GIARDIA-2025-A",
        qty: 20,
        expiryDate: new Date("2026-12-31"),
      },
    ],
  },
];

// ---- main seeding logic ----
async function main() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);

    // หา branch เป้าหมาย: ใช้จากชื่อ หรือใช้ตัวแรกของ collection
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

    // กันการซ้ำ: ถ้ามี medicineName ตรงกันแล้วจะไม่เพิ่มซ้ำ
    let added = 0;
    for (const v of vaccineDocs) {
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
      console.log("ℹ️ ไม่มีวัคซีนใหม่ให้เพิ่ม (รายการทั้งหมดมีอยู่แล้ว)");
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
