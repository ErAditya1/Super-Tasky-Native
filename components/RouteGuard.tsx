// components/RouteGuard.tsx
import React, { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "expo-router";
import LoadingScreen from "./LoadingScreen";
import ApiCalls from "./ApiCalls";

interface RouteGuardProps {
  children: React.ReactNode;
  publicRoutes?: string[];
  commonRoutes?: string[];
}

export default function RouteGuard({
  children,
  publicRoutes = ["/Login", "/Signup", "/ForgotPassword", "/verify"],
  commonRoutes = ["/terms", "/privacy", "/support"],
}: RouteGuardProps) {
  const { isLoggedIn, loading, refreshUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  console.log(pathname)

  const isPublic = publicRoutes.some((p) => pathname.startsWith(p) || pathname === "/");
  const isCommon = commonRoutes.some((p) => pathname.startsWith(p) );

  // Refresh user on mount if needed
  useEffect(() => {
    if (!isLoggedIn && !isPublic && !isCommon) refreshUser();
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
    return (
      <LoadingScreen/>
    );
  }

  return <>
  <ApiCalls/>
  {children}
  </>;
}
