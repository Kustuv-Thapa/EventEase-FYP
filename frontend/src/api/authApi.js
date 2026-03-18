import axiosInstance from "./axiosInstance";

export const loginUserApi = (data) => axiosInstance.post("/auth/login", data);
export const registerUserApi = (data) => axiosInstance.post("/auth/register", data);
export const getProfileApi = () => axiosInstance.get("/auth/profile");