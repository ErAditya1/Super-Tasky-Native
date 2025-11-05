// src/services/notification.ts
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";

/**
 * Set global handler so notifications are shown in foreground
 */
/**
 * Make notifications show while app is foregrounded.
 * Return typed NotificationBehavior to satisfy TypeScript for newer expo-notifications.
 */
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // iOS 15+ options:
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request permission and return the Expo push token (or null).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    if (!Device.isDevice) {
      console.warn("Must use physical device for push notifications.");
      return null;
    }

    const existing = await Notifications.getPermissionsAsync();
    let finalStatus = existing.status;

    if (existing.status !== "granted") {
      const asked = await Notifications.requestPermissionsAsync();
      finalStatus = asked.status;
    }

    if (finalStatus !== "granted") {
      console.warn("Permission not granted for notifications.");
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (err) {
    console.error("registerForPushNotificationsAsync error:", err);
    return null;
  }
}

/**
 * Show an immediate local notification
 */
export async function showLocalNotification({
  title,
  body,
  data,
}: {
  title: string;
  body?: string;
  data?: any;
}) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: body ?? undefined,
        data: data ?? {},
        sound: "default",
      },
      trigger: null, // immediate
    });
  } catch (err) {
    console.error("showLocalNotification error:", err);
  }
}

/**
 * Send a test push using Expo's push API directly (for development/testing).
 * Note: It's okay for quick debugging but in production you should send pushes from your server.
 */
export async function sendExpoPushNotification(
  expoPushToken: string,
  title: string,
  body?: string,
  data?: any
) {
  try {
    const message = {
      to: expoPushToken,
      title,
      body: body ?? "",
      data: data ?? {},
    };

    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const json = await res.json();
    return json;
  } catch (err) {
    console.error("sendExpoPushNotification error:", err);
    throw err;
  }
}

/**
 * Helper to get socket URI from expo constants (expoConfig.extra)
 */
export function getSocketUriFromConstants(): string {
  const extra = (Constants as any).expoConfig?.extra ?? (Constants as any).manifest?.extra ?? {};
  return extra?.SOCKET_URI ?? "https://super-tasky-server.onrender.com";
}
