// lib/adminApi.ts


import api from "../api";
import { withHandler } from "../withhandler";


// --- Overview ---
export const fetchAdminOverview = async () =>
  withHandler(() => api.get("/api/v1/admin/overview"));

// --- Users ---
export const fetchUsers = async (params?: any, signal?: any) =>
  withHandler(() => api.get(`/api/v1/admin/users?${params}`, { signal }));

export const fetchStats = async () => withHandler(() => api.get('/api/v1/admin/users/stats'))

export const updateUserRole = async (userId: string, role: string) =>
  withHandler(() => api.put(`/api/v1/admin/users/${userId}/role`, { role }));

export const deactivateUser = async (userId: string) =>
  withHandler(() => api.put(`/api/v1/admin/users/${userId}/deactivate`));

// --- Teams ---
export const fetchTeams = async () =>
  withHandler(() => api.get("/api/v1/admin/teams"));

export const fetchTeamsStats = async () =>
  withHandler(() => api.get("/api/v1/admin/teams/stats"));

export const createTeam = async (payload: { name: string }) =>
  withHandler(() => api.post("/api/v1/admin/teams", payload));

export const deleteTeam = async (id: string) =>
  withHandler(() => api.delete(`/api/v1/admin/teams/${id}`));

// --- Roles ---
export const fetchRoles = async () =>
  withHandler(() => api.get("/api/v1/admin/roles"));

export const updateRole = async (roleId: string, data: any) =>
  withHandler(() => api.put(`/api/v1/admin/roles/${roleId}`, data));




// projects
export const getTasksOverview = async (params:any) =>
  withHandler(() => api.get(`/api/v1/admin/task-overview?${params}`));
export const listProjectsWithProgress = async (params:any) =>
  withHandler(() => api.get(`/api/v1/admin/projects?${params}`));
export const getBurnDown = async (params:any) =>
  withHandler(() => api.get(`/api/v1/admin/task-overview?${params}`));

export const getOverdueBreakdown = async () =>
  withHandler(() => api.get(`/api/v1/admin/overdue-breakdown`));

export const exportProjectsCSVApi = async (params:any) =>
  withHandler(() => api.get(`/api/v1/admin/projects/export?${params}`));


export const exportTasksCSVApi = async () =>
  withHandler(() => api.get(`/api/v1/admin/tasks/export`));


// session  

// router.get("/sessions/overview", getSessionOverview);
// router.get("/sessions/heatmap", getHourlyHeatmap);
// router.get("/sessions/top-days", getTopProductivityDays);
// router.get("/sessions/trend", getSessionTrend);

export const getSessionOverviewApi = async () => withHandler(() => api.get("/api/v1/admin/sessions/overview"));
export const getHourlyHeatmapApi = async () => withHandler(() => api.get("/api/v1/admin/sessions/heatmap"));
export const getTopProductivityDaysApi = async () => withHandler(() => api.get("/api/v1/admin/sessions/top-days"));
export const getSessionTrendApi = async () => withHandler(() => api.get("/api/v1/admin/sessions/trend"));