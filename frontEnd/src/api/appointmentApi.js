import api from "./axiosConfig";

// ดึง schedule ทั้งหมดของ branch
export const getSchedulesByBranch = (branchId) =>
  api.get(`/branches/${branchId}/schedules`);

// เพิ่ม schedule ใหม่ (เช่น staff เพิ่มนัดหมาย)
export const addSchedule = (branchId, data) =>
  api.post(`/branches/${branchId}/schedules`, data);
