// app/(tabs)/tasks/new.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Modal,
  FlatList,
  Pressable,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

/**
 * Add Task page (Add / Create Task)
 * - Fields: title, description, due date, reminder, project, tags, priority, assignee
 * - Minimal modal/picker UIs, theme-aware
 * - Replace sample data and TODOs with your API / Firestore logic
 */

// Sample types
type Priority = "Low" | "Medium" | "High";
type Project = { id: string; title: string; color: string };
type User = { id: string; name: string; initials?: string };

const SAMPLE_PROJECTS: Project[] = [
  { id: "p1", title: "Bright Veil", color: "#5B4BFF" },
  { id: "p2", title: "NOU e-Learning", color: "#10B981" },
];

const SAMPLE_USERS: User[] = [
  { id: "u1", name: "Aditya Kumar", initials: "AK" },
  { id: "u2", name: "Neha Singh", initials: "NS" },
  { id: "u3", name: "Ravi Patel", initials: "RP" },
];

export default function AddTask() {
  const { isDark } = useThemeToggle() as any;
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>(SAMPLE_PROJECTS[0].id);
  const [assigneeId, setAssigneeId] = useState<string | null>(SAMPLE_USERS[0].id);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Date/time
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<"due" | "reminder">("due");

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);

  // Helpers
  function addTag() {
    const t = tagInput.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((s) => [...s, t]);
    setTagInput("");
  }
  function removeTag(t: string) {
    setTags((s) => s.filter((x) => x !== t));
  }

  function openDatePicker(type: "due" | "reminder", time?: boolean) {
    setDatePickerMode(type);
    if (time) setShowTimePicker(true);
    else setShowDatePicker(true);
  }

  function onChangeDate(event: any, selected?: Date | undefined) {
    if (event.type === "dismissed") {
      setShowDatePicker(false);
      setShowTimePicker(false);
      return;
    }
    const dt = selected || (datePickerMode === "due" ? dueDate : reminderDate) || new Date();
    if (datePickerMode === "due") setDueDate(new Date(dt));
    else setReminderDate(new Date(dt));
    setShowDatePicker(false);
    setShowTimePicker(false);
  }

  function validateAndSave() {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a title for the task.");
      return;
    }

    // Build payload
    const payload = {
      title: title.trim(),
      description: description.trim(),
      projectId,
      assigneeId,
      priority,
      tags,
      dueDate: dueDate ? dueDate.toISOString() : null,
      reminderDate: reminderDate ? reminderDate.toISOString() : null,
      createdAt: new Date().toISOString(),
    };

    // TODO: replace with API/Firestore save
    console.log("Saving task:", payload);

    // On success, navigate back to home or tasks list
    router.replace("/"); // change target route as needed, e.g. "/(tabs)/index" or "/projects"
  }

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background, paddingBottom: insets.bottom + 12 }]}>
        <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={[styles.header, {  borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={22} color={currentTheme.cardForeground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.cardForeground }]}>Add Task</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Title */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>Title</Text>
        <TextInput
          placeholder="Task title"
          placeholderTextColor={currentTheme.mutedForeground}
          value={title}
          onChangeText={setTitle}
          style={[styles.input, { backgroundColor: currentTheme.card, color: currentTheme.cardForeground }]}
        />

        {/* Description */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>Description</Text>
        <TextInput
          placeholder="Notes or description"
          placeholderTextColor={currentTheme.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          style={[styles.textarea, { backgroundColor: currentTheme.card, color: currentTheme.cardForeground }]}
        />

        {/* Project selector */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>Project</Text>
        <TouchableOpacity onPress={() => setProjectModalOpen(true)} style={[styles.selector, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
          <Text style={{ color: currentTheme.cardForeground }}>{SAMPLE_PROJECTS.find((p) => p.id === projectId)?.title ?? "Select project"}</Text>
          <Ionicons name="chevron-down" size={18} color={currentTheme.mutedForeground} />
        </TouchableOpacity>

        {/* Assignee selector */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>Assign to</Text>
        <TouchableOpacity onPress={() => setAssigneeModalOpen(true)} style={[styles.selector, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
          <Text style={{ color: currentTheme.cardForeground }}>{SAMPLE_USERS.find((u) => u.id === assigneeId)?.name ?? "Select member"}</Text>
          <Ionicons name="chevron-down" size={18} color={currentTheme.mutedForeground} />
        </TouchableOpacity>

        {/* Priority */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>Priority</Text>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {(["Low", "Medium", "High"] as Priority[]).map((p) => {
            const active = p === priority;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPriority(p)}
                style={[
                  styles.priorityBtn,
                  { backgroundColor: active ? currentTheme.primary : currentTheme.card, borderColor: currentTheme.border },
                ]}
              >
                <Text style={{ color: active ? currentTheme.primaryForeground : currentTheme.cardForeground }}>{p}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tags */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>Tags</Text>
        <View style={styles.tagsRow}>
          {tags.map((t) => (
            <View key={t} style={[styles.tagPill, { backgroundColor: currentTheme.muted }]}>
              <Text numberOfLines={1} style={{ color: currentTheme.mutedForeground, maxWidth: 120 }}>
                {t}
              </Text>
              <TouchableOpacity onPress={() => removeTag(t)} style={{ marginLeft: 8 }}>
                <Ionicons name="close" size={14} color={currentTheme.mutedForeground} />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          <TextInput
            placeholder="Add tag"
            placeholderTextColor={currentTheme.mutedForeground}
            value={tagInput}
            onChangeText={setTagInput}
            onSubmitEditing={addTag}
            style={[styles.input, { flex: 1, backgroundColor: currentTheme.card, color: currentTheme.cardForeground }]}
          />
          <TouchableOpacity onPress={addTag} style={[styles.addBtn, { backgroundColor: currentTheme.primary }]}>
            <Ionicons name="add" size={18} color={currentTheme.primaryForeground} />
          </TouchableOpacity>
        </View>

        {/* Due date & Reminder */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: currentTheme.foreground }]}>Due Date</Text>
            <TouchableOpacity onPress={() => openDatePicker("due", false)} style={[styles.selector, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
              <Text style={{ color: currentTheme.cardForeground }}>{dueDate ? dueDate.toDateString() : "Select date"}</Text>
              <Ionicons name="calendar" size={18} color={currentTheme.mutedForeground} />
            </TouchableOpacity>
          </View>

          <View style={{ width: 12 }} />

          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: currentTheme.foreground }]}>Reminder</Text>
            <TouchableOpacity onPress={() => openDatePicker("reminder", true)} style={[styles.selector, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
              <Text style={{ color: currentTheme.cardForeground }}>{reminderDate ? reminderDate.toLocaleString() : "Select reminder"}</Text>
              <Ionicons name="alarm" size={18} color={currentTheme.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", marginTop: 20 }}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.cancelBtn, { backgroundColor: currentTheme.secondary, borderColor: currentTheme.border }]}>
            <Text style={{ color: currentTheme.secondaryForeground }}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={validateAndSave} style={[styles.saveBtn, { backgroundColor: currentTheme.primary }]}>
            <Text style={{ color: currentTheme.primaryForeground, fontWeight: "700" }}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* Date/Time pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={onChangeDate}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={reminderDate ?? new Date()}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onChangeDate}
          />
        )}
      </ScrollView>

      {/* Project modal */}
      <Modal visible={projectModalOpen} animationType="slide" transparent onRequestClose={() => setProjectModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setProjectModalOpen(false)}>
          <Pressable style={[styles.modalInner, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]} onPress={() => {}}>
            <Text style={{ fontWeight: "700", color: currentTheme.cardForeground, marginBottom: 12 }}>Select project</Text>
            <FlatList
              data={SAMPLE_PROJECTS}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setProjectId(item.id);
                    setProjectModalOpen(false);
                  }}
                  style={({ pressed }) => [{ padding: 12, borderRadius: 10, backgroundColor: pressed ? currentTheme.muted : "transparent" }]}
                >
                  <Text style={{ color: currentTheme.cardForeground }}>{item.title}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assignee modal */}
      <Modal visible={assigneeModalOpen} animationType="slide" transparent onRequestClose={() => setAssigneeModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAssigneeModalOpen(false)}>
          <Pressable style={[styles.modalInner, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]} onPress={() => {}}>
            <Text style={{ fontWeight: "700", color: currentTheme.cardForeground, marginBottom: 12 }}>Assign to</Text>
            <FlatList
              data={SAMPLE_USERS}
              keyExtractor={(u) => u.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setAssigneeId(item.id);
                    setAssigneeModalOpen(false);
                  }}
                  style={({ pressed }) => [{ padding: 12, borderRadius: 10, backgroundColor: pressed ? currentTheme.muted : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }]}
                >
                  <Text style={{ color: currentTheme.cardForeground }}>{item.name}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { height: 64, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  label: { marginBottom: 8, fontWeight: "600" },
  input: { padding: 12, borderRadius: 10, marginBottom: 12 },
  textarea: { padding: 12, borderRadius: 10, minHeight: 92, marginBottom: 12, textAlignVertical: "top" },

  selector: { padding: 12, borderRadius: 10, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1 },

  priorityBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginRight: 10, borderWidth: 1 },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  tagPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },

  addBtn: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginLeft: 8, alignItems: "center", justifyContent: "center" },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, marginRight: 8, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: "center", justifyContent: "center" },

  modalOverlay: { flex: 1, backgroundColor: "#00000044", justifyContent: "flex-end" },
  modalInner: { padding: 16, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTopWidth: 1, maxHeight: "60%" },
});
