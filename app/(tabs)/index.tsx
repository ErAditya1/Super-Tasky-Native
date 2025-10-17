// app/(tabs)/index.tsx
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal,
  Animated,
  Alert,
  TextInput,
  ScrollView,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable, GestureHandlerRootView } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Image } from "expo-image";
import { switchTeam } from "@/lib/api/team";
import { useToast } from "@/components/Toast";
import { addActiveTeam } from "@/store/team/teamSlice";
import Avatar from "@/components/Avatar";
import { TaskInterface } from "@/store/task/taskSlice";

// ---- Types ----
type Priority = "low" | "medium" | "high" | "critical" | "none";

// ---- Sample data for local/dev preview ----
const SAMPLE_TAGS = ["UI", "Backend", "High Priority"];

const PRIORITY_COLORS: Record<Priority, string> = {
  none: "#A0A0A0",
  low: "#4ECCA3",
  medium: "#FFB400",
  high: "#FF4B4B",
  critical: "#B300FF",
};

const TABS = ["Today", "Upcoming", "All Tasks", "Completed"] as const;
type TabName = (typeof TABS)[number];

const WINDOW = Dimensions.get("window");
const HEADER_HEIGHT = 112;

export default function HomeDashboard() {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();

  // UI state
  const [selectedTab, setSelectedTab] = useState<TabName>("Today");
  const [tasks, setTasks] = useState<TaskInterface[] | undefined>(undefined);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const [activeProjectFilters, setActiveProjectFilters] = useState<string[]>([]);
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<string[]>([]);

  // date filter UI
  const [dateFilter, setDateFilter] = useState<Date | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // search: immediate input + debounced value to avoid rerenders while typing
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // App store selectors
  const { team, teams } = useAppSelector((s) => s.team);
  const { user } = useAppSelector((s) => s.auth);
  const { projects } = useAppSelector((s) => s.project);
  const allTasks = useAppSelector((s) => s.task).tasks;

  // Animated values (declare in same scope so children can use them)
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({ inputRange: [0, 80], outputRange: [0, -40], extrapolate: "clamp" });
  const headerScale = scrollY.interpolate({ inputRange: [0, 80], outputRange: [1, 0.99], extrapolate: "clamp" });
  const fabScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Keep local tasks in sync with store tasks but avoid resetting while user types
    if (allTasks && allTasks.length) setTasks(allTasks);
  }, [allTasks]);

  // Debounce search input to avoid re-rendering on every keystroke
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 220);
    return () => clearTimeout(h);
  }, [searchQuery]);

  // memoized maps
  const projectsById = useMemo(() => Object.fromEntries((projects ?? []).map((p: any) => [p._id, p])), [projects]);
  const usersList = useMemo(() => (team?.members?.length ? team.members : []), [team]);
  const usersById = useMemo(() => Object.fromEntries((usersList ?? []).map((u: any) => [u._id ?? u.id, u])), [usersList]);

  // Helpers to be resilient to both id and object shapes
  const getProjectIdFromTask = (t: any) => t?.project?._id ?? t?.project ?? t?.projectId ?? null;
  const getAssigneeIdFromTask = (t: any) => t?.assignedToUser?._id ?? t?.assignedToUser ?? t?.assignee ?? null;
  const safeProjectLabel = (p: any) => p?.name ?? p?.title ?? "(untitled)";

  const switchTeamHandler = async (teamId: string) => {
    if (team?._id === teamId) return;
    const res = await switchTeam(teamId);
    if (res.success) {
      toast.show(res.data.message, "success");
      dispatch(addActiveTeam(res.data.data));
    } else {
      toast.show(res.message || "Switching failed", "danger");
    }
  };

  // clear filters helper
  const clearFilters = useCallback(() => {
    setActiveProjectFilters([]);
    setActiveTagFilters([]);
    setActiveAssigneeFilters([]);
    setSearchQuery("");
    setDateFilter(null);
  }, []);

  function statusBorderColor(status?: string) {
    switch (status) {
      case "completed":
        return "#22c55e"; // green
      case "canceled":
        return "red"; // gray
      case "in_progress":
        return "#0ea5e9"; // blue
      case "pending":
        return "yellow"
      default:
        return "transparent";
    }
  }

  // Filtering logic (memoized)
  const filteredTasks = useMemo(() => {
    let list = (tasks ?? []).slice();

    // normalize today's date at midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedTab === "Completed") {
      list = list.filter((t: any) => t?.status === "completed");
    } else if (selectedTab === "Today") {
      list = list.filter((t: any) => {
        if (!t?.dueDate) return false;
        const d = new Date(t.dueDate.toString());
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      });
    } else if (selectedTab === "Upcoming") {
      list = list.filter((t: any) => {
        if (!t?.dueDate) return false;
        const d = new Date(t.dueDate.toString());
        d.setHours(0, 0, 0, 0);
        return d.getTime() > today.getTime() && t?.status !== "completed";
      });
    } else {
      // All Tasks: show non-completed
      list = list.filter((t: any) => t);
    }

    // dateFilter override/narrowing
    if (dateFilter) {
      const df = new Date(dateFilter);
      df.setHours(0, 0, 0, 0);
      list = list.filter((t: any) => {
        if (!t?.dueDate) return false;
        const d = new Date(t.dueDate.toString());
        d.setHours(0, 0, 0, 0);
        return d.getTime() === df.getTime();
      });
    }

    // tags
    if (activeTagFilters.length) {
      list = list.filter((t: any) => t.tags && activeTagFilters.every((ft) => t.tags?.includes(ft)));
    }

    // projects
    if (activeProjectFilters.length) {
      list = list.filter((t: any) => {
        const pid = getProjectIdFromTask(t);
        return pid && activeProjectFilters.includes(pid);
      });
    }

    // assignees
    if (activeAssigneeFilters.length) {
      list = list.filter((t: any) => {
        const aid = getAssigneeIdFromTask(t);
        return aid && activeAssigneeFilters.includes(aid);
      });
    }

    // search (debounced)
    if (debouncedQuery && debouncedQuery.length > 0) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter((t: any) => {
        const titleMatch = (t.title ?? "").toString().toLowerCase().includes(q);
        const notesMatch = ((t.description ?? "") as string).toLowerCase().includes(q);
        const pid = getProjectIdFromTask(t) ?? "";
        const projectMatch = pid ? ((projectsById[pid]?.name ?? projectsById[pid]?.title ?? "") as string).toLowerCase().includes(q) : false;
        const aid = getAssigneeIdFromTask(t) ?? "";
        const assigneeMatch = aid ? ((usersById[aid]?.name ?? "") as string).toLowerCase().includes(q) : false;
        return titleMatch || notesMatch || projectMatch || assigneeMatch;
      });
    }

    return list;
  }, [tasks, selectedTab, activeTagFilters, activeProjectFilters, activeAssigneeFilters, debouncedQuery, dateFilter, projectsById, usersById]);

  // mixed list for sticky headers
  const listData = useMemo(() => [
    { __type: "projects" },
    { __type: "filters" },
    { __type: "tabs" },
    ...((filteredTasks ?? []).map((t) => ({ __type: "task", task: t }))),
  ], [filteredTasks]);

  // optimistic status updates
  function markComplete(taskId: string) {
    setTasks((prev) => prev?.map((t: any) => ((t._id ?? t.id) === taskId ? { ...t, status: "completed" } : t)));
    // TODO persist change
  }
  function undoComplete(taskId: string) {
    setTasks((prev) => prev?.map((t: any) => ((t._id ?? t.id) === taskId ? { ...t, status: "pending" } : t)));
    // TODO persist change
  }

  function onEditTask(taskId: string, projectId?: string) {
    const pid = projectId ?? "";
    router.push(`/(routes)/projects/${pid}/tasks/${taskId}/edit`);
  }

  function onAddTask() {
    Animated.sequence([
      Animated.timing(fabScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    router.push(`/(routes)/NewTask`);
  }

  function toggleProjectFilter(projectId: string) {
    setActiveProjectFilters((s) => (s.includes(projectId) ? s.filter((id) => id !== projectId) : [...s, projectId]));
  }

  // swipeable management
  const swipeableRefs = useRef<Record<string, any>>({});
  const openSwipeableRef = useRef<any>(null);
  function closeOpenSwipeable() {
    if (openSwipeableRef.current && typeof openSwipeableRef.current.close === "function") {
      try { openSwipeableRef.current.close(); } catch {}
      openSwipeableRef.current = null;
    }
  }

  const renderRightActions = useCallback((task: TaskInterface) => (
    <Pressable onPress={() => onEditTask((task as any)._id ?? (task as any).id, getProjectIdFromTask(task))} style={[styles.swipeAction, { backgroundColor: currentTheme.primary }]} accessibilityRole="button">
      <Ionicons name="create" size={18} color={currentTheme.primaryForeground} />
      <Text style={[styles.swipeText, { color: currentTheme.primaryForeground }]}>Edit</Text>
    </Pressable>
  ), [currentTheme.primary, currentTheme.primaryForeground]);

  const renderLeftActions = useCallback((task: TaskInterface) => (
    <Pressable onPress={() => { if ((task as any).status === "completed") undoComplete((task as any)._id ?? (task as any).id); else markComplete((task as any)._id ?? (task as any).id); if (swipeableRefs.current[(task as any)._id ?? (task as any).id]?.close) swipeableRefs.current[(task as any)._id ?? (task as any).id].close(); openSwipeableRef.current = null; }} style={[styles.swipeAction, { backgroundColor: currentTheme.secondary }]}>
      <Ionicons name={(task as any).status === "completed" ? "reload" : "checkmark-done"} size={18} color={currentTheme.secondaryForeground} />
      <Text style={[styles.swipeText, { color: currentTheme.secondaryForeground }]}>{(task as any).status === "completed" ? "Undo" : "Done"}</Text>
    </Pressable>
  ), [currentTheme.secondary, currentTheme.secondaryForeground]);

  const renderTaskCard = useCallback((task: TaskInterface) => {
    const id = (task as any)._id ?? (task as any).id;
    const status = (task as any).status;
    const borderColor = statusBorderColor(status);
    const priorityKey = (((task as any).priority ?? "none") as Priority);
    const priorityColor = PRIORITY_COLORS[priorityKey];
    const pid = getProjectIdFromTask(task) ?? "projectId";

    return (
      <GestureHandlerRootView>
        <Swipeable
          ref={(r) => { swipeableRefs.current[id] = r; }}
          renderLeftActions={() => renderLeftActions(task)}
          renderRightActions={() => renderRightActions(task)}
          overshootLeft={false}
          overshootRight={false}
          onSwipeableOpen={() => { const prev = openSwipeableRef.current; const current = swipeableRefs.current[id]; if (prev && prev !== current && typeof prev.close === "function") { try { prev.close(); } catch {} } openSwipeableRef.current = current; }}
          onSwipeableClose={() => { const current = swipeableRefs.current[id]; if (openSwipeableRef.current === current) openSwipeableRef.current = null; }}
        >
          <TouchableOpacity activeOpacity={0.9} onPress={() => { const open = openSwipeableRef.current; const thisRef = swipeableRefs.current[id]; if (open && open !== thisRef) { closeOpenSwipeable(); return; } router.push(`/(routes)/projects/${pid}/tasks/${id}`); }}>
            <View style={[styles.taskCard, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, shadowColor: isDark ? "#000" : "#000", borderLeftWidth: 4, borderLeftColor: borderColor }]}>
              <View style={styles.taskLeft}>
                <View style={[styles.priorityDot, { backgroundColor: priorityColor, shadowColor: priorityColor }]} accessibilityLabel={`Priority ${(task as any).priority ?? "none"}`} />
              </View>

              <View style={styles.taskBody}>
                <View style={[styles.row, { justifyContent: "space-between" }]}>
                  <Text style={[styles.taskTitle, { color: currentTheme.cardForeground }]} numberOfLines={1} accessibilityRole="header">{(task as any).title}</Text>
                  {(task as any).project && (
                    <View style={[styles.projectChip, { backgroundColor: adjustAlpha((task as any).project?.color ?? "#000", 0.12) }]}>
                      <Text style={{ color: (task as any).project?.color ?? "#000", fontWeight: "600" }}>{safeProjectLabel((task as any).project)}</Text>
                    </View>
                  )}
                </View>

                <View style={[styles.row, { marginTop: 8, alignItems: "center" }]}>
                  <Text style={[styles.metaText, { color: currentTheme.mutedForeground }]}>{(task as any).dueDate ? `Due ${formatDate((task as any).dueDate.toString())}` : "No due date"} </Text>
                  <View style={{ width: 12 }} />
                  {(task as any).assignedToUser ? <Avatar user={(task as any).assignedToUser} /> : null}
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: "row", alignItems: "center" }}>{(((task as any).tags ?? []) as string[]).slice(0, 3).map((tag) => (<View key={tag} style={[styles.tagChip, { borderColor: currentTheme.border }]}><Text style={{ fontSize: 12, color: currentTheme.cardForeground }}>{tag}</Text></View>))}</View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Swipeable>
      </GestureHandlerRootView>
    );
  }, [currentTheme.card, currentTheme.border, currentTheme.cardForeground, currentTheme.mutedForeground]);

  const ProjectsRow = useCallback(() => (
    <View style={[styles.projectsContainer, { backgroundColor: currentTheme.background }]}>
      <FlatList
        data={projects || []}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p: any) => p._id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        renderItem={({ item }: any) => (
          <TouchableOpacity onPress={() => router.push(`/(routes)/projects/${item._id}`)} style={[styles.projectCard, { backgroundColor: item?.color || currentTheme.card, shadowColor: item?.color || currentTheme.card }]} accessibilityRole="button">
            <Text style={styles.projectTitle} numberOfLines={1}>{safeProjectLabel(item)}</Text>
            <View style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}>{(item.members || []).slice(0, 3).map((u: any) => (<View key={u._id ?? u.id} style={styles.projectAvatar}><Avatar user={u} /></View>))}</View>
            <View style={{ marginTop: 12 }}>
              <View style={{ display: 'flex', justifyContent: "space-between", flexDirection: "row" }}><Text>{calculateProjectProgress(item).totalTasks ?? 0}</Text><Text>{calculateProjectProgress(item).completedTasks ?? 0}</Text></View>
              <View style={styles.progressBarBackground}><View style={[styles.progressBarFill, { width: `${calculateProjectProgress(item).progress}%` }]} /></View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  ), [projects, currentTheme.background, currentTheme.card]);

  const FiltersRow = useCallback(() => (
    <View style={[styles.filterRow, { backgroundColor: currentTheme.background, borderBottomColor: currentTheme.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        <TouchableOpacity onPress={() => setDatePickerOpen(true)} style={[styles.chip, { backgroundColor: dateFilter ? currentTheme.primary : currentTheme.muted, borderColor: currentTheme.border }]}>
          <Text style={{ color: dateFilter ? currentTheme.primaryForeground : currentTheme.mutedForeground }}>{dateFilter ? formatDate(dateFilter.toISOString()) : "Date"} {' '}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={clearFilters} style={[styles.chip, { backgroundColor: currentTheme.muted, borderColor: currentTheme.border, marginLeft: 8 }]}>
          <Text style={{ color: currentTheme.mutedForeground }}>Clear{' '}</Text>
        </TouchableOpacity>

        {(projects || []).map((p: any) => {
          const active = activeProjectFilters.includes(p._id);
          return (
            <TouchableOpacity key={p._id} onPress={() => toggleProjectFilter(p._id)} style={[styles.chip, { backgroundColor: active ? p.color : currentTheme.muted, borderColor: currentTheme.border, marginLeft: 8 }]}>
              <Text style={{ color: active ? "#fff" : currentTheme.mutedForeground }}>{safeProjectLabel(p)}{' '}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {datePickerOpen && (
        <DateTimePicker
          value={dateFilter ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, selected) => {
            if (Platform.OS === "android") setDatePickerOpen(false);
            if (selected) setDateFilter(selected);
          }}
        />
      )}
    </View>
  ), [dateFilter, datePickerOpen, activeProjectFilters, projects, currentTheme, clearFilters]);

  const TabsRow = useCallback(() => (
    <View style={[styles.tabs, { borderBottomColor: currentTheme.border, backgroundColor: currentTheme.background }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
        {TABS.map((t) => {
          const active = t === selectedTab;
          return (
            <TouchableOpacity key={t} onPress={() => setSelectedTab(t)} style={[styles.tabButton, active && { borderBottomColor: currentTheme.primary, borderBottomWidth: 2 }]}>
              <Text style={{ color: active ? currentTheme.primary : currentTheme.mutedForeground, fontWeight: active ? "700" : "500" }}>{t}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  ), [selectedTab, currentTheme]);

  const Header = useCallback(() => (
    <Animated.View style={[styles.header, { paddingTop: 0, transform: [{ translateY: headerTranslateY }, { scale: headerScale }], borderBottomColor: currentTheme.border, backgroundColor: currentTheme.background }]}>
      <View style={styles.headerTop}>
        <TouchableOpacity onPress={() => setTeamModalOpen(true)} style={styles.teamContainer}>
          {team?.avatar ? (<Image source={{ uri: team.avatar?.url }} style={{ width: 35, height: 35, borderRadius: 20 / 6 }} />) : (<View style={[styles.teamIcon, { backgroundColor: currentTheme.sidebarAccent }]}><Ionicons name="people" size={16} color={currentTheme.sidebarAccentForeground} /></View>)}
          <View style={{ marginLeft: 10 }}>
            <Text style={{ color: currentTheme.cardForeground, fontWeight: "700" }}>{team?.name}</Text>
            <Text style={{ color: currentTheme.mutedForeground, fontSize: 12 }}>{team?.members?.length ?? 0} members • {team?.projects?.length ?? 0} projects </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={currentTheme.mutedForeground} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => Alert.alert("Notifications")} style={styles.iconButton}><Ionicons name="notifications-outline" size={20} color={currentTheme.mutedForeground} /><View style={[styles.badge, { backgroundColor: currentTheme.secondary }]} /></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(routes)/user/profile")} style={{ marginLeft: 12 }}><Avatar user={user} /></TouchableOpacity>
        </View>
      </View>

      <View style={[styles.searchRow, { backgroundColor: currentTheme.card, marginTop: 10 }]}>
        <Ionicons name="search" size={18} color={currentTheme.mutedForeground} />
        <TextInput value={searchQuery} onChangeText={setSearchQuery} placeholder="Search tasks, projects, people..." placeholderTextColor={currentTheme.mutedForeground} style={[styles.searchInput, { color: currentTheme.cardForeground }]} returnKeyType="search" />
        {searchQuery ? (<TouchableOpacity onPress={() => setSearchQuery("")}><Ionicons name="close" size={18} color={currentTheme.mutedForeground} /></TouchableOpacity>) : null}
      </View>
    </Animated.View>
  ), [team, user, searchQuery, currentTheme]);

  const renderMixedItem = useCallback(({ item }: { item: any }) => {
    if (item.__type === "projects") return <ProjectsRow />;
    if (item.__type === "filters") return <FiltersRow />;
    if (item.__type === "tabs") return <TabsRow />;
    if (item.__type === "task") return renderTaskCard(item.task);
    return null;
  }, [ProjectsRow, FiltersRow, TabsRow, renderTaskCard]);

  return (
    <View style={[styles.screen, { backgroundColor: currentTheme.background }]} onStartShouldSetResponder={() => { closeOpenSwipeable(); return false; }}>
      <Header />

      <Animated.FlatList
        data={listData}
        renderItem={renderMixedItem}
        keyExtractor={(item, i) => item.__type === "task" ? ((item.task as any)._id ?? (item.task as any).id) : `${item.__type}-${i}`}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT + 12, paddingBottom: insets.bottom + 120, minHeight: WINDOW.height + 1 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        stickyHeaderIndices={[0, 1, 2]}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }] as any, { useNativeDriver: true })}
        onScrollBeginDrag={() => { closeOpenSwipeable(); }}
        scrollEventThrottle={16}
        removeClippedSubviews
      />

      <Animated.View style={{ position: "absolute", right: 20, bottom: insets.bottom ? insets.bottom + 24 : 24, transform: [{ scale: fabScale }] }}>
        <TouchableOpacity onPress={onAddTask} style={[styles.fab, { backgroundColor: currentTheme.primary, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 8, elevation: 8 }]} accessibilityLabel="Add task"><Ionicons name="add" size={28} color={currentTheme.primaryForeground} /></TouchableOpacity>
      </Animated.View>

      <Modal visible={teamModalOpen} transparent animationType="none" onRequestClose={() => setTeamModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setTeamModalOpen(false)}>
          <Animated.View style={[styles.modalContent, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <TextInput placeholder="Search teams..." placeholderTextColor={currentTheme.mutedForeground} style={[styles.teamSearchInput, { backgroundColor: currentTheme.background, color: currentTheme.cardForeground }]} onChangeText={() => {}} />
              <TouchableOpacity onPress={() => setTeamModalOpen(false)} style={{ marginLeft: 12 }}><Ionicons name="close" size={22} color={currentTheme.mutedForeground} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 260 }}>{teams?.map((teamItem: any) => (<TouchableOpacity key={teamItem._id} onPress={() => { switchTeamHandler(teamItem?._id); setTeamModalOpen(false); }} style={styles.modalRow}><Ionicons name="people-outline" size={20} color={currentTheme.primary} /><Text style={{ marginLeft: 12, color: currentTheme.cardForeground }}>{teamItem.name}</Text></TouchableOpacity>))}</ScrollView>
            <TouchableOpacity onPress={() => { setTeamModalOpen(false); router.push("/(routes)/teams"); }} style={[styles.modalRow, { borderTopWidth: 1, borderColor: currentTheme.border, marginTop: 8 }]}>
              <Ionicons name="add-circle-outline" size={20} color={currentTheme.secondary} />
              <Text style={{ marginLeft: 12, color: currentTheme.secondary }}>Create / Manage Team</Text>
            </TouchableOpacity>
          </Animated.View>
        </Pressable>
      </Modal>
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

function formatDate(d?: string) {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return d || "";
  }
}

function calculateProjectProgress(project: any) {
  const totalTasks = project?.tasks?.length ?? 0;
  const completedTasks = project?.tasks?.filter((t: any) => t.status === "completed" || t.status === "canceled").length ?? 0;
  const progress = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  return { progress, totalTasks, completedTasks };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { position: "absolute", left: 0, right: 0, zIndex: 50, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  teamContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  teamIcon: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconButton: { position: "relative", padding: 6 },
  badge: { position: "absolute", top: 6, right: 6, width: 8, height: 8, borderRadius: 4 },
  searchRow: { flexDirection: "row", alignItems: "center", borderRadius: 12, marginTop: 10, paddingHorizontal: 12, height: 40 },
  searchInput: { marginLeft: 8, flex: 1, minHeight: 36 },
  quickChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginRight: 8 },
  projectsContainer: { borderBottomWidth: 0.5 },
  projectCard: { width: 220, padding: 16, borderRadius: 14, elevation: 4, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 6 }, overflow: "hidden", marginVertical: 8 },
  projectTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  projectAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#ffffff30", alignItems: "center", justifyContent: "center", marginRight: 8 },
  progressBarBackground: { height: 6, backgroundColor: "rgba(255,255,255,0.22)", borderRadius: 6, overflow: "hidden" },
  progressBarFill: { height: "100%", backgroundColor: "#fff" },
  filterRow: { borderBottomWidth: 0.5, paddingVertical: 8 },
  chip: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 20, marginRight: 8, borderWidth: 1, marginVertical: 8 },
  tabs: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.5 },
  tabButton: { marginRight: 16, paddingBottom: 6 },
  taskCard: { flexDirection: "row", padding: 12, borderRadius: 12, borderWidth: 1, shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 2, marginHorizontal: 12 },
  taskLeft: { width: 14, alignItems: "center", marginRight: 12 },
  priorityDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  taskBody: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  taskTitle: { fontSize: 16, fontWeight: "700" },
  metaText: { fontSize: 12 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  projectChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  tagChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 6, borderWidth: 1 },
  swipeAction: { width: 100, alignItems: "center", justifyContent: "center", padding: 12 },
  swipeText: { marginTop: 6, fontWeight: "700" },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "#00000040", justifyContent: "flex-end" },
  modalContent: { padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1 },
  modalRow: { paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  teamSearchInput: { flex: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === "android" ? 6 : 10 },
});