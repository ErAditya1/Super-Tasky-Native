// components/RouteGuard.tsx
import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, Pressable, StyleSheet } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "expo-router";
import LoadingScreen from "./LoadingScreen";
import ApiCalls from "./ApiCalls";
import { getTokens } from "@/lib/api";

interface RouteGuardProps {
  children: React.ReactNode;
  publicRoutes?: string[];
  commonRoutes?: string[];
}

type RetryFn = () => Promise<void> | void;

function RefreshScreen({ onRetry }: { onRetry: RetryFn }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetry = async () => {
    setError(null);
    try {
      setBusy(true);
      const result = onRetry();
      if (result instanceof Promise) await result;
    } catch (err: any) {
      setError(err?.message ?? "Failed to connect to server. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connection problem</Text>
      <Text style={styles.message}>
        We couldn't reach the server to refresh your session. Tap Retry to try again.
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={handleRetry}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          busy && styles.buttonDisabled,
        ]}
        disabled={busy}
      >
        {busy ? <ActivityIndicator /> : <Text style={styles.buttonText}>Retry</Text>}
      </Pressable>
    </View>
  );
}

export default function RouteGuard({
  children,
  publicRoutes = ["/Login", "/Signup", "/ForgotPassword", "/verify"],
  commonRoutes = ["/terms", "/privacy", "/support"],
}: RouteGuardProps) {
  const { isLoggedIn, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  console.log("RouteGuard pathname:", pathname);

  const isPublic = publicRoutes.some((p) => pathname.startsWith(p) || pathname === "/");
  const isCommon = commonRoutes.some((p) => pathname.startsWith(p));

  // Refresh user on mount if needed
  useEffect(  () => {
    getTokens().then((t)=>{
     
      if(!t.accessToken && !t.refreshToken) return
       if (!isLoggedIn && !isPublic && !isCommon) refreshUser();
    })
   
    // intentionally only runs when pathname changes (keeps behavior similar to your original)
  }, [pathname]);

  // Redirect logic
  useEffect(() => {
    if (!loading) {
      if (!isLoggedIn && !isPublic && !isCommon) {
        router.replace("/Login"); // protected route
      }
      if (isLoggedIn && isPublic) {
        router.replace("/"); // logged-in users cannot access public routes
      }
    }
  }, [isLoggedIn, loading, pathname]);

  if (loading) {
    return <LoadingScreen />;
  } else if (!isLoggedIn && !isPublic && !isCommon) {
    // Show retry UI to allow manual refresh attempts when automatic refresh failed
    return <RefreshScreen onRetry={async () => await refreshUser()} />;
  }

  return (
    <>
      <ApiCalls />
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
  },
  message: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 12,
  },
  error: {
    color: "crimson",
    marginBottom: 8,
    textAlign: "center",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: "#0a84ff",
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
});
