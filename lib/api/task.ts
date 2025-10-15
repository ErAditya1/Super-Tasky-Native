import api from "../api"
import { withHandler } from "../withhandler"




export const createTask = async (payload: any) => withHandler(() => api.post("/api/v1/tasks/create", payload))

export const getArchievedItems = async () => withHandler(() => api.get(`/api/v1/tasks/archieved`))

export const getTasks = async () => withHandler(() => api.get(`/api/v1/tasks`))
export const getTasksByProject = async (projectId:string) => withHandler(() => api.get(`/api/v1/tasks/${projectId}`))

export const getTasksGroupedByStatus = async () => withHandler(() => api.patch('/api/v1/tasks/taskbystatus'))

export const getTaskById = async (taskId: string) => withHandler(() => api.get(`/api/v1/tasks/task/${taskId}`))
export const getTaskDashboard = async (taskId: string) => withHandler(() => api.get(`/api/v1/tasks/get/${taskId}`))

export const updateTask = async (taskId: string) => withHandler(() => api.patch(`/api/v1/tasks/${taskId}`))

export const deleteTask = async (taskId: string) => withHandler(() => api.delete(`/api/v1/tasks/${taskId}`))

export const updateTaskActivity = async (taskId: string, updates: any) => withHandler(() => api.patch(`/api/v1/tasks/update/activity/${taskId}`, updates));
export const addComment = async (taskId: string, text: string) => withHandler(() => api.post(`/api/v1/tasks/comment/add/${taskId}`, { text: text }))
export const uploadAttachment = async (taskId: string, formData: any) => withHandler(() => api.post(`/api/v1/tasks/attachment/add/${taskId}`, formData))

export const favouriteHandler = async (taskId: string) => withHandler(() => api.patch(`/api/v1/tasks/favourite/${taskId}`))
export const archieveHandler = async (taskId: string) => withHandler(() => api.patch(`/api/v1/tasks/archieve/${taskId}`))
export const recoverHandler = async (taskId: string) => withHandler(() => api.patch(`/api/v1/tasks/recover/${taskId}`))
export const repeatHandler = async (taskId: string) => withHandler(() => api.patch(`/api/v1/tasks/repeat/${taskId}`))
export const lastSeenHandler = async (taskId: string) => withHandler(() => api.patch(`/api/v1/tasks/lastseen/${taskId}`))

export const getFavouriteTasks = async () => withHandler(() => api.get(`/api/v1/tasks/favourite/all`))




