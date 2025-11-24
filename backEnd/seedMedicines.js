// seedMedicines.js
// เติมสต็อก "ยารักษาโรคทั่วไป" (category = Medicine) เข้า Branch.medicines
// รองรับหลายสาขา (สาขา 1,2,3) ใช้วิธีเดียวกับ seedVaccines.js

const mongoose = require("mongoose");
const Branch = require("./models/Branch"); // แก้ path ตามโปรเจ็กต์จริง

// ---- ตั้งค่า Mongo URI ----
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/petClinic";

// ---- ระบุรายชื่อสาขาที่ต้องการเติม (เปลี่ยนชื่อได้ตามจริง) ----
const TARGET_BRANCHES = [
  { branchName: "North Clinic" },
  { branchName: "Central Clinic" },
  { branchName: "South Clinic" },
];

// ---- ข้อมูลยา (category = Medicine) ----
const medicineDocs = [
  {
    medicineName: "Amoxicillin-Clavulanate 250 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 120,
    batches: [
      { batchId: "AMOCLAV-250-2025-A", qty: 120, expiryDate: new Date("2027-01-31") },
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
      { batchId: "CEF-250-2025-A", qty: 100, expiryDate: new Date("2026-12-31") },
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
      { batchId: "ENRO-50-2025-A", qty: 80, expiryDate: new Date("2026-10-31") },
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
      { batchId: "METRO-250-2025-A", qty: 90, expiryDate: new Date("2026-09-30") },
    ],
  },
  {
    medicineName: "Carprofen 25 mg – Dog",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      { batchId: "CARP-25-2025-A", qty: 80, expiryDate: new Date("2027-03-31") },
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
      { batchId: "CARP-75-2025-A", qty: 60, expiryDate: new Date("2027-03-31") },
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
      { batchId: "MELO-1_5-2025-A", qty: 250, expiryDate: new Date("2027-02-28") },
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
      { batchId: "PRED-5-2025-A", qty: 100, expiryDate: new Date("2026-11-30") },
    ],
  },
  {
    medicineName: "Omeprazole 10 mg – Dog/Cat",
    category: "Medicine",
    unit: "capsule",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      { batchId: "OME-10-2025-A", qty: 80, expiryDate: new Date("2026-10-31") },
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
      { batchId: "MARO-10-2025-A", qty: 40, expiryDate: new Date("2026-09-30") },
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
      { batchId: "ELECTRO-2025-A", qty: 500, expiryDate: new Date("2026-08-31") },
    ],
  },
  {
    medicineName: "Praziquantel 50 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 80,
    batches: [
      { batchId: "PRAZ-50-2025-A", qty: 80, expiryDate: new Date("2027-01-31") },
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
      { batchId: "PYRA-2025-A", qty: 200, expiryDate: new Date("2026-12-31") },
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
      { batchId: "MILB-PRAZ-2025-A", qty: 60, expiryDate: new Date("2027-04-30") },
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
      { batchId: "FIPRO-DOG-M-2025-A", qty: 40, expiryDate: new Date("2026-10-31") },
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
      { batchId: "FIPRO-CAT-2025-A", qty: 40, expiryDate: new Date("2026-10-31") },
    ],
  },
  {
    medicineName: "Chlorpheniramine 4 mg – Dog/Cat",
    category: "Medicine",
    unit: "tablet",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 120,
    batches: [
      { batchId: "CPM-4-2025-A", qty: 120, expiryDate: new Date("2026-09-30") },
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
      { batchId: "EAR-GCB-2025-A", qty: 30, expiryDate: new Date("2026-08-31") },
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
      { batchId: "EYE-CHLOR-2025-A", qty: 30, expiryDate: new Date("2026-07-31") },
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
      { batchId: "SKIN-MH-2025-A", qty: 25, expiryDate: new Date("2026-09-30") },
    ],
  },
  {
    medicineName: "Lactated Ringer’s Solution",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 500,
    manufacturer: "VetCare",
    stock: 2000,
    batches: [
      { batchId: "LR-2025-A", qty: 2000, expiryDate: new Date("2027-01-31") },
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
      { batchId: "NS-2025-A", qty: 2000, expiryDate: new Date("2027-01-31") },
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
      { batchId: "VB-2025-A", qty: 500, expiryDate: new Date("2026-12-31") },
    ],
  },
  {
    medicineName: "Butorphanol 10 mg/ml Injection",
    category: "Medicine",
    unit: "ml",
    lowStockThreshold: 20,
    manufacturer: "VetCare",
    stock: 100,
    batches: [
      { batchId: "BUTOR-2025-A", qty: 100, expiryDate: new Date("2026-11-30") },
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
      { batchId: "ACE-2025-A", qty: 100, expiryDate: new Date("2026-11-30") },
    ],
  },
];

// ---- helper: normalize key for comparison ----
function keyFor(m) {
  return `${(m.medicineName || "").toLowerCase()}___${(m.category || "").toLowerCase()}`;
}

// ---- main seeding logic ----
async function seedForBranch(target, index) {
  let branch;
  if (target.branchName) {
    branch = await Branch.findOne({ branchName: target.branchName });
  }

  if (!branch) {
    branch = await Branch.findOne().skip(index).exec();
  }

  if (!branch) {
    console.warn(`⚠️ ไม่พบสาขา '${target.branchName || index}', จะสร้างสาขาใหม่ขึ้นมา`);
    branch = new Branch({ branchName: target.branchName || `Branch ${index + 1}`, medicines: [] });
  }

  console.log(`\n--- Processing branch: ${branch.branchName} (${branch._id ? branch._id.toString() : 'new'}) ---`);

  branch.medicines = branch.medicines || [];
  const existing = branch.medicines;
  const existingKeys = new Set(existing.map((m) => keyFor(m)));

  let added = 0;
  for (const v of medicineDocs) {
    const k = keyFor(v);
    if (existingKeys.has(k)) {
      console.log('• ข้าม (มีอยู่แล้ว):', v.medicineName);
      continue;
    }
    branch.medicines.push(Object.assign({}, v));
    existingKeys.add(k);
    added++;
    console.log('✓ เพิ่ม:', v.medicineName);
  }

  if (added > 0) {
    await branch.save();
    console.log(`✅ บันทึกเรียบร้อยในสาขา '${branch.branchName}' — เพิ่ม ${added} รายการ`);
  } else {
    console.log(`ℹ️ ไม่มี Medicine ใหม่ให้เพิ่มในสาขา '${branch.branchName}'`);
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