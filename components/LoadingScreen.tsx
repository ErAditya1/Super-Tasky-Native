import React, { useRef, useEffect } from "react";
import { View, Text, Animated, Dimensions, StyleSheet } from "react-native";
import { ActivityIndicator } from "react-native";
import LottieView from "lottie-react-native";

const { width, height } = Dimensions.get("window");

interface LoadingScreenProps {
  message?: string;
  size?: number;
}

export default function LoadingScreen({
  message = "Loading...",
  size = 100,
}: LoadingScreenProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  return (
    <View style={styles.container}>
      {/* Optional Lottie Animation */}
      <LottieView
        source={require("../assets/images/detailed_logo.jpg")}
        autoPlay
        loop
        style={{ width: 200, height: 200 }}
      />

      {/* Pulsing text */}
      <Animated.Text style={[styles.text, { transform: [{ scale: pulseAnim }] }]}>
        {message}
      </Animated.Text>

      {/* Fallback spinner */}
      <ActivityIndicator size="large" color="#ffffff" style={{ marginTop: 20 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1abc9c", // stylish teal background
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    marginTop: 16,
  },
});
