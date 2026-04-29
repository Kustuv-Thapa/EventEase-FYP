import axiosInstance from "./axiosInstance";

export const getVenuesApi = () => axiosInstance.get("/venues");
export const getAdminVenuesApi = () => axiosInstance.get("/venues?active=all");
export const getVenueByIdApi = (id) => axiosInstance.get(`/venues/${id}`);
export const createVenueApi = (data) => axiosInstance.post("/venues", data);
export const updateVenueApi = (id, data) => axiosInstance.patch(`/venues/${id}`, data);
export const uploadVenueImageApi = (id, image) => axiosInstance.patch(`/venues/${id}/image`, { image });
export const deleteVenueApi = (id) => axiosInstance.delete(`/venues/${id}`);
export const cancelVenueBookingApi = (bookingId) => axiosInstance.patch(`/bookings/${bookingId}/cancel`);
export const checkVenueAvailabilityApi = (venueId, start, end) =>
  axiosInstance.get(`/bookings/venues/${venueId}/availability`, { params: { start, end } });
