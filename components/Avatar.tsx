import React from "react";
import { View, Text, StyleSheet, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

const getInitials = (name?: string) => {
  if (!name || typeof name !== "string") return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
};

const Avatar: React.FC<any> = ({ user, style = {}, size = 36 }) => {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const width = size;
  const height = size;
  const borderRadius = size / 2;

  const baseImageStyle = { width, height, borderRadius };
  const baseFallbackStyle = {
    width,
    height,
    borderRadius,
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <View style={[styles.container, { width, height }, typeof style === "object" ? style : {}]}>
      {user && user?.avatar && user?.avatar?.url ? (
        <>
          <Image
            source={{ uri: user.avatar.url }}
            style={[baseImageStyle, style]}
            contentFit="cover"
          />
          {user?.isOnline && (
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: currentTheme.success,
                  borderColor: currentTheme.cardForeground ?? "#fff",
                },
              ]}
            />
          )}
        </>
      ) : (
        <>
          <View style={[baseFallbackStyle, { backgroundColor: currentTheme.sidebarPrimary }, style]}>
            <Text style={{ color: currentTheme.sidebarPrimaryForeground, fontWeight: "700" }}>
              {getInitials(user?.name)}
            </Text>
          </View>
          {user?.isOnline && (
            <View
              style={[
                styles.onlineDot,
                {
                  backgroundColor: currentTheme.success,
                  borderColor: currentTheme.cardForeground ?? "#fff",
                },
              ]}
            />
          )}
        </>
      )}
    </View>
  );
};

export default Avatar;

const styles = StyleSheet.create({
  container: {
    position: "relative", // important for online dot placement
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 10,
    height: 10,
    borderRadius: 10 / 2,
    borderWidth: 1.5,
  },
});
