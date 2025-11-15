import api from "./axiosConfig";

// ดึง pets ของเจ้าของ
export const getPetsByOwner = (userId) =>
  api.get(`/users/${userId}/pets`);

// เพิ่ม pet ให้ user
export const addPet = (userId, petData) =>
  api.post(`/users/${userId}/pets`, petData);

// ดึงรายชื่อสัตว์ใน branch
export const getPetsByBranch = (branchId) =>
  api.get(`/pets/by-branch/${branchId}`);
