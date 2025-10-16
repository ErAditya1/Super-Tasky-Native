// app/(auth)/VerifyAccount.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Dimensions,
} from "react-native";
import { useGlobalSearchParams, useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { verifyAccount, resendVerificationCode } from "@/lib/api/auth";
import { ApiResponse } from "@/types/ApiResponse";
import { AxiosError } from "axios";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useToast } from "@/components/Toast";

const { width } = Dimensions.get("window");

type FormValues = {
  code: string;
};

export default function VerifyAccountScreen() {
  const router = useRouter();
  const { username } = useGlobalSearchParams();

  const toast = useToast()
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resendCode, setResendCode] = useState(false);

  const { control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: { code: "" },
  });

  // Autofill OTP if passed via query
  useEffect(() => {
    if ((username as any)?.otp) {
      setValue("code", (username as any).otp);
    }
  }, [username, setValue]);

  const onSubmit = async (data: FormValues) => {
    if (!data.code) {
      Alert.alert("Error", "Please enter the verification code.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await verifyAccount({ username, code: data.code });

      if (res.success) {
        toast.show("Verified successfully!", "success");
        router.replace("/Login");
      } else {
        toast.show(res.message || "Verification failed", "danger");
      }
    } catch (error) {
      toast.show("An error occurred", "danger");
      const axiosError = error as AxiosError<ApiResponse>;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCode) return;
    setResendCode(true);
    try {
      const response = await resendVerificationCode(username);

      if (response.success) {
        toast.show("Code resent successfully!", "success");
      } else {
        toast.show(response?.message || "Resend failed", "danger");
      }
    } catch (error) {
      toast.show("Something went wrong", "danger");
      const axiosError = error as AxiosError<ApiResponse>;
    } finally {
      setTimeout(() => setResendCode(false), 3000); // prevent spamming
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
        <Text style={[styles.title, { color: currentTheme.foreground }]}>
          Verify Your Account
        </Text>
        <Text
          style={{
            color: currentTheme.foreground,
            marginBottom: 16,
            textAlign: "center",
          }}
        >
          Enter the 6-digit verification code sent to your email
        </Text>

        <Controller
          control={control}
          name="code"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder="Enter OTP"
              placeholderTextColor={currentTheme.mutedForeground}
              value={value}
              onChangeText={onChange}
              keyboardType="numeric"
              maxLength={6}
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
          disabled={isSubmitting}
        >
          <Text
            style={{
              color: currentTheme.primaryForeground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {isSubmitting ? "Verifying..." : "Verify"}
          </Text>
        </TouchableOpacity>

        {!resendCode && (
          <TouchableOpacity
            onPress={handleResendCode}
            style={{ marginTop: 12 }}
          >
            <Text style={{ color: currentTheme.primary, textAlign: "center" }}>
              Resend Code
            </Text>
          </TouchableOpacity>
        )}
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
    textAlign: "center",
    fontSize: 18,
    letterSpacing: 8,
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
