// seedVaccines.js
// เติมสต็อกวัคซีนเข้า Branch.medicines สำหรับสาขา 1, 2 และ 3

const mongoose = require("mongoose");
const Branch = require("./models/Branch"); // แก้ path ตามโปรเจกต์จริงได้เลย

// ---- ตั้งค่า Mongo URI ----
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/petClinic";

// ---- ระบุรายชื่อสาขาที่ต้องการเติม (เปลี่ยนชื่อได้ตามจริง) ----
// ลำดับในอาเรย์จะใช้เป็น fallback index หากไม่พบชื่อสาขา
const TARGET_BRANCHES = [
  { branchName: "North Clinic" },
  { branchName: "Central Clinic" },
  { branchName: "South Clinic" },
];

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
      { batchId: "RAB-2025-B", qty: 50, expiryDate: new Date("2026-12-31") },
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

// ---- helper: normalize key for comparison ----
function keyFor(m) {
  return `${(m.medicineName || "").toLowerCase()}___${(m.category || "").toLowerCase()}`;
}

// ---- main seeding logic ----
async function seedForBranch(target, index) {
  // target: { branchName }
  // index: fallback index if name not found
  let branch;
  if (target.branchName) {
    branch = await Branch.findOne({ branchName: target.branchName });
  }

  if (!branch) {
    // fallback: take the nth branch in collection (if exists)
    branch = await Branch.findOne().skip(index).exec();
  }

  if (!branch) {
    // ถ้ายังไม่พบเลย ให้สร้างสาขาใหม่เพื่อไม่ให้ seed หยุด
    console.warn(`⚠️ ไม่พบสาขา '${target.branchName || index}', จะสร้างสาขาใหม่ขึ้นมา`);
    branch = new Branch({ branchName: target.branchName || `Branch ${index + 1}`, medicines: [] });
  }

  console.log(`\n--- Processing branch: ${branch.branchName} (${branch._id ? branch._id.toString() : 'new'}) ---`);

  branch.medicines = branch.medicines || [];
  const existing = branch.medicines;
  const existingKeys = new Set(existing.map((m) => keyFor(m)));

  let added = 0;
  for (const v of vaccineDocs) {
    const k = keyFor(v);
    if (existingKeys.has(k)) {
      console.log('• ข้าม (มีอยู่แล้ว):', v.medicineName);
      continue;
    }
    // push a shallow clone to avoid shared references
    branch.medicines.push(Object.assign({}, v));
    existingKeys.add(k);
    added++;
    console.log('✓ เพิ่ม:', v.medicineName);
  }

  if (added > 0) {
    await branch.save();
    console.log(`✅ บันทึกเรียบร้อยในสาขา '${branch.branchName}' — เพิ่ม ${added} รายการ`);
  } else {
    console.log(`ℹ️ ไม่มีวัคซีนใหม่ให้เพิ่มในสาขา '${branch.branchName}'`);
  }
}

async function main() {
  try {
    console.log("Connecting to MongoDB:", MONGO_URI);
    await mongoose.connect(MONGO_URI);

    for (let i = 0; i < TARGET_BRANCHES.length; i++) {
      const t = TARGET_BRANCHES[i];
      await seedForBranch(t, i);
    }

    console.log('\nAll done.');
  } catch (err) {
    console.error("❌ Seed error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected.");
    process.exit(0);
  }
}

main();
