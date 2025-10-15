// apiClient.ts
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { Platform } from "react-native";// keep your logout handler; adjust path if needed
import { logout } from "./api/auth";

// --------- Config / API URL for Expo dev environments ----------
const PROD_URL = "https://super-tasky-server.onrender.com";

// Derive a sensible dev URL for Expo. If running in Expo Go, manifest.debuggerHost gives "host:port"
function getDefaultDevUrl(): string {
  try {
    const dbg = (Constants.manifest as any)?.debuggerHost;
    if (dbg) {
      const host = String(dbg).split(":")[0];
      return `http://${host}:8000`;
    }
  } catch (e) {
    // ignore
  }
  // emulator fallback
  if (Platform.OS === "android") return "http://10.0.2.2:8000";
  return "http://localhost:8000";
}

export const API_URL =
  process.env.NODE_ENV === "production" ? PROD_URL : getDefaultDevUrl();

// --------- Secure storage keys & utilities ----------
const KEY_ACCESS = "st_access_token_v1";
const KEY_REFRESH = "st_refresh_token_v1";
const KEY_DEVICE = "st_device_id_v1";

async function generateUuid(): Promise<string> {
  // simple UUIDv4 generator (no extra deps)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  try {
    const existing = await SecureStore.getItemAsync(KEY_DEVICE);
    if (existing) return existing;
    const id = await generateUuid();
    await SecureStore.setItemAsync(KEY_DEVICE, id, { keychainService: KEY_DEVICE });
    return id;
  } catch (e) {
    console.warn("getDeviceId error", e);
    // fallback to ephemeral id if SecureStore fails
    const fallback = `ephemeral-${Date.now()}`;
    return fallback;
  }
}

export async function setTokens(access?: string | null, refresh?: string | null) {
  try {
    if (access == null) {
      await SecureStore.deleteItemAsync(KEY_ACCESS);
    } else {
      await SecureStore.setItemAsync(KEY_ACCESS, access);
    }
    if (refresh == null) {
      await SecureStore.deleteItemAsync(KEY_REFRESH);
    } else {
      await SecureStore.setItemAsync(KEY_REFRESH, refresh);
    }
  } catch (e) {
    console.warn("setTokens error", e);
  }
}

export async function getTokens(): Promise<{ accessToken?: string | null; refreshToken?: string | null }> {
  try {
    const [access, refresh] = await Promise.all([
      SecureStore.getItemAsync(KEY_ACCESS),
      SecureStore.getItemAsync(KEY_REFRESH),
    ]);
    return { accessToken: access ?? null, refreshToken: refresh ?? null };
  } catch (e) {
    console.warn("getTokens error", e);
    return { accessToken: null, refreshToken: null };
  }
}

export async function clearAllAuthData() {
  try {
    await Promise.all([SecureStore.deleteItemAsync(KEY_ACCESS), SecureStore.deleteItemAsync(KEY_REFRESH)]);
  } catch (e) {
    console.warn("clearAllAuthData error", e);
  }
}

// --------- axios clients ----------
const api = axios.create({
  baseURL: API_URL,
  // withCredentials is not meaningful on React Native, but keep it if backend expects cookies
  withCredentials: true,
  timeout: 20_000,
});

const refreshClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  timeout: 10_000,
});

// --------- refresh concurrency control ----------
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;
let failedQueue: Array<{ resolve: (v?: any) => void; reject: (e?: any) => void }> = [];

const processQueue = (err: any, value?: any) => {
  failedQueue.forEach((p) => {
    if (err) p.reject(err);
    else p.resolve(value);
  });
  failedQueue = [];
};

// exponential backoff retry helper (used for refresh)
async function retryWithBackoff<T>(fn: () => Promise<T>, attempts = 3, attempt = 1): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (attempt >= attempts) throw err;
    const baseDelay = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    const delay = baseDelay + jitter;
    await new Promise((r) => setTimeout(r, delay));
    return retryWithBackoff(fn, attempts, attempt + 1);
  }
}

