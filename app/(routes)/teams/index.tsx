import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  TextInput,
  Alert,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { switchTeam, createTeam } from "@/lib/api/team";
import { useToast } from "@/components/Toast";
import { addActiveTeam } from "@/store/team/teamSlice";
import Avatar from "@/components/Avatar";
import MemberActionsModal from "@/components/MemberActionModal";
import InviteMemberDialog from "@/components/InviteMemberDialog";

export default function TeamScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const toast = useToast();
  const dispatch = useAppDispatch();

  // store selectors
  const activeTeam = useAppSelector((s) => s.team.team) ?? null;
  const { teams } = useAppSelector((s) => s.team);
  const { invites } = useAppSelector((s) => s.team) ?? {};

  // UI state
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "join">("create");
  const [inputValue, setInputValue] = useState("");
  const [inputDescription, setInputDescription] = useState("");
  const [creatingTeam, setCreatingTeam] = useState(false);

  // member actions modal state
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [actionsVisible, setActionsVisible] = useState(false);

  async function onSwitchTeam(teamId: string) {
    if (!teamId) return;
    if (activeTeam?._id === teamId) return;
    try {
      const res = await switchTeam(teamId);
      if (res.success) {
        toast.show(res.data.message, "success");
        dispatch(addActiveTeam(res.data.data));
      } else {
        toast.show(res.message || "Switching failed", "danger");
      }
    } catch (err: any) {
      console.warn("switchTeam error", err);
      toast.show("Switch failed", "danger");
    }
  }

  async function onCreateOrJoin() {
    if (!inputValue.trim() ) {
      Alert.alert("Please enter a team name or code");
      return;
    }

    if (mode === "create") {
      // create team via API
      if (creatingTeam) return;
      setCreatingTeam(true);
      try {
        const payload = { name: inputValue.trim(), description: inputDescription.trim() };
        const res = await createTeam(payload);
        if (res && res.success) {
          toast.show(res.data?.message ?? "Team created", "success");
          // API shape may vary — try to find team object in response
          const team = res.data?.data?.team ?? res.data?.data ?? res.data;
          if (team) {
            // Add to store and set active
            try {
              dispatch(addActiveTeam(team));
            } catch (e) {
              // ignore
            }
          }
          setInputValue("");
          setInputDescription("")
          setTeamModalOpen(false);
        } else {
          toast.show(res?.message ?? "Creation failed", "danger");
        }
      } catch (err) {
        console.warn("createTeam error", err);
        toast.show("Network error", "danger");
      } finally {
        setCreatingTeam(false);
      }
    } else {
      // join flow — placeholder
      Alert.alert("Joined Team", `Joined with code: ${inputValue}`);
      setInputValue("");
      setInputDescription("")
      setTeamModalOpen(false);
    }
  }

  const memberActions = [
    { id: "message", label: "Message" },
    { id: "open", label: "Open profile" },
    { id: "changeRole", label: "Change role" },
    { id: "transferOwnership", label: "Transfer ownership" },
    { id: "remove", label: "Remove member", destructive: true },
  ];

  function openMemberActions(member: any) {
    setSelectedMember(member);
    setActionsVisible(true);
  }

  const onSelectMemberAction = useCallback(
    async (actionId: string) => {
      if (!selectedMember) return;
      const memberUser = selectedMember.user ?? selectedMember;

      switch (actionId) {
        case "message":
          toast.show(`Open chat with ${memberUser.name}`);
          router.push(`/(routes)/chat/123?user=${memberUser._id}`);
          break;

        case "open":
          router.push({
            pathname: "/(routes)/user/profile/[username]",
            params: { username: memberUser?.username },
          });
          break;

        case "changeRole":
          if ((Alert as any).prompt) {
            (Alert as any).prompt(
              "Change role",
              `Set new role for ${memberUser.name}`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Set",
                  onPress: async (text: string) => {
                    toast.show(`Role changed to ${text}`, "success");
                  },
                },
              ],
              "plain-text",
              memberUser.role ?? ""
            );
          } else {
            Alert.alert("Change role", "Open role change UI to implement this.");
          }
          break;

        case "transferOwnership":
          Alert.alert(
            "Transfer ownership",
            `Transfer ownership to ${memberUser.name}?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Transfer",
                style: "destructive",
                onPress: async () => {
                  try {
                    toast.show(`${memberUser.name} is now the owner`, "success");
                  } catch (err) {
                    toast.show("Transfer failed", "danger");
                  }
                },
              },
            ]
          );
          break;

        case "remove":
          Alert.alert(
            "Remove member",
            `Remove ${memberUser.name} from the team?`,
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Remove",
                style: "destructive",
                onPress: async () => {
                  try {
                    toast.show(`${memberUser.name} removed`, "success");
                  } catch (err) {
                    toast.show("Remove failed", "danger");
                  }
                },
              },
            ]
          );
          break;

        default:
          break;
      }

      setActionsVisible(false);
      setSelectedMember(null);
    },
    [selectedMember, toast, router]
  );

  // prepare members array safely (avoid undefined-to-object errors)
  const members = useMemo(() => {
    if (!activeTeam) return [];
    // activeTeam.members may be an array of objects like { user: {...}, role: 'member' }
    if (!Array.isArray(activeTeam.members)) return [];
    return activeTeam.members.filter(Boolean);
  }, [activeTeam]);

  // Single FlatList for members (prevents nested VirtualizedList issues)
  const renderMember = ({ item }: any) => {
    const user = item?.user ?? item;
    const role = item?.role ?? user?.role ?? "member";

    return (
      <View
        style={[
          styles.memberRow,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <Avatar style={{ height: 52, width: 52, borderRadius: 26 }} user={user} />
        <View style={styles.memberBody}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.memberName, { color: colors.cardForeground }]} numberOfLines={1}>
              {user?.name ?? user?.email ?? "Unknown"}
            </Text>
            {role === "owner" && (
              <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" />
            )}
          </View>

          <Text style={[styles.memberEmail, { color: colors.mutedForeground }]} numberOfLines={1}>
            {user?.email ?? ""}
          </Text>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            <RoleBadge role={role} />
            <Text style={[styles.tasksCount, { color: colors.mutedForeground }]}>0 tasks</Text>
          </View>
        </View>

        <Pressable onPress={() => openMemberActions(item)} style={({ pressed }) => ({ padding: 8, opacity: pressed ? 0.8 : 1 })}>
          <Ionicons name="ellipsis-vertical" size={18} color={colors.mutedForeground} />
        </Pressable>
      </View>
    );
  };

  // List header contains the static UI pieces that used to live above the members list.
  const ListHeader = () => (
    <View>
      {/* Active team card and stats */}
      <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
        <LinearGradient colors={["#5B4BFF", "#7C3AED"]} style={styles.teamCardGradient}>
          <View style={styles.teamCardTop}>
            <View>
              <Text style={styles.teamTitle}>{activeTeam?.name ?? "No active team"}</Text>
              <Text style={styles.teamSubtitle}>Your active team {" "}</Text>
            </View>

            <Pressable onPress={() => router.push("/teams/settings")}> 
              <Ionicons name="settings" size={20} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.teamStatsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{activeTeam?.members?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Members</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{activeTeam?.projects?.length ?? 0}</Text>
              <Text style={styles.statLabel}>Projects</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>42</Text>
              <Text style={styles.statLabel}>Active Tasks</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Team Members header + Invite button */}
      <View style={[styles.section, { backgroundColor: colors.background }]}>
        <View style={styles.sectionHeader}>
          <Text style={[{ color: colors.foreground }]}>Team Members{" "}</Text>
          <InviteMemberDialog>
            <View style={[styles.inviteBtn, { backgroundColor: colors.primary }]}> 
              <Ionicons name="mail" size={16} color={colors.primaryForeground} />
              <Text style={[styles.inviteText, { color: colors.primaryForeground }]}> Invite</Text>
            </View>
          </InviteMemberDialog>
        </View>
      </View>

      {/* Invitations (if any) */}
      {(Array.isArray(invites) && invites.length > 0) && (
        <View style={{ paddingHorizontal: 16, marginTop: 12 }}>
          <Text style={{ fontWeight: "700", color: colors.foreground, marginBottom: 8 }}>Invitations</Text>
          {invites.map((it: any) => (
            <View key={it.email} style={[styles.memberRow, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 8 }]}> 
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={{ fontWeight: "700", color: colors.cardForeground }}>{it.email}</Text>
                <Text style={{ color: colors.mutedForeground }}>{it.role} • {it.status}</Text>
              </View>
              {it.status === "pending" ? (
                <TouchableOpacity>
                  <Text style={{ color: colors.destructive, fontWeight: "700" }}>Revoke</Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: colors.mutedForeground }}>{it.status}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Other Teams */}
      <View style={[styles.section, { backgroundColor: colors.background, paddingHorizontal: 16, marginTop: 12 }]}> 
        <Text style={[{ color: colors.foreground, marginBottom: 12 }]}>Your Other Teams</Text>
        {(Array.isArray(teams) ? teams.filter((t: any) => t._id !== activeTeam?._id) : []).map((t: any) => (
          <Pressable key={t._id} onPress={() => onSwitchTeam(t._id)} style={({ pressed }) => [styles.otherTeamCard, { backgroundColor: colors.card, borderColor: colors.border, marginBottom: 10, opacity: pressed ? 0.95 : 1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={[styles.iconBox, { backgroundColor: colors.sidebarAccent }]}>
                <Ionicons name="people" size={20} color={colors.sidebarAccentForeground} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.otherTeamName, { color: colors.cardForeground }]}>{t.name}</Text>
                <Text style={[styles.otherTeamMeta, { color: colors.mutedForeground }]}>{t?.members?.length ?? 0} members · {t?.projects?.length ?? 0} projects</Text>
              </View>
            </View>
            <Text style={[styles.switchText, { color: colors.primary }]}>Switch</Text>
          </Pressable>
        ))}
      </View>

      {/* Create / Join Team CTA */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 24, marginTop: 8 }}>
        <Pressable onPress={() => { setMode("create"); setTeamModalOpen(true); }} style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1 }]}> 
          <View style={[styles.createBtn, { borderColor: colors.border }]}> 
            <Ionicons name="add" size={18} color={colors.foreground} />
            <Text style={[styles.createText, { color: colors.foreground }]}> Create or Join Team</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}> 
      <Stack.Screen options={{ headerShown: false }} />

      {/* NEW header bar */}
      <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}> 
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.cardForeground} />
        </TouchableOpacity>

        <View>
          <Text style={[styles.h2, { color: colors.cardForeground }]}>Team Management</Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]}>Manage your teams and collaborate</Text>
        </View>

        <Pressable onPress={() => { setMode("create"); setTeamModalOpen(true); }} style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.7 : 1 }]}>
          <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={members}
        keyExtractor={(m, idx) => {
          const uid = (m?.user?._id );
          return String(uid ?? idx);
        }}
        contentContainerStyle={{ paddingBottom: 60 }}
        ListHeaderComponent={<ListHeader />}
        renderItem={renderMember}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      {/* Create / Join Modal */}
      <Modal visible={teamModalOpen} transparent animationType="slide" onRequestClose={() => { if (!creatingTeam) setTeamModalOpen(false); }}>
        <Pressable style={styles.modalOverlay} onPress={() => { if (!creatingTeam) setTeamModalOpen(false); }}>
          <Pressable style={[styles.modalInner, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}> 
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: colors.cardForeground }}>{mode === "create" ? "Create Team" : "Join Team"}</Text>
              <Pressable onPress={() => { if (!creatingTeam) setTeamModalOpen(false); }}>
                <Ionicons name="close" size={20} color={colors.mutedForeground} />
              </Pressable>
            </View>

            <TextInput placeholder={mode === "create" ? "Team name" : "Invite code"} placeholderTextColor={colors.mutedForeground} value={inputValue} onChangeText={setInputValue} style={[styles.input, { backgroundColor: colors.background, color: colors.cardForeground, borderColor: colors.border }]} />
            
            {mode === "create" && <TextInput placeholder={"Description"} placeholderTextColor={colors.mutedForeground} value={inputDescription} onChangeText={setInputDescription} style={[styles.input, { backgroundColor: colors.background, color: colors.cardForeground, borderColor: colors.border }]} />}

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <Pressable onPress={() => { if (!creatingTeam) setTeamModalOpen(false); }}>
                <Text style={{ color: colors.mutedForeground , marginTop:10}}>Cancel</Text>
              </Pressable>

              <Pressable onPress={onCreateOrJoin} disabled={creatingTeam}>
                <View style={[styles.actionPrimary, { backgroundColor: colors.primary, opacity: creatingTeam ? 0.7 : 1 }]}> 
                  {creatingTeam ? (
                    <ActivityIndicator color={colors.primaryForeground} />
                  ) : (
                    <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>{mode === "create" ? "Create" : "Join"}</Text>
                  )}
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Member actions modal */}
      <MemberActionsModal visible={actionsVisible} onClose={() => { setActionsVisible(false); setSelectedMember(null); }} memberName={selectedMember?.user?.name ?? selectedMember?.name} actions={memberActions} onSelect={onSelectMemberAction} />
    </SafeAreaView>
  );
}

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
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
  return (
    <View style={[styles.badge, { backgroundColor: "#6353EB" }]}>
      <Text style={styles.badgeText}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { paddingBottom: 24 },
  header: { height: 64, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1 },
  h2: { fontSize: 18, fontWeight: "700" },
  sub: { fontSize: 13 },

  teamCardGradient: { borderRadius: 20, padding: 16 },
  teamCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  teamTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  teamSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.85)" },

  teamStatsRow: { flexDirection: "row", justifyContent: "space-between" },
  stat: { alignItems: "flex-start" },
  statNumber: { fontSize: 22, color: "#fff", fontWeight: "700" },
  statLabel: { fontSize: 12, color: "rgba(255,255,255,0.9)" },

  section: { marginTop: 16 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 8 },

  inviteBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  inviteText: { fontWeight: "700" },

  memberRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 12, borderWidth: 1 },
  memberBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  memberName: { fontWeight: "700", fontSize: 15 },
  memberEmail: { fontSize: 13 },
  tasksCount: { marginLeft: 8, fontSize: 12 },

  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  otherTeamCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  otherTeamName: { fontWeight: "700" },
  otherTeamMeta: { fontSize: 12 },
  switchText: { fontWeight: "700" },

  createBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", flexDirection: "row", justifyContent: "center" },
  createText: { fontWeight: "700" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  modalInner: { padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1 },

  input: { padding: 12, borderRadius: 10, borderWidth: 1, marginTop: 12 },
  actionPrimary: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
});