// app/chat/[chatId].tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import ChatPane from "@/components/ChatPane";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

export default function ChatScreen({ params }: { params: { chatId: string } }) {
  // expo-router injects params in the component props
  const chatId = params?.chatId;
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen options={{ title: "Chat", headerShown: false }} />
      <ChatPane chatId={chatId} onBack={()=> router.back()} />
    </View>
  );
}
