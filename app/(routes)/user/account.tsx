// app/screens/AccountScreen.tsx
import React, { useMemo } from "react";
import {
  SafeAreaView,
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  StatusBar,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// If you use a theme context in your app, keep these imports.
// Otherwise swap `useThemeToggle()` and `theme[...]` with simple color constants.
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

// ---------- SafeText helper (clamps fontSize to avoid RN Fabric negative font crash) ----------
import { Text as RNText } from "react-native";
import { router, Stack } from "expo-router";
const DEFAULT_FONT_SIZE = 14;
const clampFontSize = (v?: number) => {
  if (v == null || Number.isNaN(Number(v))) return DEFAULT_FONT_SIZE;
  const n = Math.round(Number(v));
  return Math.max(8, Math.min(40, n));
};
function SafeText(props: any) {
  const { style, children, ...rest } = props;
  let fontSize: number | undefined;
  if (Array.isArray(style)) {
    for (const s of style) {
      if (s && typeof s === "object" && (s as any).fontSize != null) {
        fontSize = (s as any).fontSize;
        break;
      }
    }
  } else if (style && typeof style === "object") {
    fontSize = (style as any).fontSize;
  }
  const safe = clampFontSize(fontSize);
  const newStyle = [{ ...(style as object) }, { fontSize: safe }];
  return (
    <RNText {...rest} style={newStyle} allowFontScaling={false}>
      {children}
    </RNText>
  );
}

// ---------- Static demo user (based on your schema) ----------
const DEMO_USER = {
  name: "John Doe",
  email: "johndoe@example.com",
  mobileNumber: "+1 234 567 890",
  username: "johndoe",
  role: "user",
  loginType: "email_password",
  avatar: {
    url: "https://i.pravatar.cc/300",
  }, // or { url: 'https://...' }
  about:
    "Productivity enthusiast. I build daily routines, public checklists and share templates for teammates.",
  isOnline: true,
  lastActive: new Date().toISOString(),
  emailVerified: true,
  preferences: {
    notificationsEnabled: true,
    darkMode: false,
    focusMode: true,
    theme: "zen",
  },
  taskStats: {
    todayCompleted: 5,
    totalCompleted: 245,
    streakCount: 12,
    lastActiveDate: new Date().toISOString(),
  },
  devices: [
    {
      deviceId: "device-001",
      ipAddress: "192.168.1.12",
      browser: "Chrome",
      os: "Windows 11",
      deviceType: "Desktop",
      location: { country: "USA", city: "New York" },
      loginStatus: "success",
      lastLogin: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: true,
    },
    {
      deviceId: "device-002",
      ipAddress: "192.168.1.33",
      browser: "Safari",
      os: "iOS 17",
      deviceType: "Mobile",
      location: { country: "USA", city: "San Francisco" },
      loginStatus: "success",
      lastLogin: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isOnline: false,
    },
  ],
  currentTeam: { name: "Productivity Masters" },
  teams: [{ name: "Super Taskers" }, { name: "Daily Achievers" }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ---------- Small presentational parts ----------
const Metric = ({ icon, value, label, colors }: any) => (
  <View style={[cardStyles.metric, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <View style={[cardStyles.metricIcon, { borderColor: colors.border }]}>
      <Icon name={icon} size={20} color={colors.primary} />
    </View>
    <View style={{ marginLeft: 10 }}>
      <SafeText style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>{value}</SafeText>
      <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>{label}</SafeText>
    </View>
  </View>
);

const KeyValueRow = ({ label, value, colors }: any) => (
  <View style={[cardStyles.kvRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
    <SafeText style={{ color: colors.mutedForeground }}>{label}</SafeText>
    <SafeText style={{ color: colors.foreground }}>{value ?? "-"}</SafeText>
  </View>
);

// ---------- Main component ----------
export default function AccountScreen({ navigation }: any) {
  // theme
  let colors;
  try {
    const { isDark } = useThemeToggle() as any;
    colors = theme[isDark ? "dark" : "light"];
  } catch {
    // fallback palette
    colors = {
      background: "#fff",
      card: "#fff",
      border: "#e6e6e6",
      foreground: "#111827",
      mutedForeground: "#6b7280",
      primary: "#4f46e5",
      cardForeground: "#111827",
      destructive: "#dc2626",
      primaryForeground: "#fff",
    };
  }

  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = DEMO_USER;

  const initials = useMemo(() => {
    const parts = (user.name || user.username || "U").split(" ");
    return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  }, [user]);

  const avatarSize = Math.max(64, Math.min(120, Math.round(width * 0.18)));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />

      {/* custom header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerLeft}>
          <Icon name="arrow-left" size={20} color={colors.cardForeground ?? colors.foreground} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700", fontSize: 18 }}>Account</SafeText>
          <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>Profile & settings </SafeText>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity style={[styles.iconBtn, { borderColor: colors.border }]}>
            <Icon name="pencil-outline" size={18} color={colors.cardForeground ?? colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {/* top profile card */}
        <View style={[cardStyles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: avatarSize, height: avatarSize }}>
              {user.avatar?.url ? (
                <Image
                  source={{ uri: user.avatar?.url }}
                  style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 6 }}
                />
              ) : (
                <View
                  style={[
                    cardStyles.avatarPlaceholder,
                    { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 6, borderColor: colors.primary },
                  ]}
                >
                  <SafeText style={{ color: colors.primary, fontWeight: "700", fontSize: Math.round(avatarSize / 4) }}>
                    {initials.toUpperCase()}
                  </SafeText>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <SafeText style={{ color: colors.foreground, fontSize: 18, fontWeight: "700" }}>{user.name}</SafeText>
              <SafeText style={{ color: colors.mutedForeground, marginTop: 4 }}>@{user.username}</SafeText>

              <SafeText style={{ color: colors.mutedForeground, marginTop: 8 }}>{user.about}</SafeText>

              <View style={{ flexDirection: "row", marginTop: 12 }}>
                <View style={{ marginRight: 16 }}>
                  <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>{user.taskStats.totalCompleted}</SafeText>
                  <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>Completed</SafeText>
                </View>

                <View style={{ marginRight: 16 }}>
                  <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>{user.taskStats.streakCount}</SafeText>
                  <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>Streak</SafeText>
                </View>

                <View>
                  <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>{user.devices.length}</SafeText>
                  <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>Devices</SafeText>
                </View>
              </View>
            </View>

            <View style={{ alignItems: "center" }}>
              <View style={[cardStyles.onlineDot, { backgroundColor: user.isOnline ? "#2ecc71" : "#bdbdbd" }]} />
              <SafeText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>{user.isOnline ? "Online" : "Offline"}</SafeText>
            </View>
          </View>

          {/* actions */}
          <View style={{ flexDirection: "row", marginTop: 14, justifyContent: "space-between" }}>
            <TouchableOpacity style={[cardStyles.actionBtn, { borderColor: colors.border }]}>
              <Icon name="account-edit" size={16} color={colors.cardForeground} />
              <SafeText style={{ color: colors.cardForeground, marginLeft: 8 }}>Edit profile</SafeText>
            </TouchableOpacity>

            <TouchableOpacity style={[cardStyles.actionBtn, { borderColor: colors.border }]}>
              <Icon name="bell-outline" size={16} color={colors.cardForeground} />
              <SafeText style={{ color: colors.cardForeground, marginLeft: 8 }}>{user.preferences.notificationsEnabled ? "Notifications" : "Notifications off"}</SafeText>
            </TouchableOpacity>

            <TouchableOpacity style={[cardStyles.actionBtn, { borderColor: colors.border }]}>
              <Icon name="logout" size={16} color={colors.cardForeground} />
              <SafeText style={{ color: colors.cardForeground, marginLeft: 8 }}>Sign out</SafeText>
            </TouchableOpacity>
          </View>
        </View>

        {/* metrics grid */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
          <Metric icon="check-circle-outline" value={user.taskStats.todayCompleted} label="Today" colors={colors} />
          <View style={{ width: 8 }} />
          <Metric icon="chart-line" value={user.taskStats.totalCompleted} label="Total" colors={colors} />
          <View style={{ width: 8 }} />
          <Metric icon="fire" value={user.taskStats.streakCount} label="Streak" colors={colors} />
        </View>

        {/* cards: personal info */}
        <View style={[cardStyles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>Personal Information</SafeText>
          <KeyValueRow label="Full name" value={user.name} colors={colors} />
          <KeyValueRow label="Username" value={`@${user.username}`} colors={colors} />
          <KeyValueRow label="Email" value={user.email} colors={colors} />
          <KeyValueRow label="Mobile" value={user.mobileNumber} colors={colors} />
          <KeyValueRow label="Role" value={user.role} colors={colors} />
          <KeyValueRow label="Login type" value={user.loginType} colors={colors} />
          <KeyValueRow label="Email verified" value={user.emailVerified ? "Yes" : "No"} colors={colors} />
        </View>

        {/* preferences card */}
        <View style={[cardStyles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>Preferences</SafeText>
          <KeyValueRow label="Notifications" value={user.preferences.notificationsEnabled ? "Enabled" : "Disabled"} colors={colors} />
          <KeyValueRow label="Dark mode" value={user.preferences.darkMode ? "On" : "Off"} colors={colors} />
          <KeyValueRow label="Focus mode" value={user.preferences.focusMode ? "On" : "Off"} colors={colors} />
          <KeyValueRow label="Theme" value={user.preferences.theme} colors={colors} />
        </View>

        {/* devices card */}
        <View style={[cardStyles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>Active devices</SafeText>
          {user.devices.map((d) => (
            <View key={d.deviceId} style={[cardStyles.deviceRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <View>
                <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>{d.deviceType}</SafeText>
                <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>{d.browser} • {d.os}</SafeText>
                <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>{d.location?.city}, {d.location?.country}</SafeText>
                <SafeText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>IP: {d.ipAddress}</SafeText>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <SafeText style={{ color: d.isOnline ? "#2ecc71" : colors.mutedForeground, fontWeight: "700" }}>
                  {d.isOnline ? "Online" : "Offline"}
                </SafeText>
                <SafeText style={{ color: colors.mutedForeground, fontSize: 12, marginTop: 6 }}>Last: {new Date(d.lastSeen).toLocaleString()}</SafeText>
              </View>
            </View>
          ))}
        </View>

        {/* teams card */}
        <View style={[cardStyles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>Teams</SafeText>
          <KeyValueRow label="Current team" value={user.currentTeam?.name ?? "-"} colors={colors} />
          {user.teams.map((t, i) => (
            <KeyValueRow key={i} label={`Team ${i + 1}`} value={t.name} colors={colors} />
          ))}
        </View>

        {/* meta / timestamps */}
        <View style={[cardStyles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 36 }]}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>Account details</SafeText>
          <KeyValueRow label="Member since" value={new Date(user.createdAt).toLocaleString()} colors={colors} />
          <KeyValueRow label="Last updated" value={new Date(user.updatedAt).toLocaleString()} colors={colors} />
          <KeyValueRow label="Last active" value={new Date(user.lastActive).toLocaleString()} colors={colors} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  headerLeft: { width: 44 },
  headerCenter: { flex: 1, alignItems: "flex-start" },
  headerRight: { width: 44, alignItems: "flex-end" },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 8 },
});

const cardStyles = StyleSheet.create({
  profileCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  onlineDot: { width: 12, height: 12, borderRadius: 6 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  metric: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  metricIcon: { width: 44, height: 44, borderRadius: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  sectionCard: {
    marginTop: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  kvRow: {
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  deviceRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export { styles as AccountScreenStyles };
