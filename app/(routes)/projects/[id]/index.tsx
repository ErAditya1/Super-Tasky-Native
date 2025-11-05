// app/(tabs)/projects/[id].tsx
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useGlobalSearchParams, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppSelector } from "@/store/hooks";
import { ProjectInterface } from "@/store/project2/projectSlice";
import { User } from "@/store/user/userSlice";
import { TaskInterface } from "@/store/task/taskSlice";
import SwipeableTaskCard from "@/components/SwipeableTaskCard";
import { swipeController } from "@/components/swipeController";
import MemberCard from "@/components/MemberCard";

/* ------------------------------------------------
   Types + helper option sets
   ------------------------------------------------ */
type PickerOpt = {
  value: string;
  label: string;
  icon: string | any; // Ionicons icon name or component
  color: string;
};

/* -------------------------
   Default option sets
   ------------------------- */
const STATUS: PickerOpt[] = [
  { value: "pending", label: "Pending", icon: "time-outline", color: "#d97706" },
  { value: "in_progress", label: "In Progress", icon: "play-circle-outline", color: "#059669" },
  { value: "completed", label: "Completed", icon: "checkmark-circle-outline", color: "#2563eb" },
  { value: "canceled", label: "Canceled", icon: "close-circle-outline", color: "#ef4444" },
];

const PRIORITY: PickerOpt[] = [
  { value: "none", label: "None", icon: "remove-circle-outline", color: "#a16207" },
  { value: "low", label: "Low", icon: "arrow-down-circle-outline", color: "#047857" },
  { value: "medium", label: "Medium", icon: "speedometer-outline", color: "#2563eb" },
  { value: "high", label: "High", icon: "warning-outline", color: "#f97316" },
  { value: "critical", label: "Critical", icon: "alert-circle-outline", color: "#b91c1c" },
];

const POINTS: PickerOpt[] = [
  { value: "No Estimate", label: "No Estimate", icon: "pricetag-outline", color: "#a16207" },
  { value: "1 Point", label: "1 Point", icon: "pricetag-outline", color: "#047857" },
  { value: "2 Point", label: "2 Point", icon: "pricetag-outline", color: "#2563eb" },
  { value: "3 Point", label: "3 Point", icon: "pricetag-outline", color: "#7c3aed" },
  { value: "4 Point", label: "4 Point", icon: "pricetag-outline", color: "#7c3aed" },
  { value: "5 Point", label: "5 Point", icon: "pricetag-outline", color: "#b91c1c" },
];

const TYPE: PickerOpt[] = [
  { value: "Task", label: "Task", icon: "list-outline", color: "#a16207" },
  { value: "Improvement", label: "Improvement", icon: "trending-up-outline", color: "#047857" },
  { value: "Research", label: "Research", icon: "flask-outline", color: "#2563eb" },
  { value: "Testing", label: "Testing", icon: "search-outline", color: "#0f766e" },
  { value: "Bug", label: "Bug", icon: "bug-outline", color: "#b91c1c" },
];

/* ------------------------------------------------
   Lightweight Avatar fallback (keeps file self-contained)
   ------------------------------------------------ */
function Avatar({ user, size = 36 }: { user?: any; size?: number }) {
  const initials =
    (user?.name ?? user?.username ?? "U")
      .split(" ")
      .map((s: string) => s[0])
      .slice(0, 2)
      .join("") || "U";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#ddd",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontWeight: "700" }}>{initials}{" "}</Text>
    </View>
  );
}

/* -------------------------
   status emoji helper
   ------------------------- */
function statusEmoji(status?: string) {
  switch (status) {
    case "completed":
      return "✅";
    case "in_progress":
      return "🔧";
    case "canceled":
      return "🚫";
    case "pending":
      return "⏳";
    default:
      return "📌";
  }
}

/* ========================================================
   Main screen component
   ======================================================== */
