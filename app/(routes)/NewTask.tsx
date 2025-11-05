// app/(tabs)/tasks/new.tsx
import React, { useEffect, useState } from "react";
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
import { createTask } from "@/lib/api/task";
import { useToast } from "@/components/Toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { User } from "@/store/user/userSlice";
import { insertTaskInsideProject } from "@/store/project2/projectSlice";
import { insertTask } from "@/store/task/taskSlice";

/**
 * Add Task page (Add / Create Task)
 * - Fields: title, description, due date, reminder, project, tags, priority, assignee
 * - Minimal modal/picker UIs, theme-aware
 * - Replace sample data and TODOs with your API / Firestore logic
 */

// Sample types
type Priority = "low" | "medium" | "high" | "critical" | "none";
type Project = { id: string; title: string; color: string };

export default function AddTask() {
  const { isDark } = useThemeToggle() as any;
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useToast();
  const dispatch = useAppDispatch()

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState<string | null>();
  const [assigneeId, setAssigneeId] = useState<string | null>();
  const [priority, setPriority] = useState<Priority>("medium");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  // Date/time (UNIFIED picker)
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [reminderDate, setReminderDate] = useState<Date | null>(null);
  // controls single picker:
  const [showPicker, setShowPicker] = useState(false);
  // 'date' | 'time'
  const [pickerMode, setPickerMode] = useState<"date" | "time">("date");
  // target: which field we are editing: 'due' | 'reminder'
  const [datePickerMode, setDatePickerMode] = useState<"due" | "reminder">(
    "due"
  );

  // Modals
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [assigneeModalOpen, setAssigneeModalOpen] = useState(false);

  const [projectMembers, setProjectMembers] = useState<User[]>();

  const { projects } = useAppSelector((state) => state.project);


  useEffect(() => {
    const members = projects.filter((p) => p._id == projectId)[0]?.members;
    setProjectMembers(members);
  }, [projectId, projects]);

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

  /* --- Add/replace these helper functions & state handlers in your component (if not already present) --- */

  /**
   * Open unified due picker.
   * - timeOnly = false -> opens date first and then time automatically
   * - timeOnly = true -> opens time picker only (edit time)
   */
  function openDuePicker(timeOnly = false) {
    setDatePickerMode("due"); // target is due date
    setPickerMode(timeOnly ? "time" : "date");
    setShowPicker(true);
  }

  /* merge helpers (preserve time when picking date; preserve date when picking time) */
  function mergeDateKeepTime(base: Date | null | undefined, newDate: Date) {
    const b = base ? new Date(base) : new Date();
    const n = new Date(newDate);
    b.setFullYear(n.getFullYear(), n.getMonth(), n.getDate());
    return b;
  }
  function mergeDateKeepDate(base: Date | null | undefined, newTime: Date) {
    const b = base ? new Date(base) : new Date();
    const t = new Date(newTime);
    b.setHours(t.getHours(), t.getMinutes(), t.getSeconds(), 0);
    return b;
  }

  /**
   * Unified onChange handler for the single DateTimePicker
   */
  function onChangeDate(event: any, selected?: Date | undefined) {
    // Android: event.type === 'dismissed' | 'set'
    if (Platform.OS === "android") {
      if (event?.type === "dismissed") {
        setShowPicker(false);
        return;
      }
    }

    const picked = selected ?? undefined;
    if (!picked) {
      // nothing chosen yet
      if (Platform.OS === "android") setShowPicker(false);
      return;
    }

    // if we're editing the due date
    if (datePickerMode === "due") {
      if (pickerMode === "date") {
        // user picked a date -> keep previous time (if any)
        const merged = mergeDateKeepTime(dueDate, picked);
        setDueDate(merged);

        // if we opened in date mode to capture both date+time, now open time picker
        // Android closes automatically so reopen; iOS we can switch mode inline
        if (Platform.OS === "android") {
          // reopen as time picker shortly after Android closes
          setShowPicker(false);
          setTimeout(() => {
            setPickerMode("time");
            setShowPicker(true);
          }, 120);
        } else {
          // iOS inline: just switch to time mode and keep picker visible
          setPickerMode("time");
        }
      } else {
        // time selected -> keep date portion and set new time
        const merged = mergeDateKeepDate(dueDate, picked);
        setDueDate(merged);
        // close on Android; on iOS you may keep it open if you want
        if (Platform.OS === "android") setShowPicker(false);
      }
    } else {
      // (if you keep reminderDate or other targets later, handle similarly)
      if (pickerMode === "date") {
        // placeholder behaviour
        if (Platform.OS === "android") {
          setShowPicker(false);
          setTimeout(() => {
            setPickerMode("time");
            setShowPicker(true);
          }, 120);
        } else {
          setPickerMode("time");
        }
      } else {
        if (Platform.OS === "android") setShowPicker(false);
      }
    }
  }

  /* small formatter helper you can place near formatDate */
  function formatDueDate(d?: Date | null) {
    if (!d) return "";
    const date = new Date(d);
    // Example: "Oct 7, 2025 • 3:30 PM"
    return `${date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} • ${date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  async function validateAndSave() {
    if (!title.trim()) {
      Alert.alert("Validation", "Please enter a title for the task.");
      return;
    } 

    if(!projectId){
      Alert.alert("Validation", "Project is required")
    }

    // Build payload
    const payload = {
      title: title.trim(),
      description: description.trim(),
      project: projectId,
      assignedToUser: assigneeId,
      priority,
      tags,
      dueDate,
      dueTime: reminderDate,
    };

    const res = await createTask(payload);
    if (res?.success) {
      console.log(res.data.data)
      dispatch(insertTaskInsideProject(res.data.data.task ? res.data.data.task :res.data.data))
      dispatch(insertTask(res.data.data.task ? res.data.data.task :res.data.data))
      toast?.show?.(res.data?.message ?? "Task Created", "success");
    } else {
      toast?.show?.(res?.message ?? "Creation Failed", "danger");
    }

    router.replace("/");
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: currentTheme.background,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={currentTheme.cardForeground}
          />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: currentTheme.cardForeground }]}
        >
          Add Task
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Title */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>
          Title
        </Text>
        <TextInput
          placeholder="Task title"
          placeholderTextColor={currentTheme.mutedForeground}
          value={title}
          onChangeText={setTitle}
          style={[
            styles.input,
            {
              backgroundColor: currentTheme.card,
              color: currentTheme.cardForeground,
            },
          ]}
        />

        {/* Description */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>
          Description
        </Text>
        <TextInput
          placeholder="Notes or description"
          placeholderTextColor={currentTheme.mutedForeground}
          value={description}
          onChangeText={setDescription}
          multiline
          style={[
            styles.textarea,
            {
              backgroundColor: currentTheme.card,
              color: currentTheme.cardForeground,
            },
          ]}
        />

        {/* Project selector */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>
          Project
        </Text>
        <TouchableOpacity
          onPress={() => setProjectModalOpen(true)}
          style={[
            styles.selector,
            {
              backgroundColor: currentTheme.card,
              borderColor: currentTheme.border,
            },
          ]}
        >
          <Text style={{ color: currentTheme.cardForeground }}>
            {projects.find((p) => p._id === projectId)?.name ??
              "Select project"}{" "}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={currentTheme.mutedForeground}
          />
        </TouchableOpacity>

        {/* Assignee selector */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>
          Assign to
        </Text>
        <TouchableOpacity
          onPress={() => setAssigneeModalOpen(true)}
          style={[
            styles.selector,
            {
              backgroundColor: currentTheme.card,
              borderColor: currentTheme.border,
            },
          ]}
        >
          <Text style={{ color: currentTheme.cardForeground }}>
            {projectMembers?.find((u) => u._id === assigneeId)?.name ??
              "Select member"}{" "}
          </Text>
          <Ionicons
            name="chevron-down"
            size={18}
            color={currentTheme.mutedForeground}
          />
        </TouchableOpacity>

        {/* Priority */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>
          Priority
        </Text>
        <View style={{ flexDirection: "row", marginBottom: 12 }}>
          {(["low", "medium", "high", "critical"] as Priority[]).map(
            (p) => {
              const active = p === priority;
              return (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  style={[
                    styles.priorityBtn,
                    {
                      backgroundColor: active
                        ? currentTheme.primary
                        : currentTheme.card,
                      borderColor: currentTheme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active
                        ? currentTheme.primaryForeground
                        : currentTheme.cardForeground,
                    }}
                  >
                    {p.toLocaleUpperCase()}{" "}
                  </Text>
                </TouchableOpacity>
              );
            }
          )}
        </View>

        {/* Tags */}
        <Text style={[styles.label, { color: currentTheme.foreground }]}>
          Tags
        </Text>
        <View style={styles.tagsRow}>
          {tags.map((t) => (
            <View
              key={t}
              style={[styles.tagPill, { backgroundColor: currentTheme.muted }]}
            >
              <Text
                numberOfLines={1}
                style={{ color: currentTheme.mutedForeground, maxWidth: 120 }}
              >
                {t}
              </Text>
              <TouchableOpacity
                onPress={() => removeTag(t)}
                style={{ marginLeft: 8 }}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={currentTheme.mutedForeground}
                />
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
            style={[
              styles.input,
              {
                flex: 1,
                backgroundColor: currentTheme.card,
                color: currentTheme.cardForeground,
              },
            ]}
          />
          <TouchableOpacity
            onPress={addTag}
            style={[styles.addBtn, { backgroundColor: currentTheme.primary }]}
          >
            <Ionicons
              name="add"
              size={18}
              color={currentTheme.primaryForeground}
            />
          </TouchableOpacity>
        </View>

        {/* Due Date (single input with date + time picker) */}
        <View style={{ marginBottom: 12 }}>
          <Text style={[styles.label, { color: currentTheme.foreground }]}>
            Due date & time
          </Text>

          <TouchableOpacity
            onPress={() => openDuePicker(false)} // pick date then time
            style={[
              styles.selector,
              {
                backgroundColor: currentTheme.card,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <View>
              <Text style={{ color: currentTheme.cardForeground }}>
                {dueDate ? formatDueDate(dueDate) : "Select due date & time "}{" "}
              </Text>
            </View>

            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <TouchableOpacity
                onPress={() => openDuePicker(true)}
                style={{ paddingRight: 8 }}
              >
                <Ionicons
                  name="time"
                  size={18}
                  color={currentTheme.mutedForeground}
                />
              </TouchableOpacity>
              <Ionicons
                name="calendar"
                size={18}
                color={currentTheme.mutedForeground}
              />
            </View>
          </TouchableOpacity>
        </View>

        {/* Action buttons */}
        <View style={{ flexDirection: "row", marginTop: 20 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={[
              styles.cancelBtn,
              {
                backgroundColor: currentTheme.secondary,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <Text style={{ color: currentTheme.secondaryForeground }}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={validateAndSave}
            style={[styles.saveBtn, { backgroundColor: currentTheme.primary }]}
          >
            <Text
              style={{
                color: currentTheme.primaryForeground,
                fontWeight: "700",
              }}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>
        {/* Single DateTimePicker instance */}
        {showPicker && (
          <DateTimePicker
            value={dueDate ?? new Date()}
            mode={pickerMode} // 'date' or 'time'
            is24Hour={false}
            display={
              Platform.OS === "ios"
                ? pickerMode === "date"
                  ? "inline"
                  : "spinner"
                : "default"
            }
            onChange={onChangeDate}
          />
        )}
      </ScrollView>

      {/* Project modal */}
      <Modal
        visible={projectModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setProjectModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProjectModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalInner,
              {
                backgroundColor: currentTheme.card,
                borderColor: currentTheme.border,
              },
            ]}
            onPress={() => {}}
          >
            <Text
              style={{
                fontWeight: "700",
                color: currentTheme.cardForeground,
                marginBottom: 12,
              }}
            >
              Select project
            </Text>
            <FlatList
              data={projects}
              keyExtractor={(p) => p._id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setProjectId(item._id);
                    setProjectModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      padding: 12,
                      borderRadius: 10,
                      display: "flex",
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                      backgroundColor: pressed
                        ? currentTheme.muted
                        : "transparent",
                    },
                  ]}
                >
                  <Text style={{ color: currentTheme.cardForeground }}>
                    {item.name}{" "}
                  </Text>
                  <View
                    style={{
                      backgroundColor: item.color,
                      height: 10,
                      width: 10,
                      borderRadius: 50,
                    }}
                  />
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assignee modal */}
      <Modal
        visible={assigneeModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setAssigneeModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setAssigneeModalOpen(false)}
        >
          <Pressable
            style={[
              styles.modalInner,
              {
                backgroundColor: currentTheme.card,
                borderColor: currentTheme.border,
              },
            ]}
            onPress={() => {}}
          >
            <Text
              style={{
                fontWeight: "700",
                color: currentTheme.cardForeground,
                marginBottom: 12,
              }}
            >
              Assign to
            </Text>
            <FlatList
              data={projectMembers}
              keyExtractor={(u) => u._id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    setAssigneeId(item._id);
                    setAssigneeModalOpen(false);
                  }}
                  style={({ pressed }) => [
                    {
                      padding: 12,
                      borderRadius: 10,
                      backgroundColor: pressed
                        ? currentTheme.muted
                        : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    },
                  ]}
                >
                  <Text style={{ color: currentTheme.cardForeground }}>
                    {item.name}{" "}
                  </Text>
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
  header: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  label: { marginBottom: 8, fontWeight: "600" },
  input: { padding: 12, borderRadius: 10, marginBottom: 12 },
  textarea: {
    padding: 12,
    borderRadius: 10,
    minHeight: 92,
    marginBottom: 12,
    textAlignVertical: "top",
  },

  selector: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
  },

  priorityBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
  },

  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  tagPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },

  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginLeft: 8,
    alignItems: "center",
    justifyContent: "center",
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    marginRight: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000044",
    justifyContent: "flex-end",
  },
  modalInner: {
    padding: 16,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    borderTopWidth: 1,
    maxHeight: "60%",
  },
});
