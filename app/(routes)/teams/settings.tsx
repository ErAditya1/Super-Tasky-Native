// app/team/[id]/settings/index.native.tsx
import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  FlatList,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  Image as RNImage,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { updateTeam, updateTeamAvatar, removeMember } from "@/lib/api/team";
import { updatedTeam } from "@/store/team/teamSlice";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";
import InviteMemberDialog from "@/components/InviteMemberDialog";

/**
 * TeamSettingsScreen (Expo)
 *
 * - Tabs are implemented as simple buttons (Profile / Members / Danger)
 * - Avatar upload uses expo-image-picker and uploads FormData to updateTeamAvatar
 * - Uses redux store (team.activeTeam) and APIs same as your web version
 */

export default function TeamSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();

  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];

  const team = useAppSelector((s) => s.team.team);
  const { user } = useAppSelector((s) => s.auth);

  const members = team?.members ?? [];
  const owner = members?.find((m: any) => m.role === "owner");
  const isOwner = owner?.user?._id === user?._id;

  // form state
  const [selectedTab, setSelectedTab] = useState<"profile" | "members" | "danger">(
    "profile"
  );
  const [name, setName] = useState(team?.name ?? "");
  const [description, setDescription] = useState(team?.description ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // avatar
  const [localAvatarUri, setLocalAvatarUri] = useState<string | null>(
    team?.avatar?.url ?? null
  );
  const [avatarFile, setAvatarFile] = useState<ImagePicker.ImagePickerResult | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // members UI
  const [searchMember, setSearchMember] = useState("");

  useEffect(() => {
    setName(team?.name ?? "");
    setDescription(team?.description ?? "");
    setLocalAvatarUri(team?.avatar?.url ?? null);
  }, [team]);

  // ---------- Profile handlers ----------
  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = { name: name ?? "", description: description ?? "" };
      const res = await updateTeam(payload);
      if (res && res.success) {
        toast.show(res.data?.message ?? "Team updated", "success");
        // update redux store
        if (res.data?.data) dispatch(updatedTeam(res.data.data));
      } else {
        toast.show(res?.message ?? "Update failed", "danger");
      }
    } catch (err) {
      console.warn("updateTeam error", err);
      toast.show("Network error", "danger");
    } finally {
      setIsSubmitting(false);
    }
  };

  // pick image from library
  async function pickImage() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permission.status !== "granted") {
        Alert.alert("Permission required", "Please allow access to photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      console.log(result)
      if (!result.canceled) {
        setLocalAvatarUri(result.assets[0].uri);
        setAvatarFile(result);
      }
    } catch (err) {
      console.warn("pickImage err", err);
    }
  }

  // upload avatar to server
  async function uploadAvatar() {
    if (!avatarFile || !localAvatarUri) return;
    setAvatarUploading(true);

    // build FormData: RN needs name/type
    const uri = localAvatarUri;
    const filename = uri.split("/").pop() ?? `avatar_${Date.now()}.jpg`;
    // infer mime type from extension
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : "jpg";
    const mime = ext === "png" ? "image/png" : ext === "gif" ? "image/gif" : "image/jpeg";

    const form = new FormData();
    // @ts-ignore - FormData file shape for RN fetch
    form.append("avatar", {
      uri,
      name: filename,
      type: mime,
    });

    try {
      const res = await updateTeamAvatar(form);
      if (res && res.success) {
        toast.show(res.data?.message ?? "Avatar updated", "success");
        setAvatarFile(null);
        // update local and redux
        const newTeam = res.data?.data;
        if (newTeam) {
          setLocalAvatarUri(newTeam.avatar?.url ?? localAvatarUri);
          dispatch(updatedTeam(newTeam));
        }
      } else {
        toast.show(res?.message ?? "Upload failed", "danger");
      }
    } catch (err) {
      console.warn("updateTeamAvatar error", err);
      toast.show("Network error", "danger");
    } finally {
      setAvatarUploading(false);
    }
  }

  // ---------- Members handlers ----------
  async function removeMemberHandler(userId: string) {
    Alert.alert("Remove member", "Are you sure you want to remove this member?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await removeMember(userId);
            if (res && res.success) {
              toast.show(res.data?.message ?? "Removed", "success");
              // optionally update store or refetch
            } else {
              toast.show(res?.message ?? "Remove failed", "danger");
            }
          } catch (err) {
            console.warn("removeMember error", err);
            toast.show("Network error", "danger");
          }
        },
      },
    ]);
  }

  // ---------- Danger handlers ----------
  async function handleDelete() {
    Alert.alert(
      "Delete team",
      "This action cannot be undone. This will permanently delete the team and all related data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // placeholder: call delete API if present
            toast.show("Team deleted (placeholder)");
            router.push("/"); // navigate away
          },
        },
      ]
    );
  }

  async function handleLeaveTeam() {
    Alert.alert(
      "Leave team",
      "You will lose access to all team resources. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: () => {
            // placeholder: call leave API if present
            toast.show("Left team (placeholder)");
            router.push("/");
          },
        },
      ]
    );
  }



  // ---------- Render ----------
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
          <Ionicons name="chevron-back" size={22} color={colors.cardForeground} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.title, { color: colors.cardForeground }]}>Team Settings</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Manage profile, members and preferences</Text>
        </View>

        <View style={{ width: 44 }} /> {/* spacer */}
      </View>

      {/* Tabs */}
      <View style={[styles.tabsRow, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => setSelectedTab("profile")} style={[styles.tabButton, selectedTab === "profile" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
          <Text style={{ color: selectedTab === "profile" ? colors.primary : colors.mutedForeground, fontWeight: selectedTab === "profile" ? "700" : "600" }}>Profile</Text>
        </TouchableOpacity>

        

        <TouchableOpacity onPress={() => setSelectedTab("danger")} style={[styles.tabButton, selectedTab === "danger" && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}>
          <Text style={{ color: selectedTab === "danger" ? colors.primary : colors.mutedForeground, fontWeight: selectedTab === "danger" ? "700" : "600" }}>Danger</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {selectedTab === "profile" && (
            <View>
              {/* Avatar + upload */}
              <View style={[styles.avatarRow, { backgroundColor: colors.card }]}>
                <View>
                  {localAvatarUri ? (
                    <RNImage source={{ uri: localAvatarUri }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.sidebarAccent }]}>
                      <Ionicons name="people" size={36} color={colors.sidebarAccentForeground} />
                    </View>
                  )}
                </View>

                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: colors.cardForeground, fontWeight: "700", fontSize: 16 }}>{team?.name ?? "Team"}</Text>
                  <Text style={{ color: colors.mutedForeground, marginTop: 4 }}>{team?.members?.length ?? 0} members • {team?.projects?.length ?? 0} projects</Text>

                  <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
                    <TouchableOpacity onPress={pickImage} style={[styles.smallBtn, { borderColor: colors.border }]}>
                      <Ionicons name="image" size={16} color={colors.cardForeground} />
                      <Text style={{ color: colors.cardForeground, marginLeft: 8 }}>Choose{" "}</Text>
                    </TouchableOpacity>

                    {avatarFile ? (
                      <TouchableOpacity onPress={uploadAvatar} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                        {avatarUploading ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground }}>Upload Avatar {" "}</Text>}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Form */}
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>Team Name</Text>
                <TextInput value={name} onChangeText={setName} style={[styles.input, { backgroundColor: colors.background, color: colors.cardForeground, borderColor: colors.border }]} />

                <Text style={[styles.label, { color: colors.mutedForeground, marginTop: 12 }]}>Description</Text>
                <TextInput value={description} onChangeText={setDescription} style={[styles.input, { minHeight: 80, backgroundColor: colors.background, color: colors.cardForeground, borderColor: colors.border }]} multiline />

                <TouchableOpacity onPress={onSubmit} disabled={isSubmitting} style={[styles.primaryBtn, { marginTop: 14, backgroundColor: colors.primary, opacity: isSubmitting ? 0.7 : 1 }]}>
                  {isSubmitting ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Update Team</Text>}
                </TouchableOpacity>
              </View>
            </View>
          )}

        
          {selectedTab === "danger" && (
            <View>
              <View style={[styles.warningCard, { borderColor: colors.destructive }]}>
                <Text style={{ color: colors.destructive, fontWeight: "700", marginBottom: 6 }}>Delete this team</Text>
                <Text style={{ color: colors.mutedForeground }}>This action cannot be undone. This will permanently delete the team and all related data.</Text>
                <TouchableOpacity onPress={handleDelete} style={[styles.destructiveBtn, { marginTop: 12, borderColor: colors.destructive }]}>
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={colors.destructive} />
                  <Text style={{ color: colors.destructive, marginLeft: 8 }}>Delete Team</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.warningCard, { marginTop: 12 }]}>
                <Text style={{ fontWeight: "700", marginBottom: 6 }}>Leave this team</Text>
                <Text style={{ color: colors.mutedForeground }}>You will lose access to all team resources.</Text>
                <TouchableOpacity onPress={handleLeaveTeam} style={[styles.smallBtn, { marginTop: 12, borderColor: colors.border }]}>
                  <Text style={{ color: colors.cardForeground }}>Leave Team</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function RoleBadge({ role }: { role?: string }) {
  if (!role) return null;
  const styleMap: Record<string, any> = {
    owner: { backgroundColor: "#F59E0B", text: "#000" },
    admin: { backgroundColor: "#2563EB", text: "#fff" },
    member: { backgroundColor: "#6353EB", text: "#fff" },
  };
  const s = styleMap[role] ?? styleMap.member;
  return (
    <View style={[{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: s.backgroundColor }]}>
      <Text style={{ color: s.text, fontWeight: "700", fontSize: 12 }}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    height: 72,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: "700" },
  subtitle: { fontSize: 12 },

  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  tabButton: {
    marginRight: 20,
    paddingBottom: 6,
  },

  avatarRow: {
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },

  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },

  label: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 8 : 10,
    fontSize: 15,
  },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  warningCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },

  destructiveBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
});
