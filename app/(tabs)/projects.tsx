import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Pressable,
  Alert,
  Platform,
  RefreshControl,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import Avatar from "@/components/Avatar";
import { createProject } from "@/lib/api/project";
import { useToast } from "@/components/Toast";
import { insertProject } from "@/store/project2/projectSlice";
import NotificationTestScreen from "@/components/NotificationTest";

type Project = {
  name: string;
  description: string;
  color: string;
};

export default function ProjectsScreen() {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("#6750A4");
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { projects } = useAppSelector((state) => state.project);
  const toast = useToast();
  const dispatch = useAppDispatch();

  // loading detection (simple)
  const isProjectsLoading = projects === undefined || projects === null;

  useEffect(() => {
    // ensure arrays are defined for rendering
  }, [projects]);

  const createNewProject = async () => {
    if (creating) return;
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a project title.");
      return;
    }
    setCreating(true);
    const newProject: Project = {
      name: newTitle.trim(),
      description: newDescription.trim() || newTitle.trim(),
      color: newColor,
    };
    const res = await createProject(newProject);
    if (res.success) {
      toast.show(res.data.message || "Project Added!", "success");
      dispatch(insertProject(res.data.data));
    } else {
      toast.show(res.message || "Creation failed!", "danger");
    }
    setCreating(false);
    setModalVisible(false);
    setNewTitle("");
    setNewDescription("");
  };

  function calculateProjectProgress(project: any) {
    const totalTasks = project?.tasks?.length ?? 0;
    const completedTasks =
      project?.tasks?.filter(
        (t: any) => t.status === "completed" || t.status === "canceled"
      ).length ?? 0;
    const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
    return { progress, totalTasks, completedTasks };
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // placeholder: if you have a fetchProjects action, dispatch it here
    await new Promise((r) => setTimeout(r, 700));
    setRefreshing(false);
  }, []);

  // Small skeleton card used while loading
  const SkeletonCard = ({ width = "100%", height = 110 }: any) => (
    <View style={[styles.card, { backgroundColor: adjustAlpha(currentTheme.muted, 0.12), borderColor: adjustAlpha(currentTheme.muted, 0.06), height, padding: 12 }]}> 
      <View style={{ height: 18, width: "50%", borderRadius: 6, backgroundColor: adjustAlpha(currentTheme.muted, 0.18) }} />
      <View style={{ height: 8, width: "100%", marginTop: 12, borderRadius: 6, backgroundColor: adjustAlpha(currentTheme.muted, 0.08) }} />
    </View>
  );

  const EmptyProjectsView = () => (
    <View style={{ padding: 24, alignItems: "center" }}>
      <Ionicons name="folder-open-outline" size={64} color={currentTheme.mutedForeground} />
      <Text style={{ color: currentTheme.cardForeground, fontWeight: "700", marginTop: 12, fontSize: 16 }}>No projects yet</Text>
      <Text style={{ color: currentTheme.mutedForeground, marginTop: 8, textAlign: "center" }}>Create projects to organise work, invite teammates and track progress.</Text>
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={{ marginTop: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: currentTheme.primary }}
      >
        <Text style={{ color: currentTheme.primaryForeground, fontWeight: "600" }}>Create Project</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(routes)/projects/explore")}
        style={{ marginTop: 10 }}
      >
        <Text style={{ color: currentTheme.mutedForeground }}>Explore templates{" "}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderProject = ({ item }: any) => (
    <TouchableOpacity
      onPress={() => router.push(`/(routes)/projects/${item._id}`)}
      style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Text style={[styles.projectTitle, { color: currentTheme.cardForeground }]} numberOfLines={1}>{item.name}</Text>
          <View style={[styles.colorDot, { backgroundColor: item.color || currentTheme.primary }]} />
        </View>

        <View style={{ marginTop: 8 }}>
          <View style={[styles.progressBar, { backgroundColor: adjustAlpha(currentTheme.muted, 0.06) }]}> 
            <View style={[styles.progressFill, { width: `${calculateProjectProgress(item).progress}%`, backgroundColor: item.color || currentTheme.primary }]} />
          </View>
          <Text style={{ color: currentTheme.mutedForeground, marginTop: 6 }}>{calculateProjectProgress(item).progress}% complete • {calculateProjectProgress(item).totalTasks} tasks</Text>
        </View>

        <View style={{ flexDirection: "row", marginTop: 12 }}>
          {(item.members || []).slice(0, 4).map((m: any, i: number) => (
            <View key={`${m._id || m.id}-${i}`} style={[styles.avatarWrapper, { marginLeft: i === 0 ? 0 : -8 }]}> 
              <Avatar user={m} />
            </View>
          ))}

          {(item.members || []).length > 4 && (
            <View style={[styles.moreCount, { backgroundColor: adjustAlpha(currentTheme.muted, 0.08) }]}> 
              <Text style={{ color: currentTheme.mutedForeground }}>+{(item.members || []).length - 4}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: currentTheme.background, paddingBottom: insets.bottom + 12 }]}> 
      <View style={[styles.header, { borderBottomColor: currentTheme.border }]}> 
        <Text style={[styles.title, { color: currentTheme.cardForeground }]}>Projects</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addButton, { backgroundColor: currentTheme.primary }]}> 
          <Ionicons name="add" size={20} color={currentTheme.primaryForeground} />
        </TouchableOpacity>
      </View>

      {isProjectsLoading ? (
        <FlatList
          data={[1, 2, 3]}
          keyExtractor={(i) => `skeleton-${i}`}
          contentContainerStyle={{ padding: 12 }}
          renderItem={() => <SkeletonCard />}
        />
      ) : (projects || []).length === 0 ? (
        <EmptyProjectsView />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p._id}
          contentContainerStyle={{ padding: 12 }}
          renderItem={renderProject}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={currentTheme.primaryForeground} colors={[currentTheme.primary]} />}
        />
      )}

      {/* Create Project Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => { if (!creating) setModalVisible(false); }}>
        <Pressable style={styles.modalOverlay} onPress={() => { if (!creating) setModalVisible(false); }}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}> 
            <Text style={[styles.modalTitle, { color: currentTheme.cardForeground }]}>Create New Project</Text>

            <TextInput
              placeholder="Project Title"
              placeholderTextColor={currentTheme.mutedForeground}
              style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.cardForeground, borderColor: currentTheme.border }]}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              placeholder="Project Description"
              placeholderTextColor={currentTheme.mutedForeground}
              style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.cardForeground, borderColor: currentTheme.border }]}
              value={newDescription}
              onChangeText={setNewDescription}
            />

            <Text style={{ color: currentTheme.mutedForeground, marginTop: 8 }}>Pick Color</Text>
            <View style={styles.colorRow}>
              {["#6750A4", "#10B981", "#EAB308", "#3B82F6", "#F43F5E"].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setNewColor(c)}
                  style={[
                    styles.colorOption,
                    {
                      backgroundColor: c,
                      borderWidth: newColor === c ? 2 : 0,
                      borderColor: currentTheme.cardForeground,
                    },
                  ]}
                />
              ))}
            </View>

            <TouchableOpacity onPress={createNewProject} style={[styles.saveButton, { backgroundColor: currentTheme.primary }]} disabled={creating}>
              <Text style={{ color: currentTheme.primaryForeground, fontWeight: "600" }}>{creating ? "Creating..." : "Create"}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
      <NotificationTestScreen/>
    </View>
  );
}

// helpers
function adjustAlpha(hex: string, alpha: number) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontSize: 20, fontWeight: "700" },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },

  card: { borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  projectTitle: { fontSize: 16, fontWeight: "700" },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  progressBar: { height: 8, borderRadius: 6, overflow: "hidden", marginTop: 6 },
  progressFill: { height: 8, borderRadius: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },

  avatarWrapper: { width: 36, height: 36, borderRadius: 18, overflow: "hidden" },
  moreCount: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: "#00000088", justifyContent: "center", padding: 20 },
  modalContent: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 8,
  },
  colorRow: { flexDirection: "row", marginTop: 8 },
  colorOption: { width: 30, height: 30, borderRadius: 15, marginRight: 10 },
  saveButton: {
    marginTop: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
});