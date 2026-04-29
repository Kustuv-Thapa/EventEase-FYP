import axiosInstance from "./axiosInstance";

export const initiateKhaltiPaymentApi = (registrationId) =>
  axiosInstance.post("/khalti/initiate", { registrationId });

export const verifyKhaltiPaymentApi = (pidx) =>
  axiosInstance.post("/khalti/verify", { pidx });
