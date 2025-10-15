// app/(auth)/Login.tsx
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";

const { width } = Dimensions.get("window");

export default function LoginScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { setIsLoggedIn } = useAuth();

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

  const onLogin = () => {
    setIsLoggedIn(true);
    router.replace("/(tabs)");
    Alert.alert("Login Info", `Email: ${email}\nPassword: ${password}`);
  };

  const onGoogleSignIn = () => {
    Alert.alert("Google Sign-In", "Implement Google Auth here");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
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
        <View style={{width:'100%', marginHorizontal: 'auto', alignItems:'center'}}>
            <Animated.Image
          source={require("../../assets/image/detailed_logo.jpg")}
          style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
        />
        </View>
        <Text style={[styles.title, { color: currentTheme.foreground }]}>
          Welcome Back
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

        <TextInput
          placeholder="Password"
          placeholderTextColor={currentTheme.mutedForeground}
          value={password}
          onChangeText={setPassword}
          style={[
            styles.input,
            {
              backgroundColor: currentTheme.background,
              color: currentTheme.foreground,
            },
          ]}
          secureTextEntry
        />

        <TouchableOpacity onPress={() => router.push("./ForgotPassword")}>
          <Text style={[styles.forgotText, { color: currentTheme.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: currentTheme.primary,
              shadowColor: currentTheme.primary,
            },
          ]}
          onPress={onLogin}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: currentTheme.primaryForeground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            Login
          </Text>
        </TouchableOpacity>

        <Text
          style={{
            color: currentTheme.mutedForeground,
            marginVertical: 12,
            textAlign: "center",
          }}
        >
          or continue with
        </Text>

        <TouchableOpacity
          style={[styles.googleButton]}
          onPress={onGoogleSignIn}
          activeOpacity={0.8}
        >
          <Ionicons
            name="logo-google"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            Continue with Google
          </Text>
        </TouchableOpacity>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <Text style={{ color: currentTheme.foreground }}>
            Don't have an account?{" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/Signup")}>
            <Text style={{ color: currentTheme.primary, fontWeight: "700" }}>
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  forgotText: {
    alignSelf: "flex-end",
    marginBottom: 16,
    fontWeight: "600",
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
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#4285F4",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
});
