import api from "../api"
import { withHandler } from "../withhandler"


export const createTeam = async (payload: any) => withHandler(() => api.post("/api/v1/teams/create", payload))
export const updateTeam = async (payload: any) => withHandler(() => api.patch("/api/v1/teams/create", payload))

export const getTeams = async () => withHandler(() => api.get("/api/v1/teams/"))

export const getCurrentTeam = async () => withHandler(() => api.patch('/api/v1/teams/current'))

export const getTeamById = async (teamId: string) => withHandler(() => api.get(`/api/v1/teams/${teamId}`))

export const updateTeamAvatar = async(formData:any)=>withHandler(()=> api.patch("/api/v1/teams/avatar", formData))

export const switchTeam = async (teamId: string) => withHandler(() => api.get(`/api/v1/teams/switch/${teamId}`))

// get invites 
export const InviteThrowEmail = async (payload: { identifier: string }) => withHandler(() => api.post("/api/v1/teams/member/invite", payload))
export const removeMember = async (userId: string) => withHandler(() => api.patch(`/api/v1/teams/member/remove/${userId}`))

// accept invite
export const AcceptInvite = async (payload: { token: string }) => withHandler(() => api.patch("/api/v1/teams/invite/accept", payload))


export const getInvites = async () => withHandler(() => api.patch('/api/v1/teams/invites'))

export const getMembers = async () => withHandler(() => api.patch('/api/v1/teams/members'))



