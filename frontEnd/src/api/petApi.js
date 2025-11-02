import api from "./axiosConfig";
export const getMyPets = () => api.get("/pets");