export default function ProjectDetail() {
  const { id } = useGlobalSearchParams();
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"Tasks" | "Members" | "Chat">("Tasks");
  const [tasks, setTasks] = useState<TaskInterface[]>();
  const [members, setMembers] = useState<User[]>();
  const [message, setMessage] = useState("");
  const [project, setProject] = useState<ProjectInterface>();
  const [messages, setMessages] = useState<{ id: string; author: string; body: string }[]>(
    [{ id: "m1", author: "Aditya", body: "Welcome to the project!" }]
  );

  // search/filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "high">("all");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // --- NEW: date range + multi-select filters
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState<null | "start" | "end">(null);

  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string[]>([]);
  const [pointsFilter, setPointsFilter] = useState<string[]>([]);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);

  // activity sheet
  const [activitySheetVisible, setActivitySheetVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Partial<TaskInterface> | null>(null);

  const projects = useAppSelector((state) => state.project.projects);

  useEffect(() => {
    const p = projects?.filter((p) => p._id == id)[0];
    setProject(p);
    setMembers(p?.members);
    setTasks(p?.tasks);
  }, [projects, id]);

  if (!project) {
    return <Text> Loading...{" "}</Text>;
  }

  const projectTitle = `Project > ${project.name}`;

  function onSendMessage() {
    if (!message.trim()) return;
    setMessages((m) => [...m, { id: Date.now().toString(), author: "You", body: message }]);
    setMessage("");
  }

  function getTaskTitle(t: any) {
    return t.title || t.name || t.taskName || "Untitled Task";
  }
  function getTaskAssignee(t: any) {
    if (!t) return "";
    if (typeof t.assignee === "string") return t.assignee;
    if (t.assignee?.name) return t.assignee.name;
    if (typeof t.assignedTo === "string") return t.assignedTo;
    if (t.assignedTo?.name) return t.assignedTo.name;
    if (t.assignedToUser?.name) return t.assignedToUser.name;
    return "";
  }

  const localTasks = tasks ?? [];
  const searchTerm = searchQuery;

  /* -------------------------
     Helpers for new filters
     ------------------------- */
  const toggleFrom = useCallback((arr: string[], v: string) => {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }, []);

  const inRange = useCallback((iso?: string) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    if (Number.isNaN(t)) return false;
    const start = rangeStart ? new Date(rangeStart).setHours(0, 0, 0, 0) : -Infinity;
    const end = rangeEnd ? new Date(rangeEnd).setHours(23, 59, 59, 999) : Infinity;
    return t >= start && t <= end;
  }, [rangeStart, rangeEnd]);

  /* -------------------------
     Filtering logic (with date-range + multi-filters)
     ------------------------- */
  const filteredTodos = useMemo(() => {
    let list = (localTasks ?? []).slice();

    // base quick filter
    list = list.filter((t: any) => {
      if (filter === "active" && t.status === "completed") return false;
      if (filter === "completed" && t.status !== "completed") return false;
      if (filter === "high" && t.priority !== "high") return false;
      return true;
    });

    // date range (if either start or end is set)
    if (rangeStart || rangeEnd) {
      list = list.filter((t: any) => inRange(t?.dueDate ?? t?.due));
    }

    // status filter (multi)
    if (statusFilter.length) {
      list = list.filter((t: any) => statusFilter.includes(String(t.status)));
    }

    // priority filter
    if (priorityFilter.length) {
      list = list.filter((t: any) => priorityFilter.includes(String(t.priority)));
    }

    // points filter - normalize
    if (pointsFilter.length) {
      const norm = (x: any) => {
        if (x === null || x === undefined || x === "") return "No Estimate";
        const s = String(x).trim();
        if (/^\d+$/.test(s)) return `${s} Point`;
        return s;
      };
      list = list.filter((t: any) => pointsFilter.includes(norm(t.points)));
    }

    // type filter
    if (typeFilter.length) {
      list = list.filter((t: any) => typeFilter.includes(String(t.type)));
    }

    // search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter((todo: any) => {
        return (
          ((todo.title ?? "") as string).toLowerCase().includes(term) ||
          ((todo.category ?? "") as string).toLowerCase().includes(term) ||
          (((todo.tags ?? []) as string[])?.join(" ") ?? "").toLowerCase().includes(term)
        );
      });
    }

    return list;
  }, [
    localTasks,
    filter,
    searchTerm,
    rangeStart,
    rangeEnd,
    statusFilter,
    priorityFilter,
    pointsFilter,
    typeFilter,
    inRange,
  ]);

  const filteredTasks = useMemo(() => filteredTodos, [filteredTodos]);

  /* -------------------------
     Task list helpers (unchanged)
     ------------------------- */




  

  const EmptyTasksView = ({ style }: any) => (
    <View style={[{ padding: 24, alignItems: "center" }, style]}>
      <Ionicons name="checkmark-circle-outline" size={54} color={currentTheme.mutedForeground} />
      <Text style={{ color: currentTheme.cardForeground, fontWeight: "700", marginTop: 12 }}>No tasks{" "}</Text>
      <Text style={{ color: currentTheme.mutedForeground, marginTop: 8, textAlign: "center" }}>
        You're all caught up — add a task to get started.
      {" "}</Text>
      <TouchableOpacity
        onPress={() => router.push(`/(tabs)/projects`)}
        style={{ marginTop: 12, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: currentTheme.primary }}
      >
        <Text style={{ color: currentTheme.primaryForeground }}>Add Task{" "}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: currentTheme.background, paddingBottom: insets.bottom + 12 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={currentTheme.cardForeground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: currentTheme.cardForeground }]}>{projectTitle}{" "}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={[styles.segment, { backgroundColor: currentTheme.card }]}>
        {["Tasks", "Members", "Chat"].map((t) => {
          const active = t === activeTab;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t as any)}
              style={[styles.segmentItem, active && { borderBottomColor: currentTheme.primary, borderBottomWidth: 2 }]}
            >
              <Text style={{ color: active ? currentTheme.primary : currentTheme.mutedForeground, fontWeight: active ? "700" : "500" }}>{t}{" "}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={{ flex: 1, padding: 12 }}>
        {activeTab === "Tasks" && (
          <View style={{ flex: 1 }}>
            <View style={[styles.searchRow, { backgroundColor: currentTheme.card }]}>
              <View style={styles.searchInputWrapper}>
                <Ionicons name="search" size={18} color={currentTheme.mutedForeground} />
                <TextInput placeholder="Search tasks, category or tags..." placeholderTextColor={currentTheme.mutedForeground} value={searchQuery} onChangeText={setSearchQuery} style={[styles.searchInput, { color: currentTheme.cardForeground }]} returnKeyType="search" />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons name="close-circle" size={18} color={currentTheme.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity onPress={() => setFilterSheetOpen(true)} style={styles.smallAction}>
                <Ionicons name="filter" size={18} color={currentTheme.cardForeground} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={filteredTasks}
              onStartShouldSetResponder={() => {
                swipeController.closeOpen();
                return false;
              }}
              keyExtractor={(t) => t._id}
              renderItem={({ item }) => {
                const borderColor =
                  (item as any).status === "completed"
                    ? "#22c55e"
                    : (item as any).status === "canceled"
                    ? "red"
                    : (item as any).status === "in_progress"
                    ? "#0ea5e9"
                    : (item as any).status === "pending"
                    ? "#0091e9"
                    : "transparent";

                return (
                  <SwipeableTaskCard
                    task={item}
                    theme={currentTheme}
                    onPress={() => router.push(`/(routes)/projects/${project._id}/tasks/${item._id}`)}
                    onEdit={() => router.push(`/(routes)/projects/${project._id}/tasks/${item._id}/edit`)}
                    borderColor={borderColor}
                  />
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              ListEmptyComponent={() => (filteredTasks.length === 0 ? <EmptyTasksView /> : null)}
            />
          </View>
        )}

        {activeTab === "Members" && (
          <FlatList
            data={members}
            keyExtractor={(m) => m?._id}
            renderItem={({ item }) => <MemberCard member={item} theme={currentTheme} onPress={(m) => router.push(`/(routes)/user/profile`)} onMessage={(m) => router.push(`/(routes)/chat/123`)} />}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}

        {activeTab === "Chat" && (
          <View style={{ flex: 1 }}>
            <FlatList data={messages} keyExtractor={(m) => m.id} renderItem={({ item }) => <View style={{ marginBottom: 8 }}><Text style={{ color: currentTheme.cardForeground, fontWeight: "600" }}>{item.author}{" "}</Text><Text style={{ color: currentTheme.mutedForeground }}>{item.body}{" "}</Text></View>} />
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
              <TextInput placeholder="Message the team..." placeholderTextColor={currentTheme.mutedForeground} value={message} onChangeText={setMessage} style={[styles.messageInput, { backgroundColor: currentTheme.card, color: currentTheme.cardForeground, borderColor: currentTheme.border }]} />
              <TouchableOpacity onPress={onSendMessage} style={[styles.sendBtn, { backgroundColor: currentTheme.primary }]}><Text style={{ color: currentTheme.primaryForeground, fontWeight: "700" }}>Send{" "}</Text></TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Filter Sheet (enhanced: date range + multi-select) */}
      <Modal visible={filterSheetOpen} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setFilterSheetOpen(false)} />
        <Animated.View style={[styles.filterSheet, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
          <View style={styles.sheetGrab} />

          <ScrollView style={{ padding: 12 }}>
            

            {/* DATE RANGE */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ color: currentTheme.mutedForeground, marginBottom: 6 }}>Date range{" "}</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker("start")}
                  style={[styles.pill, { borderColor: currentTheme.border, backgroundColor: currentTheme.card }]}
                >
                  <Ionicons name="calendar" size={16} color={currentTheme.mutedForeground} />
                  <Text style={{ marginLeft: 8, color: currentTheme.cardForeground }}>{rangeStart ? rangeStart.toLocaleDateString() : "Start"}{" "}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setShowDatePicker("end")}
                  style={[styles.pill, { borderColor: currentTheme.border, backgroundColor: currentTheme.card }]}
                >
                  <Ionicons name="calendar" size={16} color={currentTheme.mutedForeground} />
                  <Text style={{ marginLeft: 8, color: currentTheme.cardForeground }}>{rangeEnd ? rangeEnd.toLocaleDateString() : "End"}{" "}</Text>
                </TouchableOpacity>

                {(rangeStart || rangeEnd) && (
                  <TouchableOpacity onPress={() => { setRangeStart(null); setRangeEnd(null); }} style={[styles.pill, { borderColor: currentTheme.border, backgroundColor: currentTheme.muted }]}>
                    <Ionicons name="close" size={16} color={currentTheme.mutedForeground} />
                    <Text style={{ marginLeft: 6, color: currentTheme.mutedForeground }}>Clear{" "}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={(showDatePicker === "start" ? (rangeStart ?? new Date()) : (rangeEnd ?? new Date()))}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={(e, selected) => {
                    if (Platform.OS === "android") setShowDatePicker(null);
                    if (!selected) return;
                    if (showDatePicker === "start") setRangeStart(selected);
                    else setRangeEnd(selected);
                  }}
                />
              )}
            </View>

            {/* STATUS */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: currentTheme.mutedForeground, marginBottom: 6 }}>Status{" "}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {STATUS.map((opt) => {
                  const active = statusFilter.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setStatusFilter((s) => toggleFrom(s, opt.value))}
                      style={[
                        styles.pill,
                        { borderColor: currentTheme.border, backgroundColor: active ? opt.color : currentTheme.card, marginRight: 8, marginTop: 8 },
                      ]}
                    >
                      <Ionicons name={opt.icon as any} size={16} color={active ? "#fff" : currentTheme.mutedForeground} />
                      <Text style={{ marginLeft: 6, color: active ? "#fff" : currentTheme.cardForeground }}>{opt.label}{" "}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* PRIORITY */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: currentTheme.mutedForeground, marginBottom: 6 }}>Priority{" "}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {PRIORITY.map((opt) => {
                  const active = priorityFilter.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setPriorityFilter((s) => toggleFrom(s, opt.value))}
                      style={[
                        styles.pill,
                        { borderColor: currentTheme.border, backgroundColor: active ? opt.color : currentTheme.card, marginRight: 8, marginTop: 8 },
                      ]}
                    >
                      <Ionicons name={opt.icon as any} size={16} color={active ? "#fff" : currentTheme.mutedForeground} />
                      <Text style={{ marginLeft: 6, color: active ? "#fff" : currentTheme.cardForeground }}>{opt.label}{" "}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* POINTS */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: currentTheme.mutedForeground, marginBottom: 6 }}>Points{" "}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {POINTS.map((opt) => {
                  const active = pointsFilter.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setPointsFilter((s) => toggleFrom(s, opt.value))}
                      style={[
                        styles.pill,
                        { borderColor: currentTheme.border, backgroundColor: active ? opt.color : currentTheme.card, marginRight: 8, marginTop: 8 },
                      ]}
                    >
                      <Ionicons name={opt.icon as any} size={16} color={active ? "#fff" : currentTheme.mutedForeground} />
                      <Text style={{ marginLeft: 6, color: active ? "#fff" : currentTheme.cardForeground }}>{opt.label}{" "}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* TYPE */}
            <View style={{ marginTop: 16 }}>
              <Text style={{ color: currentTheme.mutedForeground, marginBottom: 6 }}>Type{" "}</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {TYPE.map((opt) => {
                  const active = typeFilter.includes(opt.value);
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setTypeFilter((s) => toggleFrom(s, opt.value))}
                      style={[
                        styles.pill,
                        { borderColor: currentTheme.border, backgroundColor: active ? opt.color : currentTheme.card, marginRight: 8, marginTop: 8 },
                      ]}
                    >
                      <Ionicons name={opt.icon as any} size={16} color={active ? "#fff" : currentTheme.mutedForeground} />
                      <Text style={{ marginLeft: 6, color: active ? "#fff" : currentTheme.cardForeground }}>{opt.label}{" "}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ height: 16 }} />

            <TouchableOpacity onPress={() => setFilterSheetOpen(false)} style={[styles.pickerClose, { backgroundColor: currentTheme.primary, borderRadius: 10 }]}>
              <Text style={{ color: currentTheme.primaryForeground, fontWeight: "600" }}>Apply{" "}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setFilter("all");
                setSearchQuery("");
                setRangeStart(null);
                setRangeEnd(null);
                setStatusFilter([]);
                setPriorityFilter([]);
                setPointsFilter([]);
                setTypeFilter([]);
                setFilterSheetOpen(false);
              }}
              style={[styles.pickerClose, { backgroundColor: currentTheme.muted, borderRadius: 10, marginTop: 8 }]}
            >
              <Text style={{ color: currentTheme.cardForeground }}>Clear all{" "}</Text>
            </TouchableOpacity>
          </ScrollView>
        </Animated.View>
      </Modal>
    </View>
  );
}

/* =========================================================
   Styles (single unified block)
   ========================================================= */
const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  segment: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentItem: { marginRight: 18, paddingBottom: 6 },

  taskRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  messageInput: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },

  // search
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 8,
    borderRadius: 10,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    paddingHorizontal: 8,
    fontSize: 14,
  },
  smallAction: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 8,
  },

  // floating action button
  fab: {
    position: "absolute",
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },

  // sheet / modal
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: "80%",
    overflow: "hidden",
  },
  filterSheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    paddingBottom: 24,
  },
  sheetGrab: {
    width: 48,
    height: 4,
    backgroundColor: "#ccc",
    borderRadius: 4,
    alignSelf: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  sheetHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 16, fontWeight: "700", paddingLeft: 8 },

  pill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginRight: 8,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
  },

  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  sheetPickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  pickerBox: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 40,
    maxHeight: "50%",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerClose: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  // small UI helpers
  projectsContainer: { borderBottomWidth: 0.5 },
  projectCard: {
    width: 220,
    padding: 16,
    borderRadius: 14,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    overflow: "hidden",
    marginVertical: 8,
  },
  projectTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  projectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff30",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: { height: "100%", backgroundColor: "#fff" },

  // swipe action
  swipeAction: {
    width: 100,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  swipeText: { marginTop: 6, fontWeight: "700" },
});
