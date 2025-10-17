// app/(tabs)/projects.tsx
import React, { useState } from "react";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppSelector } from "@/store/hooks";
import Avatar from "@/components/Avatar";

type Project = {
  id: string;
  title: string;
  color: string;
  progress: number;
  members: { id: string; avatar?: string; name: string }[];
};

const SAMPLE_PROJECTS: Project[] = [
  {
    id: "p1",
    title: "Bright Veil",
    color: "#5B4BFF",
    progress: 0.62,
    members: [
      { id: "u1", avatar: "https://i.pravatar.cc/40?img=1", name: "Aditya" },
      { id: "u2", avatar: "https://i.pravatar.cc/40?img=2", name: "Neha" },
    ],
  },
  {
    id: "p2",
    title: "NOU e-Learning",
    color: "#10B981",
    progress: 0.28,
    members: [{ id: "u3", avatar: "https://i.pravatar.cc/40?img=3", name: "Ravi" }],
  },
];

export default function ProjectsScreen() {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  
  const [modalVisible, setModalVisible] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newColor, setNewColor] = useState("#6750A4");

  const {projects} = useAppSelector(state=> state.project)

  const createProject = () => {
    if (!newTitle.trim()) {
      Alert.alert("Error", "Please enter a project title.");
      return;
    }
    const newProject: Project = {
      id: Date.now().toString(),
      title: newTitle.trim(),
      color: newColor,
      progress: 0,
      members: [],
    };
    // setProjects((prev) => [newProject, ...prev]);
    // dispatch project
    setModalVisible(false);
    setNewTitle("");
  };
  function calculateProjectProgress(project: any) {
  const totalTasks = project?.tasks?.length ?? 0;
  const completedTasks = project?.tasks?.filter((t: any) => t.status === "completed" || t.status === "canceled").length ?? 0;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  return { progress, totalTasks, completedTasks };
}

  return (
    <View style={[styles.screen, { backgroundColor: currentTheme.background, paddingBottom: insets.bottom + 12 }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            borderBottomColor: currentTheme.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: currentTheme.cardForeground }]}>Projects</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={[styles.addButton, { backgroundColor: currentTheme.primary }]}>
          <Ionicons name="add" size={20} color={currentTheme.primaryForeground} />
        </TouchableOpacity>
      </View>

      {/* Project List */}
      <FlatList
        data={projects}
        keyExtractor={(p) => p._id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(routes)/projects/${item._id}`)}
            style={[styles.card, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={[styles.projectTitle, { color: currentTheme.cardForeground }]}>{item.name}</Text>
                <View style={[styles.colorDot, { backgroundColor: item.color }]} />
              </View>

              <View style={{ marginTop: 8 }}>
                <View style={[styles.progressBar, { backgroundColor: currentTheme.background || "#E5E7EB" }]}>
                  <View style={[styles.progressFill, { width: `${calculateProjectProgress(item).progress}%`, backgroundColor: item.color }]} />
                </View>
                <Text style={{ color: currentTheme.mutedForeground, marginTop: 6 }}>
                  {calculateProjectProgress(item).progress}% complete
                </Text>
              </View>

              <View style={{ flexDirection: "row", marginTop: 12 , gap:4}}>
                {item.members.slice(0.4
                  
                ).map((m) => (
                  <Avatar user={m}/>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Create Project Modal */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={[styles.modalContent, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.cardForeground }]}>Create New Project</Text>

            <TextInput
              placeholder="Project Title"
              placeholderTextColor={currentTheme.mutedForeground}
              style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.cardForeground, borderColor: currentTheme.border }]}
              value={newTitle}
              onChangeText={setNewTitle}
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

            <TouchableOpacity onPress={createProject} style={[styles.saveButton, { backgroundColor: currentTheme.primary }]}>
              <Text style={{ color: currentTheme.primaryForeground, fontWeight: "600" }}>Create</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
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
  progressBar: { height: 8, borderRadius: 6, overflow: "hidden" },
  progressFill: { height: 8, borderRadius: 6 },
  avatar: { width: 36, height: 36, borderRadius: 18, marginRight: 8 },

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
    marginTop: 4,
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
