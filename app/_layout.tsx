// app/_layout.tsx
import React, { useEffect } from "react";
import {
  DarkTheme as NavigationDark,
  DefaultTheme as NavigationDefault,
  Theme as NavigationTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, StyleSheet } from "react-native";

import { theme } from "@/constants/Colors";
import { ThemeProviderCustom, useThemeToggle } from "@/context/ThemeContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/RouteGuard";
import RouteGuard from "@/components/RouteGuard";
import { ToastProvider } from "@/components/Toast";
import { Provider } from "react-redux";
import { store } from "@/store/store";
import { SocketProvider } from "@/context/SocketProvider";
import * as Notifications from "expo-notifications";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LogBox } from "react-native";
import NotificationCenter from "@/components/NotificationCenter";

LogBox.ignoreAllLogs(true); // optional for dev

// const Stack = createNativeStackNavigator();

type NativeStackSafeTheme = NavigationTheme & {
  fonts: {
    regular: { fontFamily: string; fontWeight: string };
    medium: { fontFamily: string; fontWeight: string };
    [key: string]: any;
  };
};

function mapToNavigationTheme(custom: any): NativeStackSafeTheme {
  const c = custom ?? theme.light;

  return {
    dark: c === theme.dark,
    colors: {
      primary: c.primary,
      background: c.background,
      card: c.card,
      text: c.cardForeground,
      border: c.border,
      notification: c.accent,
    },
    fonts: {
      regular: { fontFamily: "System", fontWeight: "400" },
      medium: { fontFamily: "System", fontWeight: "500" },
    },
  };
}

export default function RootLayout() {

 useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      // This runs when user taps a notification
      console.log("Notification response received (App.tsx):", response);
    });

    return () => {
      sub.remove();
    };
  }, []);

  return (
    <Provider store={store}>
      <AuthProvider>
        <SocketProvider>
          <ThemeProviderCustom>
            <SafeAreaProvider>
              <RouteGuard>
                <ToastProvider>
                  <InnerLayout />
                </ToastProvider>
              </RouteGuard>
            </SafeAreaProvider>
          </ThemeProviderCustom>
        </SocketProvider>
      </AuthProvider>
    </Provider>
  );
}

function InnerLayout() {
  const { isDark } = useThemeToggle();

  // Use system font, always available
  const headerTitleFont = "System";
  const { isLoggedIn } = useAuth();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const navigationTheme = mapToNavigationTheme(currentTheme);
  // console.log(isLoggedIn);

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: currentTheme.background }}
        edges={["top", "left", "right"]}
      >
        <Stack
          screenOptions={{
            headerShown: false,
            headerStyle: { backgroundColor: currentTheme.card },
            headerTintColor: currentTheme.cardForeground,
            headerTitleStyle: {
              fontWeight: "700",
              fontFamily: headerTitleFont,
            },
            contentStyle: { backgroundColor: currentTheme.background },
          }}
        >
          {/* Public Routes */}

          {/* Protected Routes */}

          <Stack.Screen name="notification-center" options={{ headerShown: false }} />
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

          {/* Not Found */}
          <Stack.Screen name="+not-found" options={{ title: "Not Found" }} />
        </Stack>

        <StatusBar
          style={isDark ? "light" : "dark"}
          backgroundColor={currentTheme.background}
          translucent={false}
          animated
        />
      </SafeAreaView>
    </NavigationThemeProvider>
  );
}
