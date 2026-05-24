import axiosInstance from "./axiosInstance";

export const adminGetUsersApi = (params) =>
  axiosInstance.get("/users/admin", { params });

export const adminGetUserStatsApi = () =>
  axiosInstance.get("/users/admin/stats");

export const adminGetUserApi = (id) =>
  axiosInstance.get(`/users/admin/${id}`);

export const adminUpdateUserRoleApi = (id, role) =>
  axiosInstance.patch(`/users/admin/${id}/role`, { role });

export const adminVerifyUserApi = (id) =>
  axiosInstance.patch(`/users/admin/${id}/verify`);

export const adminDeleteUserApi = (id) =>
  axiosInstance.delete(`/users/admin/${id}`);
