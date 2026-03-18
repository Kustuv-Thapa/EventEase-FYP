import axiosInstance from "./axiosInstance";

export const registerForEventApi = (eventId) =>
  axiosInstance.post(`/registrations/events/${eventId}`);

export const getMyRegistrationsApi = () =>
  axiosInstance.get("/registrations/me");

export const getAdminRegistrationsApi = (params) =>
  axiosInstance.get("/registrations/admin", { params });

export const approveRegistrationApi = (registrationId, data) =>
  axiosInstance.patch(`/registrations/admin/${registrationId}/decision`, data);