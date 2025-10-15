// app/(auth)/Welcome.tsx
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

const { width } = Dimensions.get("window");

export default function WelcomeScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Decorative circles */}
      <View style={[styles.circle, { top: -50, left: -50, backgroundColor: "#FFD6D633" }]} />
      <View style={[styles.circle, { bottom: -60, right: -60, backgroundColor: "#B0FFDC33" }]} />

      <Animated.Image
        source={require("../../assets/image/detailed_logo.jpg")}
        style={[styles.logo, { transform: [{ scale: scaleAnim }] }]}
        resizeMode="contain"
      />

      <Text style={[styles.tagline, { color: currentTheme.foreground }]}>
        Organize tasks. Boost productivity. Lead your team.
      </Text>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: currentTheme.primary, shadowColor: currentTheme.primary }]}
        onPress={() => router.push("/Login")}
        activeOpacity={0.8}
      >
        <Text style={{ color: currentTheme.primaryForeground, fontWeight: "700", fontSize: 18 }}>
          Get Started
        </Text>
      </TouchableOpacity>

      <Text style={[styles.footerText, { color: currentTheme.mutedForeground }]}>
        By continuing, you agree to our Terms & Privacy Policy
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: 24,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  tagline: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 28,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 16,
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
  },
  circle: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
  },
});