// --------- Core refresh logic (Expo-friendly) ----------
async function refreshAccessToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const deviceId = await getDeviceId();
      // prefer reading refresh token from secure store
      const { refreshToken } = await getTokens();

      // Prepare request payload. If backend uses HttpOnly cookies for refresh, you may omit body.
      const payload: any = {};
      if (refreshToken) payload.refreshToken = refreshToken;

      const response: AxiosResponse<any> = await retryWithBackoff(() =>
        refreshClient.post("/api/v1/auth/refresh-token", payload, {
          headers: { "x-device-id": deviceId },
        })
      );

      // Expect backend to return new tokens in response.data.data (adjust to your API)
      const resData = response?.data;
      if (!resData) {
        await handleRefreshFailure();
        return false;
      }

      const success = Boolean(resData?.success ?? true); // default to true if your API doesn't wrap
      if (!success) {
        await handleRefreshFailure();
        return false;
      }

      // Extract tokens if present
      const newAccess = resData?.data?.accessToken ?? resData?.accessToken ?? null;
      const newRefresh = resData?.data?.refreshToken ?? resData?.refreshToken ?? null;

      if (newAccess || newRefresh) {
        await setTokens(newAccess ?? null, newRefresh ?? null);
      }

      return true;
    } catch (error) {
      // If axios error, inspect response
      if (axios.isAxiosError(error)) {
        const aerr = error as AxiosError;
        if (aerr.response?.status === 401) {
          // Refresh token invalid
          await handleRefreshFailure();
          return false;
        }
        // network or server error -> handle
        console.error("Refresh token request failed:", aerr.message);
        await handleRefreshFailure();
        return false;
      } else {
        console.error("Unexpected refresh error:", error);
        await handleRefreshFailure();
        return false;
      }
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function handleRefreshFailure() {
  // clear local tokens and call logout endpoint if available
  try {
    await clearAllAuthData();
    try {
      // try server-side logout (best-effort)
      await logout();
    } catch (e) {
      // ignore server logout failures
      console.warn("server logout failed", e);
    }
  } finally {
    // In a real app redirect to auth flow (cannot access window in RN)
    // Raise an event, or integrate with your navigation to navigate to sign-in.
    // Example (pseudo):
    // NavigationService.navigate("SignIn");
    console.warn("Refresh failed — tokens cleared, please re-authenticate.");
  }
}

// --------- Request interceptor: attach Authorization and device id ----------

api.interceptors.request.use(
  // note: use InternalAxiosRequestConfig here
  async (config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> => {
    try {
      const deviceId = await getDeviceId();

      // Ensure headers object exists and is a simple string map for assignment
      if (!config.headers) {
        // config.headers type is constrained, so initialize as a plain object then cast
        config.headers = {} as any;
      }

      // cast headers to a simple indexable string map for safe assignment
      const headers = config.headers as Record<string, string | number | boolean | undefined>;

      headers["x-device-id"] = String(deviceId);

      // attach access token (read from SecureStore)
      const { accessToken } = await getTokens();
      if (accessToken) {
        headers["Authorization"] = `Bearer ${accessToken}`;
      }

      // optional metadata headers
      headers["x-platform"] = Platform.OS;

      // return the same config typed as InternalAxiosRequestConfig
      return config;
    } catch (err) {
      console.warn("request interceptor error", err);
      // even on error return config so request can proceed (or reject if you prefer)
      return config;
    }
  },
  (error) => Promise.reject(error)
);
// --------- Response interceptor: handle 401 and queue retries ----------
api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const originalRequest = err.config as AxiosRequestConfig & { _retry?: boolean };

    if (!originalRequest) return Promise.reject(err);

    // If 401 and not retried yet -> try refresh
    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // queue the request until refresh finishes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: async () => {
              try {
                // after refresh, re-run the request (axios will re-run interceptors and include new token)
                const resp = await api(originalRequest);
                resolve(resp);
              } catch (e) {
                reject(e);
              }
            },
            reject: (error) => {
              reject(error);
            },
          });
        });
      }

      try {
        const ok = await refreshAccessToken();
        if (ok) {
          processQueue(null, true);
          // retry original request (interceptor will add new token)
          return api(originalRequest);
        } else {
          processQueue(new Error("refresh_failed"), null);
          return Promise.reject(err);
        }
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  }
);

// --------- Convenience exports ----------
export default api;

// For direct usage in other modules:
export { refreshAccessToken};
