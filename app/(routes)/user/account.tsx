// app/screens/AccountScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import { Text as RNText } from "react-native";
import { router, Stack } from "expo-router";
import { getUserAccount } from "@/lib/api/user";
import { clearAllAuthData } from "@/lib/api";
import { logout, logoutDevice } from "@/lib/api/auth";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/Toast";
import { AcceptInvite, getCurrentTeam } from "@/lib/api/team";
import { addTeamData } from "@/store/team/teamSlice";
import { useAppDispatch } from "@/store/hooks";

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
      {children}{" "}
    </RNText>
  );
}

/* ---------- types ---------- */
export type Avatar = { public_id?: string; url?: string };
export type TeamSummary = {
  _id?: string;
  id?: string;
  name?: string;
  avatar?: Avatar;
};
export type DeviceInfo = {
  deviceId: string;
  ipAddress?: string;
  browser?: string;
  os?: string;
  deviceType?: "Desktop" | "Mobile" | "Tablet" | string;
  location?: { country?: string; city?: string };
  loginStatus?: string;
  lastLogin?: string;
  lastSeen?: string;
  isOnline?: boolean;
};
export type Preferences = {
  notificationsEnabled?: boolean;
  darkMode?: boolean;
  focusMode?: boolean;
  theme?: string;
};
type TaskStats = {
  todayCompleted?: number;
  totalCompleted?: number;
  streakCount?: number;
  lastActiveDate?: string;
};
type Member = {
  _id?: string;
  id?: string;
  name?: string;
  username?: string;
  avatar?: Avatar;
  role?: string;
  isOnline?: boolean;
  status?: string;
};
interface User {
  _id?: string;
  id?: string;
  name?: string;
  email?: string;
  mobileNumber?: string;
  username?: string;
  role?: string;
  loginType?: string;
  avatar?: Avatar;
  about?: string;
  isOnline?: boolean;
  lastActive?: string;
  emailVerified?: boolean;
  preferences?: Preferences;
  taskStats?: TaskStats;
  devices?: DeviceInfo[];
  currentTeam?: TeamSummary;
  teams?: TeamSummary[];
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/* ---------- small presentational parts ---------- */
const Metric = ({ icon, value, label, colors }: any) => (
  <View
    style={[
      cardStyles.metric,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <View style={[cardStyles.metricIcon, { borderColor: colors.border }]}>
      <Icon name={icon} size={18} color={colors.primary} />
    </View>
    <View style={{ marginLeft: 10 }}>
      <SafeText
        style={{ color: colors.foreground, fontWeight: "700", fontSize: 15 }}
      >
        {value ?? "-"}
      </SafeText>
      <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>
        {label}
      </SafeText>
    </View>
  </View>
);

const KeyValueRow = ({ label, value, colors }: any) => (
  <View
    style={[
      cardStyles.kvRow,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
  >
    <SafeText style={{ color: colors.mutedForeground }}>{label}</SafeText>
    <SafeText style={{ color: colors.foreground }}>{value ?? "-"}</SafeText>
  </View>
);

/* ---------- small helpers ---------- */
function adjustAlpha(hex: string, alpha: number) {
  try {
    const c = hex.replace("#", "");
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return hex;
  }
}

/* ---------- DeviceCard (inline) ---------- */
function DeviceCard({
  d,
  colors,
  onSignOut,
}: {
  d: DeviceInfo;
  colors: any;
  onSignOut?: (id: string) => void;
}) {
  const deviceIconName =
    d.deviceType === "Mobile"
      ? "cellphone"
      : d.deviceType === "Desktop"
      ? "desktop-classic"
      : "tablet";

  return (
    <View
      style={[
        cardStyles.deviceCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={[
            cardStyles.deviceIcon,
            {
              borderColor: colors.border,
              backgroundColor: d.isOnline
                ? adjustAlpha(colors.primary, 0.1)
                : "transparent",
            },
          ]}
        >
          <Icon name={deviceIconName} size={20} color={colors.primary} />
        </View>

        <View style={{ marginLeft: 12, flex: 1 }}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>
            {d.deviceType ?? "Device"} {d.browser ? `· ${d.browser}` : ""}
          </SafeText>
          <SafeText
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              marginTop: 2,
            }}
          >
            {d.os ?? "Unknown OS"}{" "}
            {d.location?.city
              ? `· ${d.location.city}${
                  d.location?.country ? `, ${d.location.country}` : ""
                }`
              : ""}
          </SafeText>
          <SafeText
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            IP: {d.ipAddress ?? "-"}
          </SafeText>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <View
            style={[
              cardStyles.smallBadge,
              {
                backgroundColor: d.isOnline
                  ? "#2ecc71"
                  : colors.mutedForeground,
              },
            ]}
          >
            <SafeText style={{ color: "#fff", fontSize: 11 }}>
              {d.isOnline ? "Online" : "Offline"}
            </SafeText>
          </View>

          <SafeText
            style={{
              color: colors.mutedForeground,
              fontSize: 12,
              marginTop: 6,
            }}
          >
            {d.lastSeen
              ? new Date(d.lastSeen).toLocaleString()
              : d.lastLogin
              ? new Date(d.lastLogin).toLocaleString()
              : "-"}
          </SafeText>

          <TouchableOpacity
            onPress={() => onSignOut && onSignOut(d.deviceId)}
            style={[
              cardStyles.disconnectBtn,
              { borderColor: colors.border, marginTop: 8 },
            ]}
            accessibilityRole="button"
          >
            <SafeText style={{ color: colors.primary, fontWeight: "700" }}>
              Sign out
            </SafeText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

/* ---------- Main component (with loading/suspense) ---------- */
export default function AccountScreen({ navigation }: any) {
  const [user, setUser] = useState<User | undefined>();
  const [invitations, setInvitations] = useState<any>();
  const [loading, setLoading] = useState<boolean>(true);
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const dispatch = useAppDispatch();

  const { setIsLoggedIn } = useAuth();

  const avatarSize = Math.max(64, Math.min(120, Math.round(width * 0.18)));

  const initials = useMemo(() => {
    const parts = (user?.name || user?.username || "U").split(" ");
    return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
  }, [user]);

  const getAccount = async () => {
    try {
      const res = await getUserAccount();
      if (res.success) {
        const fetched = res.data?.data;
        console.log(fetched?.invitations);
        setUser(fetched?.userAccount);
        setInvitations(fetched?.invitations);
      } else {
        console.warn("getUserAccount failed:", res.message);
      }
    } catch (err) {
      console.warn("getUserAccount error:", err);
    }
  };

  useEffect(() => {
    getAccount();
  }, []);

  const accept = async (invitetoken: string) => {
    if (!invitetoken) return;

    const res = await AcceptInvite({ token: invitetoken });
    if (res.success) {
      toast.show(res.data.message, "success");
      const response = await getCurrentTeam();
      if (response.success) {
        // console.log("Members fetched:", res.data.data);
        // setMembers(res.data.data.members);
        const data = response.data.data;
        dispatch(addTeamData(data));
      } else {
        console.error("Failed to fetch members:", response?.message);
        toast.show(response.message || "Team fetch failed", "danger");
      }
      router.push("/(tabs)");
    } else {
      toast.show(res.message ?? "Accept Failed", "danger");
    }
  };

  function handleSignOutDevice(deviceId?: string) {
    // placeholder - wire up API call to revoke session/device
    Alert.alert("Sign Out", "Are you sure you want to sign out device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          // Implement sign-out logic here

          const res = await logoutDevice(deviceId!);
          if (res.success) {
            toast.show(res.data.message, "success");
            getAccount();
          } else {
            toast.show(res.message ?? "Sign out failed", "danger");
          }
        },
      },
    ]);
  }
  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          // Implement sign-out logic here

          const res = await logout();
          if (res.success) {
            setIsLoggedIn(false);
            router.replace("/(auth)/Login");
            await clearAllAuthData();
          }
        },
      },
    ]);
  };

  // Loading "suspense" view
  if (!user) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.headerLeft}
          >
            <Icon
              name="arrow-left"
              size={20}
              color={colors.cardForeground ?? colors.foreground}
            />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <SafeText
              style={{
                color: colors.foreground,
                fontWeight: "700",
                fontSize: 18,
              }}
            >
              Account
            </SafeText>
            <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>
              Loading profile…
            </SafeText>
          </View>
          <View style={styles.headerRight}>
            <View style={[styles.iconBtn, { borderColor: colors.border }]} />
          </View>
        </View>

        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <SafeText style={{ color: colors.mutedForeground, marginTop: 12 }}>
            Loading account information… {" "}
          </SafeText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerLeft}
        >
          <Icon
            name="arrow-left"
            size={20}
            color={colors.cardForeground ?? colors.foreground}
          />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <SafeText
            style={{
              color: colors.foreground,
              fontWeight: "700",
              fontSize: 18,
            }}
          >
            Account
          </SafeText>
          <SafeText style={{ color: colors.mutedForeground, fontSize: 12 }}>
            Profile & settings
          </SafeText>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconBtn, { borderColor: colors.border }]}
            onPress={() => router.push("/(routes)/user/edit")}
          >
            <Icon
              name="pencil-outline"
              size={18}
              color={colors.cardForeground ?? colors.foreground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top profile card */}
        <View
          style={[
            cardStyles.profileCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: avatarSize, height: avatarSize }}>
              {user?.avatar?.url ? (
                <Image
                  source={{ uri: user.avatar.url }}
                  style={{
                    width: avatarSize,
                    height: avatarSize,
                    borderRadius: avatarSize / 6,
                  }}
                />
              ) : (
                <View
                  style={[
                    cardStyles.avatarPlaceholder,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 6,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <SafeText
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      fontSize: Math.round(avatarSize / 4),
                    }}
                  >
                    {initials.toUpperCase()}
                  </SafeText>
                </View>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <SafeText
                style={{
                  color: colors.foreground,
                  fontSize: 18,
                  fontWeight: "700",
                }}
              >
                {user?.name ?? user?.username ?? "-"}
              </SafeText>
              <SafeText style={{ color: colors.mutedForeground, marginTop: 4 }}>
                @{user?.username ?? "-"}
              </SafeText>

              <SafeText style={{ color: colors.mutedForeground, marginTop: 8 }}>
                {user?.about ?? "No bio provided."}
              </SafeText>

              <View style={{ flexDirection: "row", marginTop: 12 }}>
                <View style={{ marginRight: 12 }}>
                  <SafeText
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {user?.taskStats?.totalCompleted ?? 0}
                  </SafeText>
                  <SafeText
                    style={{ color: colors.mutedForeground, fontSize: 12 }}
                  >
                    Completed
                  </SafeText>
                </View>

                <View style={{ marginRight: 12 }}>
                  <SafeText
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {user?.taskStats?.streakCount ?? 0}
                  </SafeText>
                  <SafeText
                    style={{ color: colors.mutedForeground, fontSize: 12 }}
                  >
                    Streak
                  </SafeText>
                </View>

                <View>
                  <SafeText
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {user?.devices?.length ?? 0}
                  </SafeText>
                  <SafeText
                    style={{ color: colors.mutedForeground, fontSize: 12 }}
                  >
                    Devices
                  </SafeText>
                </View>
              </View>
            </View>

            <View style={{ alignItems: "center" }}>
              <View
                style={[
                  cardStyles.onlineDot,
                  { backgroundColor: user?.isOnline ? "#2ecc71" : "#bdbdbd" },
                ]}
              />
              <SafeText
                style={{
                  color: colors.mutedForeground,
                  fontSize: 12,
                  marginTop: 6,
                }}
              >
                {user?.isOnline ? "Online" : "Offline"}
              </SafeText>
            </View>
          </View>

          {/* actions */}
          <View
            style={{
              flexDirection: "row",
              marginTop: 14,
              justifyContent: "space-between",
            }}
          >
            <TouchableOpacity
              style={[cardStyles.actionBtn, { borderColor: colors.border }]}
              onPress={() => router.push("/(routes)/user/edit")}
            >
              <Icon
                name="account-edit"
                size={16}
                color={colors.cardForeground}
              />
              <SafeText style={{ color: colors.cardForeground, marginLeft: 8 }}>
                Edit profile
              </SafeText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cardStyles.actionBtn, { borderColor: colors.border }]}
            >
              <Icon
                name="bell-outline"
                size={16}
                color={colors.cardForeground}
              />
              <SafeText style={{ color: colors.cardForeground, marginLeft: 8 }}>
                {user?.preferences?.notificationsEnabled
                  ? "Notifications"
                  : "Notifications off"}
              </SafeText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[cardStyles.actionBtn, { borderColor: colors.border }]}
              onPress={handleSignOut}
            >
              <Icon name="logout" size={16} color={colors.cardForeground} />
              <SafeText style={{ color: colors.cardForeground, marginLeft: 8 }}>
                Sign out
              </SafeText>
            </TouchableOpacity>
          </View>
        </View>

        {/* metrics */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginTop: 8,
          }}
        >
          <Metric
            icon="check-circle-outline"
            value={user?.taskStats?.todayCompleted ?? 0}
            label="Today"
            colors={colors}
          />
          <View style={{ width: 8 }} />
          <Metric
            icon="chart-line"
            value={user?.taskStats?.totalCompleted ?? 0}
            label="Total"
            colors={colors}
          />
          <View style={{ width: 8 }} />
          <Metric
            icon="fire"
            value={user?.taskStats?.streakCount ?? 0}
            label="Streak"
            colors={colors}
          />
        </View>

        {/* Personal info */}
        <View
          style={[
            cardStyles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SafeText
            style={{
              color: colors.foreground,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Personal Information
          </SafeText>
          <KeyValueRow label="Full name" value={user?.name} colors={colors} />
          <KeyValueRow
            label="Username"
            value={user?.username ? `@${user.username}` : "-"}
            colors={colors}
          />
          <KeyValueRow label="Email" value={user?.email} colors={colors} />
          <KeyValueRow
            label="Mobile"
            value={user?.mobileNumber}
            colors={colors}
          />
          <KeyValueRow label="Role" value={user?.role} colors={colors} />
          <KeyValueRow
            label="Email verified"
            value={user?.emailVerified ? "Yes" : "No"}
            colors={colors}
          />
        </View>

        {/* preferences */}
        <View
          style={[
            cardStyles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SafeText
            style={{
              color: colors.foreground,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Preferences
          </SafeText>
          <KeyValueRow
            label="Notifications"
            value={
              user?.preferences?.notificationsEnabled ? "Enabled" : "Disabled"
            }
            colors={colors}
          />
          <KeyValueRow
            label="Dark mode"
            value={user?.preferences?.darkMode ? "On" : "Off"}
            colors={colors}
          />
          <KeyValueRow
            label="Focus mode"
            value={user?.preferences?.focusMode ? "On" : "Off"}
            colors={colors}
          />
          <KeyValueRow
            label="Theme"
            value={user?.preferences?.theme}
            colors={colors}
          />
        </View>

        {/* Active devices (enhanced) */}
        <View
          style={[
            cardStyles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SafeText
            style={{
              color: colors.foreground,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Active devices
          </SafeText>

          {!user?.devices?.length ? (
            <SafeText style={{ color: colors.mutedForeground }}>
              No active devices found.
            </SafeText>
          ) : (
            <View>
              {user.devices.map((d) => (
                <View key={d.deviceId} style={{ marginBottom: 8 }}>
                  <DeviceCard
                    d={d}
                    colors={colors}
                    onSignOut={(id) => handleSignOutDevice(id)}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        {/* teams */}
        <View
          style={[
            cardStyles.sectionCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <SafeText
            style={{
              color: colors.foreground,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Teams
          </SafeText>
          <KeyValueRow
            label="Current team"
            value={user?.currentTeam?.name ?? "-"}
            colors={colors}
          />
          {user?.teams?.map((t, i) => (
            <KeyValueRow
              key={i}
              label={`Team ${i + 1}`}
              value={t.name}
              colors={colors}
            />
          ))}
        </View>

        {/* Invitations Section */}
        {invitations && invitations.length > 0 && (
          <View
            style={[
              cardStyles.sectionCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <SafeText
              style={{
                color: colors.foreground,
                fontWeight: "700",
                marginBottom: 12,
                fontSize: 16,
              }}
            >
              Invitations
            </SafeText>

            {invitations.map((invite: any, idx: number) => (
              <View
                key={invite._id ?? idx}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.background,
                  marginBottom: 12,
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowOffset: { width: 0, height: 2 },
                  shadowRadius: 4,
                  elevation: 2,
                }}
              >
                {/* Team Avatar Placeholder */}
                {invite?.team?.avatar ? (
                  <Image source={{ uri: invite?.team?.avatar.url }} />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: colors.primary + "22",
                      alignItems: "center",
                      justifyContent: "center",
                      marginRight: 12,
                    }}
                  >
                    <SafeText
                      style={{ color: colors.primary, fontWeight: "700" }}
                    >
                      {invite.team?.name?.substring(0, 2).toUpperCase()}
                    </SafeText>
                  </View>
                )}

                {/* Info */}
                <View style={{ flex: 1 }}>
                  {/* Team Name */}
                  <SafeText
                    style={{
                      color: colors.foreground,
                      fontWeight: "700",
                      fontSize: 15,
                    }}
                  >
                    {invite.team?.name}
                  </SafeText>

                  {/* Invited By */}
                  <TouchableOpacity
                    onPress={() =>
                      router.push({
                        pathname: "/(routes)/user/profile/[username]",
                        params: { username: invite.invitedBy?.username },
                      })
                    }
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 2,
                    }}
                  >
                    <Icon
                      name="account-circle-outline"
                      size={16}
                      color={colors.primary}
                      style={{ marginRight: 4 }}
                    />
                    <SafeText
                      style={{
                        color: colors.primary,
                        textDecorationLine: "underline",
                      }}
                    >
                      {invite.invitedBy?.username}
                    </SafeText>
                  </TouchableOpacity>

                  {/* Email & Role */}
                  <SafeText
                    style={{
                      color: colors.mutedForeground,
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {invite.invitedBy?.email} · {invite.role}
                  </SafeText>
                </View>

                {/* Status Badge & Action */}
                <View style={{ alignItems: "flex-end" }}>
                  <View
                    style={{
                      backgroundColor:
                        invite.status === "accepted"
                          ? "#2ecc71"
                          : invite.status === "pending"
                          ? "#f1c40f"
                          : "#e74c3c",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      borderRadius: 16,
                      marginBottom: 6,
                    }}
                  >
                    <SafeText
                      style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}
                    >
                      {invite.status.toUpperCase()}
                    </SafeText>
                  </View>

                  {/* Accept Invite Button */}
                  {invite.status === "pending" && (
                    <TouchableOpacity
                      onPress={() => accept(invite.token)}
                      style={{
                        marginTop: 4,
                        borderWidth: 1,
                        borderColor: colors.primary,
                        borderRadius: 8,
                        paddingVertical: 6,
                        paddingHorizontal: 12,
                        alignItems: "center",
                        backgroundColor: colors.card,
                      }}
                    >
                      <SafeText
                        style={{
                          color: colors.primary,
                          fontWeight: "600",
                          fontSize: 12,
                        }}
                      >
                        Accept
                      </SafeText>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* account meta */}
        <View
          style={[
            cardStyles.sectionCard,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              marginBottom: 36,
            },
          ]}
        >
          <SafeText
            style={{
              color: colors.foreground,
              fontWeight: "700",
              marginBottom: 8,
            }}
          >
            Account details
          </SafeText>
          <KeyValueRow
            label="Member since"
            value={
              user?.createdAt ? new Date(user.createdAt).toLocaleString() : "-"
            }
            colors={colors}
          />
          <KeyValueRow
            label="Last updated"
            value={
              user?.updatedAt ? new Date(user.updatedAt).toLocaleString() : "-"
            }
            colors={colors}
          />
          <KeyValueRow
            label="Last active"
            value={
              user?.lastActive
                ? new Date(user.lastActive).toLocaleString()
                : "-"
            }
            colors={colors}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- Styles ---------- */
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
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
});

const cardStyles = StyleSheet.create({
  profileCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
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
  metricIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
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

  /* new device card styles */
  deviceCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  deviceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  smallBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  disconnectBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
});

export { styles as AccountScreenStyles };
