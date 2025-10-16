// app/(auth)/Login.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/context/AuthContext";
import { googleLogin, login } from "@/lib/api/auth";
import { useForm, Controller } from "react-hook-form";
import { KEY_ACCESS, KEY_DEVICE, KEY_REFRESH, setTokens } from "@/lib/api";

const { width } = Dimensions.get("window");

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const { setIsLoggedIn } = useAuth();
  const [loading, setLoading] = useState(false);

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

  // React Hook Form setup
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setLoading(true);
    try {
      const res = await login({
        identifier: data.email,
        password: data.password,
      });
      console.log("Login response:", res);

      if (res.success) {
        // Save tokens in SecureStore
        router.push("/(tabs)");
        const accessToken = res.data.data.accessToken;
        const refreshToken = res.data.data.refreshToken;
        const deviceId = res.data.data.user?.deviceId || "";

        await setTokens(KEY_ACCESS, accessToken);
        await setTokens(KEY_REFRESH, refreshToken);
        if (deviceId) await setTokens(KEY_DEVICE, deviceId);
        setIsLoggedIn(true);
      } else {
        Alert.alert("Login Failed", res.message || "Invalid credentials");
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Login Failed", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const onGoogleSignIn = async () => {
    const res = await googleLogin();

    if (res?.type === "success") {
      // Call your backend to exchange code for JWT or session
      // Then setIsLoggedIn(true)
      Alert.alert("Login successful!");
    } else {
      Alert.alert("Login canceled or failed");
    }
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
        <View style={{ width: "100%", alignItems: "center" }}>
          <Animated.Image
            source={require("../../assets/images/detailed_logo.jpg")}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: currentTheme.foreground }]}>
          Welcome Back
        </Text>

        {/* Email input */}
        <Controller
          control={control}
          name="email"
          rules={{ required: "Email is required" }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Email or Username"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.foreground,
                  borderColor: errors.email ? "red" : "#ccc",
                },
              ]}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          )}
        />
        {errors.email && (
          <Text style={{ color: "red", marginBottom: 8 }}>
            {errors.email.message}
          </Text>
        )}

        {/* Password input */}
        <Controller
          control={control}
          name="password"
          rules={{ required: "Password is required" }}
          render={({ field: { onChange, onBlur, value } }) => (
            <TextInput
              placeholder="Password"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.foreground,
                  borderColor: errors.password ? "red" : "#ccc",
                },
              ]}
              secureTextEntry
            />
          )}
        />
        {errors.password && (
          <Text style={{ color: "red", marginBottom: 8 }}>
            {errors.password.message}
          </Text>
        )}

        <TouchableOpacity onPress={() => router.push("./ForgotPassword")}>
          <Text style={[styles.forgotText, { color: currentTheme.primary }]}>
            Forgot Password?
          </Text>
        </TouchableOpacity>

        {/* Login button */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: currentTheme.primary,
              shadowColor: currentTheme.primary,
              opacity: loading ? 0.7 : 1,
            },
          ]}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.8}
          disabled={loading}
        >
          <Text
            style={{
              color: currentTheme.primaryForeground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {loading ? "Logging in..." : "Login"}
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
          style={styles.googleButton}
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
