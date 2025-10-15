
import api from "../api";
import { withHandler } from "../withhandler";


export const GetNotifications = async () => withHandler(() => api.patch("/api/v1/comman/notifications"))
export const markMessageRead = async (id: string) =>
  withHandler(() => api.patch(`/api/v1/comman/notification/${id}/mark-read`));

export const markMessagesBulkRead = async (ids: string[]) => withHandler(() => api.patch(`/api/v1/comman/notification/mark-bulk-read`,{ ids: ids }));



export const createFeedback = async (data: any) => withHandler(() => api.post("/api/v1/comman/feedback", data));

export const listFeedbacks = async () => withHandler(() => api.get("/api/v1/comman/feedback"));

export const shouldShowFeedback = async () => withHandler(() => api.get("/api/v1/comman/feedback/should-show"));

export const dismissFeedbackPrompt = async () => withHandler(() => api.post("/api/v1/comman/feedback/dismiss"));


export const createEnquiry = async (data: any) =>
  withHandler(() => api.post("/api/v1/comman/enquiry", data));
export const saveNotification = async (data: any) =>
  withHandler(() => api.post("/api/v1/comman/notification", data));
export const getMessagesByTeam = async () =>
  withHandler(() => api.get("/api/v1/comman/notification/get"));

export const listEnquiries = async (params = {}) =>
  withHandler(() => api.get("/api/v1/comman/enquiry", { params }));

export const getEnquiry = async (_id: any) =>
  withHandler(() => api.get(`/api/v1/comman/enquiry/${_id}`));

export const respondEnquiry = async (_id: any, data: any) =>
  withHandler(() => api.patch(`/api/v1/comman/enquiry/${_id}/respond`, data));

export const deleteEnquiry = async (_id: any) =>
  withHandler(() => api.delete(`/api/v1/comman/enquiry/${_id}`));


export const searchHandler = async (query: string) =>
  withHandler(() => api.patch(`/api/v1/comman/search?q=${query}`));

