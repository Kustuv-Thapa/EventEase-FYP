import axiosInstance from "./axiosInstance";

export const getEventsApi = () => axiosInstance.get("/events");
export const getEventByIdApi = (id) => axiosInstance.get(`/events/${id}`);
export const getMyEventsApi = () => axiosInstance.get("/events/mine");
export const createEventApi = (data) => axiosInstance.post("/events", data);
export const updateEventApi = (id, data) => axiosInstance.put(`/events/${id}`, data);
export const uploadEventImageApi = (id, image) => axiosInstance.patch(`/events/${id}/image`, { image });
export const deleteEventApi = (id) => axiosInstance.delete(`/events/${id}`);
export const submitEventForApprovalApi = (id) => axiosInstance.patch(`/events/${id}/submit`);
export const getAdminPendingEventsApi = () => axiosInstance.get("/events/admin/pending");
export const adminApproveEventApi = (id) => axiosInstance.patch(`/events/${id}/approve`);
export const adminRejectEventApi = (id, reason) => axiosInstance.patch(`/events/${id}/reject`, { reason });
export const updateCapacityApi = (id, capacity) => axiosInstance.patch(`/events/${id}/capacity`, { capacity });
export const cancelEventApi = (id) => axiosInstance.patch(`/events/${id}/cancel`);
