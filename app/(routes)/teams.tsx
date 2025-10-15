// app/(tabs)/team.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

// ----- mock data (from your original file) -----
interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: "owner" | "admin" | "member";
  tasksCount: number;
  avatar?: string;
}

interface Team {
  id: string;
  name: string;
  memberCount: number;
  projectCount: number;
}

const mockTeams: Team[] = [
  { id: "1", name: "Design Squad", memberCount: 8, projectCount: 5 },
  { id: "2", name: "Marketing Team", memberCount: 6, projectCount: 3 },
  { id: "3", name: "Development", memberCount: 12, projectCount: 8 },
];

const mockMembers: TeamMember[] = [
  {
    id: "1",
    name: "John Doe",
    email: "john@company.com",
    initials: "JD",
    role: "owner",
    tasksCount: 12,
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@company.com",
    initials: "SC",
    role: "admin",
    tasksCount: 8,
  },
  {
    id: "3",
    name: "Mike Torres",
    email: "mike@company.com",
    initials: "MT",
    role: "member",
    tasksCount: 15,
  },
  {
    id: "4",
    name: "Emma Davis",
    email: "emma@company.com",
    initials: "ED",
    role: "member",
    tasksCount: 6,
  },
  {
    id: "5",
    name: "Alex Johnson",
    email: "alex@company.com",
    initials: "AJ",
    role: "member",
    tasksCount: 10,
  },
];

// ----- small UI helpers -----
function Avatar({
  size = 48,
  uri,
  initials,
  bg,
}: {
  size?: number;
  uri?: string;
  initials?: string;
  bg?: string;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg ?? "#6b46c1",
        },
      ]}
    >
      <Text style={styles.avatarInitials}>{initials?.slice(0, 2)}</Text>
    </View>
  );
}

function RoleBadge({ role }: { role: TeamMember["role"] }) {
  if (role === "owner") {
    return (
      <View style={[styles.badge, { backgroundColor: "#F59E0B" }]}>
        <Text style={styles.badgeText}>Owner</Text>
      </View>
    );
  }
  if (role === "admin") {
    return (
      <View style={[styles.badge, { backgroundColor: "#2563EB" }]}>
        <Text style={styles.badgeText}>Admin</Text>
      </View>
    );
  }
  return null;
}

