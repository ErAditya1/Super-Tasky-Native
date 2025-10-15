import api from "../api"
import { withHandler } from "../withhandler"

export const getProfileByUsername = async(username:any)=> withHandler(()=> api.get(`/api/v1/users/get-user-profile/${username}`))
export const getUserAccount = async()=> withHandler(()=> api.get(`/api/v1/users/get-user-account`))

export const updateUserAvatar = async(formData:any)=>withHandler(()=> api.patch("/api/v1/users/avatar", formData))

export const updateUserCover = async(formData:any)=>withHandler(()=> api.patch("/api/v1/users/cover", formData))

export const updateUserAccount = async(data:any)=>withHandler(()=> api.patch('/api/v1/users/update-account', data ))
export const getUserSuggestion = async(data:any)=>withHandler(()=> api.get(`/api/v1/users/get-gser-suggestion?searchTerm=${data}` ))

