import axiosInstance from "./axiosInstance";

export const getMyTicketsApi = () => axiosInstance.get("/tickets/my");
export const verifyTicketApi = (ticketId) => axiosInstance.post(`/tickets/verify/${ticketId}`);
