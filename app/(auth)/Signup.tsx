// app/(auth)/Signup.tsx
import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { useDebounce } from "use-debounce"; // use-debounce package
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import { checkUsername, register } from "@/lib/api/auth";
import { AxiosError } from "axios";
import { ApiResponse } from "@/types/ApiResponse";
import { useToast } from "@/components/Toast";

const { width } = Dimensions.get("window");

type FormValues = {
  name: string;
  username: string;
  email: string;
  password: string;
  teamCode?: string;
};

export default function SignupScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const logoScale = useRef(new Animated.Value(0.8)).current;

  const [usernameMessage, setUsernameMessage] = useState("");
  const [suggestUsername, setSuggestUsername] = useState("");
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const toast = useToast()

  const { control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
      teamCode: "",
    },
  });

  const usernameValue = watch("username");
  const [debouncedUsername] = useDebounce(usernameValue, 1000);

  // Animate logo
  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  // Username availability check
  useEffect(() => {
    const checkUsernameAvailable = async () => {
      if (!debouncedUsername.trim()) {
        setUsernameMessage("");
        setSuggestUsername("");
        return;
      }

      setIsCheckingUsername(true);
      setUsernameMessage("");
      setSuggestUsername("");

      try {
        const response = await checkUsername(debouncedUsername);
        setUsernameMessage(response.data.message);
        setSuggestUsername(response.data.data?.username || "");
      } catch (error) {
        const axiosError = error as AxiosError<ApiResponse>;
        setUsernameMessage(
          axiosError.response?.data.message ?? "Error checking username"
        );
      } finally {
        setIsCheckingUsername(false);
      }
    };

    checkUsernameAvailable();
  }, [debouncedUsername]);

  const onSubmit = async (data: FormValues) => {
    if(loading) return
    if (!data.name || !data.username || !data.email || !data.password) {
      toast.show("Please fill all required fields","danger", );
      return;
    }

    
    try {
      setLoading(true)
      const response = await register(data);
      console.log(response)
      if(response.success){
        toast.show(response.data.message, "success")
      router.replace({
        pathname: "/(auth)/verify/[username]",
        params: { username: response.data.data.username },
      });
      }else{
        toast.show(response.message|| "Registration failed" , "danger")
      }
      setLoading(false)
      
    } catch (error) {
      
     console.log(error)
    }
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
            source={require("../../assets/images/detailed_logo.jpg")}
            style={[styles.logo, { transform: [{ scale: logoScale }] }]}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: currentTheme.foreground }]}>
          Sign Up
        </Text>

        {/* Full Name */}
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Full Name"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.foreground,
                },
              ]}
            />
          )}
        />

        {/* Username */}
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, value } }) => (
            <>
              <TextInput
                placeholder="Username"
                placeholderTextColor={currentTheme.mutedForeground}
                value={value}
                onChangeText={onChange}
                style={[
                  styles.input,
                  {
                    backgroundColor: currentTheme.background,
                    color: currentTheme.foreground,
                  },
                ]}
              />
              {isCheckingUsername && (
                <ActivityIndicator size="small" color={currentTheme.primary} />
              )}
              {!isCheckingUsername && usernameMessage ? (
                <Text
                  style={{
                    color:
                      usernameMessage === "Username is available"
                        ? "green"
                        : "red",
                    marginBottom: 4,
                  }}
                >
                  {usernameMessage}
                </Text>
              ) : null}
              {!isCheckingUsername && suggestUsername ? (
                <Text style={{ color: "green", marginBottom: 4 }}>
                  Suggested: {suggestUsername}
                </Text>
              ) : null}
            </>
          )}
        />

        {/* Email */}
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Email"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
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
          )}
        />

        {/* Password */}
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Password"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.foreground,
                },
              ]}
              secureTextEntry={!showPassword}
            />
          )}
        />

        {/* Team Code */}
        <Controller
          control={control}
          name="teamCode"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Team Code (optional)"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
              style={[
                styles.input,
                {
                  backgroundColor: currentTheme.background,
                  color: currentTheme.foreground,
                },
              ]}
            />
          )}
        />

        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: currentTheme.primary,
              shadowColor: currentTheme.primary,
            },
          ]}
          onPress={handleSubmit(onSubmit)}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: currentTheme.primaryForeground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {loading ?"Signing up":"Sign Up"}
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
            Already have an account? {" "}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/Login")}>
            <Text style={{ color: currentTheme.primary, fontWeight: "700" }}>
              Login
            </Text>
          </TouchableOpacity>
        </View>
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
    marginBottom: 16,
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
