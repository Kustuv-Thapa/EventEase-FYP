import axiosInstance from "./axiosInstance";

export const loginUserApi = (data) => axiosInstance.post("/auth/login", data);
export const registerUserApi = (data) => axiosInstance.post("/auth/register", data);
export const getProfileApi = () => axiosInstance.get("/auth/profile");
export const logoutApi = () => axiosInstance.post("/auth/logout");
export const forgotPasswordApi = (email) => axiosInstance.post("/auth/forgot-password", { email });
export const resetPasswordApi = (token, newPassword) => axiosInstance.post("/auth/reset-password", { token, newPassword });
