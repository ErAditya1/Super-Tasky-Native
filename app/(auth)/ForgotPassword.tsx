// app/(auth)/ForgotPassword.tsx
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

const { width } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const [email, setEmail] = React.useState("");

  // Animated logo
  const logoScale = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const onSubmit = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter a valid email");
      return;
    }
    Alert.alert("Password Reset", `Reset link sent to ${email}`);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: currentTheme.background }]}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: currentTheme.card,
            shadowColor: currentTheme.primary,
          },
        ]}
      >
        <View
          style={{
            width: "100%",
            marginHorizontal: "auto",
            alignItems: "center",
          }}
        >
          <Animated.Image
            source={require("../../assets/image/detailed_logo.jpg")}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>
        <Text style={[styles.title, { color: currentTheme.foreground }]}>
          Forgot Password
        </Text>

        <Text
          style={[styles.subtitle, { color: currentTheme.mutedForeground }]}
        >
          Enter your email address to receive a password reset link.
        </Text>

        <TextInput
          placeholder="Email"
          placeholderTextColor={currentTheme.mutedForeground}
          value={email}
          onChangeText={setEmail}
          style={[
            styles.input,
            {
              backgroundColor: currentTheme.background,
              color: currentTheme.foreground,
            },
          ]}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: currentTheme.primary,
              shadowColor: currentTheme.primary,
            },
          ]}
          onPress={onSubmit}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: currentTheme.primaryForeground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Submit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/Login")}
          style={{ marginTop: 16 }}
        >
          <Text
            style={{
              color: currentTheme.primary,
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Back to Login
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  logo: {
    width: width * 0.2,
    height: width * 0.2,

    marginBottom: 32,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
