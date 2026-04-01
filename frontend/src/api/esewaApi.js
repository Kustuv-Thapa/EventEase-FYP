import axiosInstance from "./axiosInstance";

export const initiateEsewaPaymentApi = (registrationId) =>
  axiosInstance.post("/esewa/initiate", { registrationId });

export const verifyEsewaCallbackApi = (data) =>
  axiosInstance.post("/esewa/verify-callback", { data });
