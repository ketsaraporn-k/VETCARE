import api from "./axiosConfig";
export const getUpcoming = () => api.get("/appointments/upcoming");
