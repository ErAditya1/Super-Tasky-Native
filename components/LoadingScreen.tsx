// components/LoadingScreen.tsx
import React, { useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ImageSourcePropType,
  Animated,
  Easing,
  Platform,
  useColorScheme,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";

type Props = {
  /** Loading headline */
  message?: string;
  /** Sub-text below the headline */
  subMessage?: string;
  /** 0..1 progress (optional). If provided, a bar will show. */
  progress?: number | null;
  /** Logo source — e.g. require("../assets/images/tasky_logo.png") */
  logoSource?: ImageSourcePropType;
  /** Logo size in px */
  size?: number;
};

export default function LoadingScreen({
  message = "Preparing your workspace…",
  subMessage,
  progress = null,
  logoSource = require("../assets/images/detailed_logo.jpg"),
  size = 120,
}: Props) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  // Animations
  const scale = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulse
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1.0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ])
    );

    // Subtle tilt
    const tilt = Animated.loop(
      Animated.sequence([
        Animated.timing(rotate, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(rotate, { toValue: -1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );

    // Glow behind logo
    const glowAnim = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ])
    );

    pulse.start();
    tilt.start();
    glowAnim.start();

    return () => {
      pulse.stop();
      tilt.stop();
      glowAnim.stop();
    };
  }, [glow, rotate, scale]);

  const rotateDeg = rotate.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ["-4deg", "0deg", "4deg"],
  });

  // Colors
  const palette = useMemo(
    () =>
      isDark
        ? {
            bgTop: "#0b1622",
            bgBottom: "#0e2231",
            text: "#f5f7fb",
            muted: "#9fb3c8",
            barBg: "#1b3347",
            barFill: "#4cc9f0",
            glow: "rgba(76, 201, 240, 0.35)",
          }
        : {
            bgTop: "#b2f7ef",
            bgBottom: "#a0e7e5",
            text: "#0b1020",
            muted: "#35515f",
            barBg: "#cfe8f3",
            barFill: "#0ea5e9",
            glow: "rgba(14, 165, 233, 0.35)",
          },
    [isDark]
  );

  const glowSize = size * 1.5;
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });

  return (
    <View style={styles.root} accessible accessibilityRole="progressbar" accessibilityLabel="Loading">
      <StatusBar style={isDark ? "light" : "dark"} />
      <LinearGradient
        colors={[palette.bgTop, palette.bgBottom]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Logo + glow */}
      <View style={styles.centerStack}>
        {/* <Animated.View
          style={[
            styles.glow,
            {
              width: glowSize,
              height: glowSize,
              borderRadius: glowSize / 2,
              backgroundColor: palette.glow,
              opacity: glowOpacity,
            },
          ]}
        /> */}
        <Animated.Image
          source={logoSource}
          resizeMode="contain"
          style={{
            width: size,
            height: size,
            borderRadius: 20,
            transform: [{ scale }, { rotate: rotateDeg }],
          }}
          accessibilityIgnoresInvertColors
        />
      </View>

      {/* Messages */}
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: palette.text }]}>{message}</Text>
        {subMessage ? <Text style={[styles.sub, { color: palette.muted }]}>{subMessage}</Text> : null}
      </View>

      {/* Progress or spinner */}
      {typeof progress === "number" ? (
        <View style={[styles.progressWrap, { backgroundColor: palette.barBg }]}>
          <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(1, progress)) * 100}%`, backgroundColor: palette.barFill }]} />
        </View>
      ) : (
        <ActivityIndicator size="small" color={palette.text} style={{ marginTop: 14 }} />
      )}

      {/* Footer tip (optional) */}
      <Text style={[styles.footer, { color: palette.muted }]}>
        {Platform.select({ ios: "Optimized for iOS & Android ", android: "Optimized for Android & iOS " })}{" "}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center" },
  centerStack: { alignItems: "center", justifyContent: "center" },
  glow: { position: "absolute" },
  textBlock: { marginTop: 18, alignItems: "center", paddingHorizontal: 24 },
  title: { fontSize: 18, fontWeight: "800", letterSpacing: 0.3, textAlign: "center" },
  sub: { marginTop: 6, fontSize: 14, textAlign: "center", opacity: 0.9 },
  progressWrap: {
    width: 210,
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 16,
  },
  progressFill: { height: "100%" },
  footer: { position: "absolute", bottom: 24, fontSize: 12, opacity: 0.8 },
});
