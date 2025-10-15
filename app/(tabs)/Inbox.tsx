// app/(tabs)/inbox.tsx
import React, { JSX, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

type ChatMeta = {
  id: string;
  title: string;
  lastMessage?: string;
  updatedAt?: string;
  unread?: number;
  initials?: string;
};

const STATIC_CHATS: ChatMeta[] = [
  { id: "chat-1", title: "Design Team", lastMessage: "Sarah: Updated the mockups", updatedAt: new Date().toISOString(), unread: 3, initials: "DT" },
  { id: "chat-2", title: "Alex Johnson", lastMessage: "Can you review the task I assigned?", updatedAt: new Date().toISOString(), unread: 1, initials: "AJ" },
  { id: "chat-3", title: "Marketing Squad", lastMessage: "Campaign launching next week!", updatedAt: new Date().toISOString(), unread: 0, initials: "MS" },
];

export default function InboxTab(): JSX.Element {
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [chats, setChats] = useState<ChatMeta[]>(STATIC_CHATS);

  useEffect(() => {
    // demo: you could update chats from local storage or simulated events
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background}]}>
      <View style={[styles.header, {  borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.cardForeground }]}>Inbox</Text>
        <TouchableOpacity onPress={() => router.push("/chat/new")} style={styles.iconBtn}>
          <Icon name="plus" size={22} color={colors.cardForeground} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: colors.border }]}
            onPress={() => router.push(`/chat/${item.id}`)}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>{item.initials ?? item.title?.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ color: colors.cardForeground, fontWeight: "700" }}>{item.title}</Text>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Now</Text>
              </View>
              <Text style={{ color: colors.mutedForeground, marginTop: 6 }} numberOfLines={1}>{item.lastMessage}</Text>
            </View>
            {item.unread ? (
              <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>{item.unread}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 64, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  title: { fontSize: 20, fontWeight: "700" },
  iconBtn: { padding: 8 },
  row: { paddingHorizontal: 12, paddingVertical: 14, flexDirection: "row", alignItems: "center", borderBottomWidth: 1 },
  avatar: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  badge: { minWidth: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 },
});
