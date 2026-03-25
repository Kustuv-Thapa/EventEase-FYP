import axiosInstance from "./axiosInstance";

export const getVenuesApi = () => axiosInstance.get("/venues");
export const getVenueByIdApi = (id) => axiosInstance.get(`/venues/${id}`);
export const createVenueApi = (data) => axiosInstance.post("/venues", data);
export const updateVenueApi = (id, data) => axiosInstance.patch(`/venues/${id}`, data);
export const uploadVenueImageApi = (id, image) => axiosInstance.patch(`/venues/${id}/image`, { image });
export const deleteVenueApi = (id) => axiosInstance.delete(`/venues/${id}`);
export const bookVenueApi = (data) => axiosInstance.post("/bookings", data);
export const getMyVenueBookingsApi = () => axiosInstance.get("/bookings/me");
export const getAdminBookingsApi = (params) => axiosInstance.get("/bookings/admin/all", { params });
export const approveVenueBookingApi = (bookingId) => axiosInstance.patch(`/bookings/${bookingId}/approve`);
export const rejectVenueBookingApi = (bookingId, reason) => axiosInstance.patch(`/bookings/${bookingId}/reject`, { reason });
export const checkMyBookingApi = (venueId) => axiosInstance.get("/bookings/check", { params: { venueId } });
