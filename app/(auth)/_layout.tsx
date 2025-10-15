import React from "react";
import { Stack } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

export default function AuthLayout() {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: currentTheme.background },
      }}
    >
      <Stack.Screen name="Welcome" />
      <Stack.Screen name="Login" />
      <Stack.Screen name="Signup" />
      <Stack.Screen name="ForgotPassword" />
    </Stack>
  );
}
