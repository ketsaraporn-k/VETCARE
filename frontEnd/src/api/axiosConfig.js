// src/api/axiosConfig.js
import axios from "axios";

/**
 * axios global instance
 * - ใช้กับ backend http://localhost:3000 โดยค่าเริ่มต้น
 * - ถ้าใช้ Vite: ตั้ง VITE_API_URL ในไฟล์ .env (เช่น VITE_API_URL=http://localhost:3000)
 * - เปิดใช้ cookies ด้วย withCredentials:true
 */

const BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_URL) ||
  "http://localhost:3000";

const api = axios.create({
  baseURL: BASE,
  withCredentials: true, // สำคัญ: ให้ส่ง cookies ได้
  timeout: 15000,
});

// 🔑 interceptor: แนบ Bearer token ถ้ามีใน localStorage
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("token");
      if (token && config && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn("No token found in localStorage");
    }
    return config;
  },
  (err) => Promise.reject(err)
);

export default api;
