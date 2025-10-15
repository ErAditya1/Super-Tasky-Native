import api from "../api"
import { withHandler } from "../withhandler"


export const createProject = async (payload: any) => withHandler(() => api.post("/api/v1/projects/create", payload))

export const getProjects = async () => withHandler(() => api.get('/api/v1/projects/'))

export const getProjectById = async (projectId: string) => withHandler(() => api.get(`/api/v1/projects/${projectId}`))
export const archieveProject = async (projectId: string) => withHandler(() => api.patch(`/api/v1/projects/archieve/${projectId}`))
export const recoverProject = async (projectId: string) => withHandler(() => api.patch(`/api/v1/projects/recover/${projectId}`))
export const deleteProject = async (projectId: string) => withHandler(() => api.delete(`/api/v1/projects/${projectId}`))
export const getProjectAllDetails = async (projectId: string) => withHandler(() => api.get(`/api/v1/projects/get/${projectId}`))
export const addProjectMember = async (projectId: string, members: string[]) => withHandler(() => api.patch(`/api/v1/projects/members/add/${projectId}`, { members: members }))
export const removeProjectMember = async (projectId: string) => withHandler(() => api.patch(`/api/v1/projects/member/remove/${projectId}`))

export const getProjectWithTasks = async () => withHandler(() => api.get(`/api/v1/projects/withtasks`))
