import api from "../api";
import { withHandler } from "../withhandler";

export type FocusSession = {
  _id: string;
  user: string;
  task?: string | null;
  startTime: string;
  endTime?: string | null;
  duration?: number;
  status: 'running' | 'completed' | 'interrupted';
  mode?: 'focus' | 'break';
  createdAt?: string;
  updatedAt?: string;
};

export const startFocus = async(data:any)=> withHandler(()=> api.post("/api/v1/focus/start",data))
export const endFocus = async(data:any)=> withHandler(()=> api.post("/api/v1/focus/end",data))
export const getFocusStatus = async()=> withHandler(()=> api.get("/api/v1/focus/stats"))



// create methods or handler for these apis

export const getFocusSession = async (id: string) =>  withHandler(() => api.get(`/api/v1/focus/session/${id}`));

export const deleteFocusSession = async (id: string) =>  withHandler(() => api.delete(`/api/v1/session/focus/${id}`));

export const endFocusSession = async (id: string) =>  withHandler(() => api.post(`/api/v1/focus/session/${id}/end`));



export const getTeamFocusSessions = async () =>
  withHandler(() => api.get(`/api/v1/focus/team`));

export const getUserFocusDashboard = async () =>
  withHandler(() => api.get(`/api/v1/focus/dashboard`));