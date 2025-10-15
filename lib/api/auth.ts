// api.ts

import api from "../api";
import { withHandler } from "../withhandler";


export const login = async (payload: {
  identifier: string;
  password: string;
  deviceType: string;
  language: string;
  screen: string;
}) => {
  return await api.post('/api/v1/auth/login', payload);
};

export const refreshToken = async (refreshToken: string) => {
  return await api.post('/api/v1/auth/refresh-token', { refreshToken });
};

export const googleOAuthRedirect = async() => {
  const base =
    process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_SERVER_URI || 'https://super-tasky-server.onrender.com/api'}`
      : 'http://localhost:8000/api';

     

  window.location.href = `${base}/v1/auth/google`;
};



export const githubOAuthRedirect =async () => {
  const base =
    process.env.NODE_ENV === 'production'
      ? `${process.env.NEXT_PUBLIC_SERVER_URI || 'https://super-tasky-server.onrender.com/api'}`
      : 'http://localhost:8000/api';



  window.location.href = `${base}/v1/auth/github`;
};



export const register = async (payload: {
  name: string;
  username: string;
  email: string;
  password: string;
}) => {
  return await api.post('/api/v1/auth/register', payload);
};

export const checkUsername = async (username: string) => {
  return await api.get(`/api/v1/auth/check-username?username=${username}`);
};


export const verifyAccount = async ({
  username,
  code,
}: {
  username: string;
  code: string;
}) => {
  return await api.post('/api/v1/auth/verify-code', { username, code });
};

export const resendVerificationCode = async (username: string) => {
  return await api.patch('/api/v1/auth/verify-code', { username });
};


export const requestPasswordReset = async (identifier: string) => {
  return await api.post('/api/v1/auth/request-reset-password', { identifier });
};


export const resetPassword = async ({
  password,
  password1,
  token,
}: {
  password: string;
  password1: string;
  token: string | null;
}) => {
  return await api.post('/api/v1/auth/reset-password', {
    password,
    password1,
    resetToken: token,
  });
};

export const logout = async () => {
  const res = await withHandler(() =>
    api.patch('/api/v1/auth/logout')
  );
  
  return res;
}
export const logoutDevice = async (deviceId: string) => {
  return await withHandler(() =>
    api.patch(`/api/v1/auth/logout/${deviceId}`)
  );
}


export const changeCurrentPassword = async(payload:any)=>withHandler(()=> api.post('/api/v1/auth/change-password',payload))


