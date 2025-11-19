import api from "./axiosConfig";

//  backend route: POST /api/users/login
export const login = (data) => api.post("/users/login", data);

//  backend route: POST /api/users/register
export const register = (data) => api.post("/users/register", data);

//  ดึงโปรไฟล์หลัง login
export const getProfile = () => api.get("/users/profile");
