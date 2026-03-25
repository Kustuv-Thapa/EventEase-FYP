import axiosInstance from "./axiosInstance";

export const registerForEventApi = (eventId) =>
  axiosInstance.post(`/registrations/events/${eventId}`);

export const getMyRegistrationsApi = () =>
  axiosInstance.get("/registrations/me");

export const cancelMyRegistrationApi = (registrationId) =>
  axiosInstance.delete(`/registrations/${registrationId}`);

export const getAdminRegistrationsApi = (params) =>
  axiosInstance.get("/registrations/admin", { params });

export const approveRegistrationApi = (registrationId, data) =>
  axiosInstance.patch(`/registrations/admin/${registrationId}/decision`, data);

export const adminEventRegistrationsApi = (eventId) =>
  axiosInstance.get(`/registrations/admin/event/${eventId}`);
