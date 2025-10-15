// app/(tabs)/notifications.tsx
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  SafeAreaView,
  Alert,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

type NotificationType = "task" | "mention" | "member" | "reminder" | "comment";

type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  avatar?: string;
  initials: string;
};

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    type: "task",
    title: "New task assigned",
    message: "Sarah Chen assigned 'Complete project proposal' to you",
    timestamp: "5m ago",
    read: false,
    initials: "SC",
  },
  {
    id: "2",
    type: "mention",
    title: "You were mentioned",
    message: "@You Mike Torres mentioned you in Design Team chat",
    timestamp: "1h ago",
    read: false,
    initials: "MT",
  },
  {
    id: "3",
    type: "comment",
    title: "New comment",
    message: "Emma Davis commented on 'Landing page redesign'",
    timestamp: "2h ago",
    read: true,
    initials: "ED",
  },
  {
    id: "4",
    type: "reminder",
    title: "Task deadline approaching",
    message: "'Review pull requests' is due tomorrow",
    timestamp: "3h ago",
    read: true,
    initials: "🔔",
  },
  {
    id: "5",
    type: "member",
    title: "New team member",
    message: "Alex Johnson joined your team 'Marketing Squad'",
    timestamp: "1d ago",
    read: true,
    initials: "AJ",
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];

  const [notifications, setNotifications] = useState<NotificationItem[]>(
    INITIAL_NOTIFICATIONS
  );
  const [vibrationEnabled, setVibrationEnabled] = useState<boolean>(true);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIconName = (type: NotificationType) => {
    switch (type) {
      case "task":
        return "checkmark-done";
      case "mention":
        return "at";
      case "member":
        return "person-add";
      case "reminder":
        return "notifications";
      case "comment":
        return "chatbubble-ellipses";
      default:
        return "alert-circle";
    }
  };

  const getIconBg = (type: NotificationType) => {
    // map to theme tokens where possible
    switch (type) {
      case "task":
        return colors.chart2 ?? "#54a987";
      case "mention":
        return colors.accent ?? "#9ca3ff";
      case "member":
        return colors.chart4 ?? "#eb9a3b";
      case "reminder":
        return colors.destructive ?? "#d05d44";
      case "comment":
        return colors.chart3 ?? "#4e68c7";
      default:
        return colors.muted ?? "#6b7280";
    }
  };

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const toggleRead = useCallback((id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  // Simulate receiving a new notification (for demo/testing)
  const simulateNotification = useCallback(() => {
    const next: NotificationItem = {
      id: Date.now().toString(),
      type: "task",
      title: "New task assigned",
      message: "You received a simulated task",
      timestamp: "just now",
      read: false,
      initials: "ST",
    };
    setNotifications((prev) => [next, ...prev]);

    if (vibrationEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [vibrationEnabled]);

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const IconName = getIconName(item.type);
    const iconBg = getIconBg(item.type);

    return (
      <Pressable
        onPress={() => {
          toggleRead(item.id);
          // TODO: navigate to relevant screen, e.g. task / comment / chat
          Alert.alert(item.title, item.message);
        }}
        style={({ pressed }) => [
          styles.row,
          {
            backgroundColor: !item.read ? adjustAlpha(colors.primary, 0.06) : colors.background,
            borderBottomColor: colors.border,
            opacity: pressed ? 0.95 : 1,
          },
        ]}
      >
        <View style={styles.left}>
          {/* avatar or initials */}
          {item.avatar ? (
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: colors.sidebarAccent ?? "#ddd" }]}>
              <Text style={[styles.avatarInitials, { color: colors.sidebarAccentForeground ?? "#fff" }]}>{item.initials}</Text>
            </View>
          )}

          {/* icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: iconBg, borderColor: colors.background }]}>
            <Ionicons name={IconName as any} size={14} color={colors.primaryForeground ?? "#fff"} />
          </View>
        </View>

        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
              {item.title}
            </Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
          </View>

          <Text numberOfLines={2} style={[styles.message, { color: colors.mutedForeground }]}>
            {item.message}
          </Text>
          <Text style={[styles.ts, { color: colors.mutedForeground }]}>{item.timestamp}</Text>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      <View style={[styles.header, { borderBottomColor: colors.border, }]}>
        <View>
          <Text style={[styles.h2, { color: colors.foreground }]}>Activity</Text>
          {unreadCount > 0 ? (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{unreadCount} new</Text>
          ) : (
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>You're all caught up</Text>
          )}
        </View>

        <View style={styles.headerActions}>
          <Pressable
            onPress={() => markAllAsRead()}
            style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.8 : 1 }]}
            accessibilityLabel="Mark all as read"
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>Mark all as read</Text>
          </Pressable>

          <Pressable
            onPress={() => simulateNotification()}
            style={({ pressed }) => [{ padding: 8, marginLeft: 8, opacity: pressed ? 0.8 : 1 }]}
            accessibilityLabel="Simulate notification"
          >
            <MaterialIcons name="send" size={20} color={colors.mutedForeground} />
          </Pressable>
        </View>
      </View>

      {/* vibration toggle */}
      <View style={[styles.controlsRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="phone-portrait" size={18} color={colors.mutedForeground} />
          <Text style={{ marginLeft: 8, color: colors.foreground }}>Vibration</Text>
        </View>
        <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} thumbColor={vibrationEnabled ? colors.primary : undefined} />
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 0 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={42} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No notifications</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>You're all caught up! Check back later for updates.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ---------- helpers & styles ----------
function adjustAlpha(hex: string, alpha: number) {
  // hex like #RRGGBB or fallback
  if (!hex || hex[0] !== "#") return `rgba(0,0,0,${alpha})`;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 },
  h2: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13 },

  headerActions: { flexDirection: "row", alignItems: "center" },

  controlsRow: { paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 },

  row: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, alignItems: "flex-start", borderBottomWidth: 1 },
  left: { width: 56, alignItems: "center", marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarFallback: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontWeight: "700" },

  iconBadge: { position: "absolute", right: -2, bottom: -4, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 2 },

  body: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontWeight: "700", fontSize: 15, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },

  message: { marginTop: 4, fontSize: 13 },
  ts: { marginTop: 6, fontSize: 12 },

  empty: { alignItems: "center", padding: 36 },
  emptyTitle: { marginTop: 12, fontSize: 18, fontWeight: "700" },
  emptySub: { marginTop: 6, fontSize: 13, textAlign: "center", maxWidth: 320 },
});