// ----- main screen -----
export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];

  const [teams] = useState<Team[]>(mockTeams);
  const [members] = useState<TeamMember[]>(mockMembers);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [inputValue, setInputValue] = useState("");

  const activeTeam = teams[0];

  function onInvite() {
    Alert.alert("Invite", "Invite flow (placeholder).");
  }

  function onSwitchTeam(teamId: string) {
    // TODO: implement switch logic
    Alert.alert("Switch Team", `Switch to team ${teamId} (placeholder).`);
  }

  function onCreateOrJoin() {
    if (!inputValue.trim()) {
      Alert.alert("Please enter a team name or code");
      return;
    }
    if (mode === "create") {
      Alert.alert("Team Created", `Created team: ${inputValue}`);
    } else {
      Alert.alert("Joined Team", `Joined with code: ${inputValue}`);
    }
    setInputValue("");
    setTeamModalOpen(false);
  }

  return (
    <SafeAreaView
      style={[
        styles.safe,
        { backgroundColor: colors.background, paddingBottom: insets.bottom },
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View
          style={[
            styles.header,
            { borderBottomColor: colors.border, backgroundColor: colors.card },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons
              name="chevron-back"
              size={24}
              color={colors.cardForeground}
            />
          </TouchableOpacity>
          <View>
            <Text style={[styles.h2, { color: colors.foreground }]}>
              Team Management
            </Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>
              Manage your teams and collaborate {" "}
            </Text>
          </View>

          <Pressable
            onPress={() => router.push("/settings")}
            style={({ pressed }) => [
              { opacity: pressed ? 0.7 : 1, padding: 8 },
            ]}
            accessibilityLabel="Open settings"
          >
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color={colors.mutedForeground}
            />
          </Pressable>
        </View>

        {/* Current Team Card */}
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <LinearGradient
            colors={["#5B4BFF", "#7C3AED"]}
            style={styles.teamCardGradient}
          >
            <View style={styles.teamCardTop}>
              <View>
                <Text style={styles.teamTitle}>Design Squad</Text>
                <Text style={styles.teamSubtitle}>Your active team</Text>
              </View>

              <Pressable
                onPress={() =>
                  Alert.alert("Team menu", "More actions (placeholder)")
                }
                style={({ pressed }) => [
                  { padding: 8, opacity: pressed ? 0.9 : 1 },
                ]}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </Pressable>
            </View>

            <View style={styles.teamStatsRow}>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{members.length}</Text>
                <Text style={styles.statLabel}>Members</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>{activeTeam.projectCount}</Text>
                <Text style={styles.statLabel}>Projects</Text>
              </View>
              <View style={styles.stat}>
                <Text style={styles.statNumber}>42</Text>
                <Text style={styles.statLabel}>Active Tasks</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Team Members */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <View style={styles.sectionHeader}>
            <Text style={[{ color: colors.foreground }]}>Team Members</Text>
            <Pressable
              onPress={onInvite}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View
                style={[styles.inviteBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons
                  name="mail"
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[
                    styles.inviteText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  {" "}
                  Invite
                </Text>
              </View>
            </Pressable>
          </View>

          <FlatList
            data={members}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 8 }}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.memberRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <Avatar
                  initials={item.initials}
                  bg={
                    item.role === "owner"
                      ? "#F59E0B"
                      : item.role === "admin"
                      ? "#2563EB"
                      : "#9CA3AF"
                  }
                />
                <View style={styles.memberBody}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={[
                        styles.memberName,
                        { color: colors.cardForeground },
                      ]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    {item.role === "owner" && (
                      <MaterialCommunityIcons
                        name="crown"
                        size={16}
                        color="#F59E0B"
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.memberEmail,
                      { color: colors.mutedForeground },
                    ]}
                    numberOfLines={1}
                  >
                    {item.email}
                  </Text>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginTop: 6,
                    }}
                  >
                    <RoleBadge role={item.role} />
                    <Text
                      style={[
                        styles.tasksCount,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {item.tasksCount} tasks
                    </Text>
                  </View>
                </View>

                <Pressable
                  onPress={() =>
                    Alert.alert(
                      "Member actions",
                      `${item.name} actions (placeholder)`
                    )
                  }
                  style={({ pressed }) => [
                    { padding: 8, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={18}
                    color={colors.mutedForeground}
                  />
                </Pressable>
              </View>
            )}
          />
        </View>

        {/* Other Teams */}
        <View style={[styles.section, { backgroundColor: colors.background }]}>
          <Text style={[{ color: colors.foreground, marginBottom: 12 }]}>
            Your Other Teams
          </Text>

          <View style={{ paddingHorizontal: 16 }}>
            {teams.slice(1).map((t) => (
              <Pressable
                key={t.id}
                onPress={() => onSwitchTeam(t.id)}
                style={({ pressed }) => [
                  styles.otherTeamCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    opacity: pressed ? 0.95 : 1,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <View
                    style={[
                      styles.iconBox,
                      { backgroundColor: colors.sidebarAccent },
                    ]}
                  >
                    <Ionicons
                      name="people"
                      size={20}
                      color={colors.sidebarAccentForeground}
                    />
                  </View>
                  <View style={{ marginLeft: 12 }}>
                    <Text
                      style={[
                        styles.otherTeamName,
                        { color: colors.cardForeground },
                      ]}
                    >
                      {t.name}
                    </Text>
                    <Text
                      style={[
                        styles.otherTeamMeta,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      {t.memberCount} members · {t.projectCount} projects
                    </Text>
                  </View>
                </View>
                <Text style={[styles.switchText, { color: colors.primary }]}>
                  Switch
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Create / Join Team CTA */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          <Pressable
            onPress={() => {
              setMode("create");
              setTeamModalOpen(true);
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}
          >
            <View style={[styles.createBtn, { borderColor: colors.border }]}>
              <Ionicons name="add" size={18} color={colors.foreground} />
              <Text style={[styles.createText, { color: colors.foreground }]}>
                {" "}
                Create or Join Team
              </Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Modal for create / join */}
      <Modal
        visible={teamModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setTeamModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTeamModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalInner,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={() => {}}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={[{ color: colors.cardForeground }]}>
                {mode === "create" ? "Create Team" : "Join Team"}
              </Text>
              <Pressable onPress={() => setTeamModalOpen(false)}>
                <Ionicons
                  name="close"
                  size={20}
                  color={colors.mutedForeground}
                />
              </Pressable>
            </View>

            <TextInput
              placeholder={mode === "create" ? "Team name" : "Invite code"}
              placeholderTextColor={colors.mutedForeground}
              value={inputValue}
              onChangeText={setInputValue}
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.cardForeground,
                  borderColor: colors.border,
                },
              ]}
            />

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                gap: 8,
              }}
            >
              <Pressable onPress={() => setTeamModalOpen(false)}>
                <Text style={{ color: colors.mutedForeground }}>Cancel</Text>
              </Pressable>
              <Pressable onPress={onCreateOrJoin}>
                <View
                  style={[
                    styles.actionPrimary,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={{
                      color: colors.primaryForeground,
                      fontWeight: "700",
                    }}
                  >
                    {mode === "create" ? "Create" : "Join"}
                  </Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ----- styles -----
const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingBottom: 24 },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  h2: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13 },

  teamCardGradient: {
    borderRadius: 20,
    padding: 16,
  },
  teamCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  teamTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  teamSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.85)" },

  teamStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "flex-start" },
  statNumber: { fontSize: 22, color: "#fff", fontWeight: "700" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.9)" },

  section: { marginTop: 16 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
  },

  inviteBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  inviteText: { fontWeight: "700" },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontWeight: "700" },

  memberBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  memberName: { fontWeight: "700", fontSize: 15 },
  memberEmail: { fontSize: 13 },
  tasksCount: { marginLeft: 8, fontSize: 12 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  otherTeamCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  otherTeamName: { fontWeight: "700" },
  otherTeamMeta: { fontSize: 12 },
  switchText: { fontWeight: "700" },

  createBtn: {
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  createText: { fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  modalInner: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
  },

  input: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },

  actionPrimary: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
});
