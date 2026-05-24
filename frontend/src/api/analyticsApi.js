import axiosInstance from "./axiosInstance";

export const getOrganizerAnalyticsApi = (timeWindow = "30d") =>
  axiosInstance.get(`/analytics/organizer?timeWindow=${timeWindow}`);
