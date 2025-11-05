// api.ts

import { openAuthSessionAsync } from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import { Platform } from "react-native";
import api from "../api";
import { withHandler } from "../withhandler";


export const login = async (payload: any) => withHandler(() => api.post('/api/v1/auth/login', payload))

export const refreshToken = async (refreshToken: string) => {
  return await api.post('/api/v1/auth/refresh-token', { refreshToken });
};

export const googleLogin = async () => {
  const redirectUri = AuthSession.makeRedirectUri({
    scheme: "supertasky", // replace with your app scheme
  });
  try {
    const base =
      process.env.NODE_ENV === "production"
        ? process.env.SERVER_URI || "https://super-tasky-server.onrender.com"
        : "https://super-tasky-server.onrender.com";

    const authUrl = `${base}/api/v1/auth/google?mobileRedirect=${encodeURIComponent(redirectUri)}`;

    console.log(redirectUri)
    // Open browser for Google OAuth
    const result = await openAuthSessionAsync(authUrl, redirectUri);

    // result.type === 'success' when user completes login
    if (result.type === "success") {
      // You may receive a token in result.params or need to call your backend to fetch JWT
      return result;
    } else {
      console.log("Google login canceled");
    }
  } catch (error) {
    console.log("Google login error:", error);
  }
};



export const githubOAuthRedirect = async () => {
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
}) => withHandler(() => api.post('/api/v1/auth/register', payload))

export const checkUsername = async (username: string) => withHandler(() => api.get(`/api/v1/auth/check-username?username=${username}`))


export const verifyAccount = async ({
  username,
  code,
}: {
  username: string| string[];
  code: string;
}) => withHandler(() => api.post('/api/v1/auth/verify-code', { username, code }))

export const resendVerificationCode = async (username: string | string[]) => withHandler(() => api.patch('/api/v1/auth/verify-code', { username }))


export const requestPasswordReset = async (identifier: string) => withHandler(() => api.post('/api/v1/auth/request-reset-password', { identifier }))


export const resetPassword = async ({
  password,
  password1,
  token,
}: {
  password: string;
  password1: string;
  token: string | null;
}) => withHandler(() => api.post('/api/v1/auth/reset-password', {
  password,
  password1,
  resetToken: token,
}))

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


export const changeCurrentPassword = async (payload: any) => withHandler(() => api.post('/api/v1/auth/change-password', payload))


