import axiosInstance from "./axiosInstance";

export const getEventFeedbackApi = (eventId) =>
  axiosInstance.get(`/feedback/events/${eventId}`);

export const submitFeedbackApi = (eventId, data) =>
  axiosInstance.post(`/feedback/events/${eventId}`, data);

export const updateFeedbackApi = (feedbackId, data) =>
  axiosInstance.put(`/feedback/${feedbackId}`, data);

export const deleteFeedbackApi = (feedbackId) =>
  axiosInstance.delete(`/feedback/${feedbackId}`);

export const adminHideFeedbackApi = (feedbackId) =>
  axiosInstance.patch(`/feedback/${feedbackId}/hide`);

export const adminDeleteFeedbackApi = (feedbackId) =>
  axiosInstance.delete(`/feedback/admin/${feedbackId}`);

export const adminGetEventFeedbackApi = (eventId) =>
  axiosInstance.get(`/feedback/admin/events/${eventId}`);

export const replyToFeedbackApi = (feedbackId, text) =>
  axiosInstance.patch(`/feedback/${feedbackId}/reply`, { text });

export const deleteOrganizerReplyApi = (feedbackId) =>
  axiosInstance.delete(`/feedback/${feedbackId}/reply`);
