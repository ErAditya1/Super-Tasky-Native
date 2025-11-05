import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";
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
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { Image } from "expo-image";
import { switchTeam } from "@/lib/api/team";
import { useToast } from "@/components/Toast";
import { addActiveTeam, TeamInterface } from "@/store/team/teamSlice";
import Avatar from "@/components/Avatar";
import { TaskInterface, updateTask } from "@/store/task/taskSlice";
import { ProjectInterface } from "@/store/project2/projectSlice";
import SwipeableTaskCard from "@/components/SwipeableTaskCard";
import { swipeController } from "@/components/swipeController";

const TABS = ["Today", "Upcoming", "All Tasks", "Completed"] as const;
type TabName = (typeof TABS)[number];

const WINDOW = Dimensions.get("window");
const HEADER_HEIGHT = 112;

/**
 * Stable Header component (memoized)
 */
const Header = React.memo(function Header(props: {
  team: any;
  user: any;
  currentTheme: any;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  setTeamModalOpen: (v: boolean) => void;
  router: any;
  dateFilter: Date | null;
  datePickerOpen: boolean;
  setDatePickerOpen: (v: boolean) => void;
  headerTranslateY: any;
  headerScale: any;
  rangeStart?: Date | null;
  rangeEnd?: Date | null;
}) {
  const {
    team,
    user,
    currentTheme,
    searchQuery,
    setSearchQuery,
    setTeamModalOpen,
    router,
    dateFilter,
    datePickerOpen,
    setDatePickerOpen,
    headerTranslateY,
    headerScale,
    rangeStart,
    rangeEnd,
  } = props;

  const rangeLabel = rangeStart || rangeEnd
    ? `${rangeStart ? rangeStart.toLocaleDateString() : "Any"} — ${rangeEnd ? rangeEnd.toLocaleDateString() : "Any"}`
    : null;

  return (
    <Animated.View
      style={[
        styles.header,
        {
          paddingTop: 0,
          transform: [{ translateY: headerTranslateY }, { scale: headerScale }],
          borderBottomColor: currentTheme.border,
          backgroundColor: currentTheme.background,
        },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => setTeamModalOpen(true)}
          style={styles.teamContainer}
        >
          {team?.avatar ? (
            <Image
              source={{ uri: team.avatar?.url }}
              style={{ width: 35, height: 35, borderRadius: 20 / 6 }}
            />
          ) : (
            <View
              style={[
                styles.teamIcon,
                { backgroundColor: currentTheme.sidebarAccent },
              ]}
            >
              <Ionicons
                name="people"
                size={16}
                color={currentTheme.sidebarAccentForeground}
              />
            </View>
          )}
          <View style={{ marginLeft: 10 }}>
            <Text
              style={{ color: currentTheme.cardForeground, fontWeight: "700" }}
            >
              {team?.name}
            </Text>
            <Text style={{ color: currentTheme.mutedForeground, fontSize: 12 }}>
              {team?.members?.length ?? 0} members • {team?.projects?.length ?? 0} projects
            </Text>
          </View>
          <Ionicons
            name="chevron-down"
            size={18}
            color={currentTheme.mutedForeground}
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={() => router.push("/(routes)/favorites")}
            style={styles.iconButton}
          >
            <Ionicons
              name="star"
              size={20}
              color={currentTheme.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(routes)/archive")}
            style={styles.iconButton}
          >
            <Ionicons
              name="trash"
              size={20}
              color={currentTheme.mutedForeground}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(routes)/user/profile")}
            style={{ marginLeft: 12 }}
          >
            <Avatar user={user} />
          </TouchableOpacity>
        </View>
      </View>

      <View
        style={[
          styles.searchRow,
          { backgroundColor: currentTheme.card, marginTop: 10 },
        ]}
      >
        <Ionicons
          name="search"
          size={18}
          color={currentTheme.mutedForeground}
        />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search tasks, projects, people..."
          placeholderTextColor={currentTheme.mutedForeground}
          style={[styles.searchInput, { color: currentTheme.cardForeground }]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons
              name="close"
              size={18}
              color={currentTheme.mutedForeground}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* small range preview in header (if active) */}
      {rangeLabel ? (
        <View style={{ paddingTop: 8 }}>
          <View style={{ paddingHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="calendar" size={14} color={currentTheme.mutedForeground} />
              <Text style={{ color: currentTheme.mutedForeground, fontSize: 13 }}>{rangeLabel}</Text>
            </View>
          </View>
        </View>
      ) : null}

      {datePickerOpen && (
        <DateTimePicker
          value={dateFilter ?? new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(e, selected) => {
            if (Platform.OS === "android") setDatePickerOpen(false);
            // parent handles dateFilter changes via setter passed to Header's parent
          }}
        />
      )}
    </Animated.View>
  );
});

export default function HomeDashboard() {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const toast = useToast();

  // UI state
  const [selectedTab, setSelectedTab] = useState<TabName>("Today");
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const [activeProjectFilters, setActiveProjectFilters] = useState<string[]>(
    []
  );
  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<string[]>(
    []
  );

  // date filters
  const [dateFilter, setDateFilter] = useState<Date | null>(null); // single-day filter
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  // date range modal + native picker helpers
  const [rangeModalOpen, setRangeModalOpen] = useState(false);
  const [showNativePicker, setShowNativePicker] = useState(false);
  const [nativePickerTarget, setNativePickerTarget] = useState<"start" | "end" | null>(null);

  // datePickerOpen stays for single-date picker (existing)
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // search: immediate input + debounced value to avoid rerenders while typing
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filteredTeams, setFilteredTeams] = useState<TeamInterface[]>();
  const [filteredProjects, setFilteredProjects] =
    useState<ProjectInterface[]>();
  const [refreshing, setRefreshing] = useState(false);

  // App store selectors
  const { team, teams } = useAppSelector((s) => s.team);
  const { user } = useAppSelector((s) => s.auth);
  const { projects } = useAppSelector((s) => s.project);
  const tasks = useAppSelector((s) => s.task.tasks);

  // loading detection (simple)
  const isTeamsLoading = teams === undefined || teams === null;
  const isProjectsLoading = projects === undefined || projects === null;
  const isTasksLoading = tasks === undefined || tasks === null;

  useEffect(() => {
    setFilteredTeams(teams);
  }, [teams]);
  useEffect(() => {
    const q = debouncedQuery.trim().toLowerCase();

    if (q.length) {
      setFilteredProjects(
        projects.filter((p) => p.name.toLowerCase().includes(q))
      );
    } else {
      setFilteredProjects(projects);
    }
  }, [debouncedQuery, projects]);

  // Animated values (declare in same scope so children can use them)
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -40],
    extrapolate: "clamp",
  });
  const headerScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.99],
    extrapolate: "clamp",
  });
  const fabScale = useRef(new Animated.Value(1)).current;

  // Debounce search input to avoid re-rendering on every keystroke
  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 220);
    return () => clearTimeout(h);
  }, [searchQuery]);

  // memoized maps
  const projectsById = useMemo(
    () => Object.fromEntries((projects ?? []).map((p: any) => [p._id, p])),
    [projects]
  );
  const usersList = useMemo(
    () => (team?.members?.length ? team.members : []),
    [team]
  );
  const usersById = useMemo(
    () =>
      Object.fromEntries((usersList ?? []).map((u: any) => [u._id ?? u.id, u])),
    [usersList]
  );

  // Helpers to be resilient to both id and object shapes
  const getProjectIdFromTask = (t: any) =>
    t?.project?._id ?? t?.project ?? t?.projectId ?? null;
  const getAssigneeIdFromTask = (t: any) =>
    t?.assignedToUser?._id ?? t?.assignedToUser ?? t?.assignee ?? null;
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
    setRangeStart(null);
    setRangeEnd(null);
  }, []);

  // open native picker for range start/end
  const openNativePicker = (target: "start" | "end") => {
    setNativePickerTarget(target);
    setShowNativePicker(true);
  };

  const onNativeDateChange = (event: any, selected?: Date | undefined) => {
    // Android: when dismissed, selected is undefined and event.type === 'dismissed'
    if (Platform.OS === "android") {
      setShowNativePicker(false);
      setNativePickerTarget(null);
    }
    if (!selected) return;
    if (nativePickerTarget === "start") {
      setRangeStart(selected);
    } else if (nativePickerTarget === "end") {
      setRangeEnd(selected);
    }
    // reset native picker target on iOS only if you want to close
    if (Platform.OS === "ios") {
      setNativePickerTarget(null);
    }
  };

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

    // dateFilter override/narrowing (single day)
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

    // RANGE filter (takes precedence over single-day dateFilter if range start/end present)
    if (rangeStart || rangeEnd) {
      const start = rangeStart ? new Date(rangeStart).setHours(0, 0, 0, 0) : -Infinity;
      const end = rangeEnd ? new Date(rangeEnd).setHours(23, 59, 59, 999) : Infinity;

      list = list.filter((t: any) => {
        if (!t?.dueDate) return false;
        const d = new Date(t.dueDate.toString()).getTime();
        if (Number.isNaN(d)) return false;
        return d >= start && d <= end;
      });
    }

    // tags
    if (activeTagFilters.length) {
      list = list.filter(
        (t: any) =>
          t.tags && activeTagFilters.every((ft) => t.tags?.includes(ft))
      );
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
        const notesMatch = ((t.description ?? "") as string)
          .toLowerCase()
          .includes(q);
        const pid = getProjectIdFromTask(t) ?? "";
        const projectMatch = pid
          ? (
              (projectsById[pid]?.name ?? projectsById[pid]?.title ?? "") as string
            )
              .toLowerCase()
              .includes(q)
          : false;
        const aid = getAssigneeIdFromTask(t) ?? "";
        const assigneeMatch = aid
          ? ((usersById[aid]?.name ?? "") as string).toLowerCase().includes(q)
          : false;
        return titleMatch || notesMatch || projectMatch || assigneeMatch;
      });
    }

    return list;
  }, [
    tasks,
    projects,
    selectedTab,
    activeTagFilters,
    activeProjectFilters,
    activeAssigneeFilters,
    debouncedQuery,
    dateFilter,
    rangeStart,
    rangeEnd,
    projectsById,
    usersById,
  ]);

  // mixed list for sticky headers
  const listData = useMemo(() => {
    const data: any[] = [
      { __type: "projects" },
      { __type: "filters" },
      { __type: "tabs" },
      ...(filteredTasks ?? []).map((t) => ({ __type: "task", task: t })),
    ];

    if ((filteredTasks ?? []).length === 0 && !isTasksLoading) {
      data.push({ __type: "empty" });
    }

    return data;
  }, [filteredTasks, isTasksLoading]);

  // optimistic status updates
  function markComplete(taskId: string) {
    const task = tasks.find((t: any) => t._id === taskId);
    if (!task) return;

    const updated = {
      ...task,
      status: "completed",
    };

    dispatch(updateTask({ taskId, updatedTask: updated }));
  }
  function undoComplete(taskId: string) {
    let task = tasks?.filter((t: any) => t._id === taskId)[0];
    if (!task) return;
    const updated = {
      ...task,
      status: "pending",
    };

    dispatch(updateTask({ taskId, updatedTask: updated }));
  }

  function onEditTask(taskId: string, projectId?: string) {
    const pid = projectId ?? "";
    router.push(`/(routes)/projects/${pid}/tasks/${taskId}/edit`);
  }

  function onAddTask() {
    Animated.sequence([
      Animated.timing(fabScale, {
        toValue: 0.92,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    router.push(`/(routes)/NewTask`);
  }

  function toggleProjectFilter(projectId: string) {
    setActiveProjectFilters((s) =>
      s.includes(projectId)
        ? s.filter((id) => id !== projectId)
        : [...s, projectId]
    );
  }

  // swipeable management
  const swipeableRefs = useRef<Record<string, any>>({});
  const openSwipeableRef = useRef<any>(null);
  function closeOpenSwipeable() {
    if (
      openSwipeableRef.current &&
      typeof openSwipeableRef.current.close === "function"
    ) {
      try {
        openSwipeableRef.current.close();
      } catch {}
      openSwipeableRef.current = null;
    }
  }

  const renderRightActions = useCallback(
    (task: TaskInterface) => (
      <Pressable
        onPress={() =>
          onEditTask(
            (task as any)._id ?? (task as any).id,
            getProjectIdFromTask(task)
          )
        }
        style={[styles.swipeAction, { backgroundColor: currentTheme.primary }]}
        accessibilityRole="button"
      >
        <Ionicons
          name="create"
          size={18}
          color={currentTheme.primaryForeground}
        />
        <Text
          style={[styles.swipeText, { color: currentTheme.primaryForeground }]}
        >
          Edit
        </Text>
      </Pressable>
    ),
    [currentTheme.primary, currentTheme.primaryForeground]
  );

  const renderLeftActions = useCallback(
    (task: TaskInterface) => (
      <Pressable
        onPress={() => {
          if ((task as any).status === "completed")
            undoComplete((task as any)._id ?? (task as any).id);
          else markComplete((task as any)._id ?? (task as any).id);
          if (
            swipeableRefs.current[(task as any)._id ?? (task as any).id]?.close
          )
            swipeableRefs.current[
              (task as any)._id ?? (task as any).id
            ].close();
          openSwipeableRef.current = null;
        }}
        style={[
          styles.swipeAction,
          { backgroundColor: currentTheme.secondary },
        ]}
      >
        <Ionicons
          name={
            (task as any).status === "completed" ? "reload" : "checkmark-done"
          }
          size={18}
          color={currentTheme.secondaryForeground}
        />
        <Text
          style={[
            styles.swipeText,
            { color: currentTheme.secondaryForeground },
          ]}
        >
          {(task as any).status === "completed" ? "Undo" : "Done"}
        </Text>
      </Pressable>
    ),
    [currentTheme.secondary, currentTheme.secondaryForeground]
  );

  const renderTaskCard = useCallback(
    (task: TaskInterface) => {
      const id = (task as any)._id ?? (task as any).id;
      const pid = getProjectIdFromTask(task) ?? "";

      const borderColor =
        (task as any).status === "completed"
          ? "#22c55e"
          : (task as any).status === "canceled"
          ? "red"
          : (task as any).status === "in_progress"
          ? "#0ea5e9"
          : (task as any).status === "pending"
          ? "#0091e9"
          : "transparent";

      return (
        <SwipeableTaskCard
          key={id}
          task={task}
          theme={currentTheme}
          onPress={() => router.push(`/(routes)/projects/${pid}/tasks/${id}`)}
          onEdit={() => onEditTask(id, pid)}
          borderColor={borderColor}
        />
      );
    },
    [currentTheme, router, onEditTask, markComplete, undoComplete]
  );

  // Small loading skeleton for projects row and modal
  const LoadingSkeletonCard = ({ width = 220, height = 120 }: any) => (
    <View
      style={{
        width,
        height,
        borderRadius: 12,
        backgroundColor: adjustAlpha(currentTheme.muted, 0.18),
        padding: 12,
      }}
    />
  );

  const ProjectsRow = useCallback(
    () => (
      <View
        style={[
          styles.projectsContainer,
          { backgroundColor: currentTheme.background, zIndex: -1 },
        ]}
      >
        {isProjectsLoading ? (
          <FlatList
            data={[1, 2, 3]}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p: any, i) => `skeleton-${i}`}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
            renderItem={() => <LoadingSkeletonCard />}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        ) : (filteredProjects || []).length === 0 ? (
          <View style={{ padding: 16, alignItems: "center" }}>
            <Text
              style={{ color: currentTheme.mutedForeground, marginBottom: 8 }}
            >
              No projects yet
            </Text>
            <Text
              style={{ color: currentTheme.cardForeground, marginBottom: 12 }}
            >
              Create a project to start organizing tasks.
            </Text>
            <TouchableOpacity
              onPress={() => router.push(`/(tabs)/projects`)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: currentTheme.primary,
              }}
            >
              <Text style={{ color: currentTheme.primaryForeground }}>
                Create Project{" "}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredProjects}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(p: any, i) => `${p._id}-${i}-project`}
            contentContainerStyle={{
              paddingHorizontal: 12,
              paddingVertical: 8,
            }}
            renderItem={({ item }: any) => (
              <TouchableOpacity
                onPress={() => router.push(`/(routes)/projects/${item._id}`)}
                style={[
                  styles.projectCard,
                  {
                    backgroundColor: item?.color || currentTheme.card,
                    shadowColor: item?.color || currentTheme.card,
                  },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.projectTitle} numberOfLines={1}>
                  {safeProjectLabel(item)}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    marginTop: 10,
                    alignItems: "center",
                  }}
                >
                  {(item.members || []).slice(0, 3).map((u: any, i: number) => (
                    <View key={`${u._id}-${i}`} style={styles.projectAvatar}>
                      <Avatar user={u} />
                    </View>
                  ))}
                </View>
                <View style={{ marginTop: 12 }}>
                  <View
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      flexDirection: "row",
                    }}
                  >
                    <Text>{calculateProjectProgress(item).totalTasks ?? 0}</Text>
                    <Text>{calculateProjectProgress(item).completedTasks ?? 0}</Text>
                  </View>
                  <View style={styles.progressBarBackground}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${calculateProjectProgress(item).progress}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
          />
        )}
      </View>
    ),
    [
      projects,
      currentTheme.background,
      currentTheme.card,
      filteredProjects,
      isProjectsLoading,
    ]
  );

  const FiltersRow = useCallback(
    () => (
      <View
        style={[
          styles.filterRow,
          {
            backgroundColor: currentTheme.background,
            borderBottomColor: currentTheme.border,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          <TouchableOpacity
            onPress={() => setDatePickerOpen(true)}
            style={[
              styles.chip,
              {
                backgroundColor: dateFilter
                  ? currentTheme.primary
                  : currentTheme.muted,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <Ionicons name="calendar" size={14} color={ dateFilter  ? currentTheme.primaryForeground : currentTheme.mutedForeground } />

            <Text
              style={{
                color: dateFilter
                  ? currentTheme.primaryForeground
                  : currentTheme.mutedForeground,
              }}
            >
              {dateFilter ? formatDate(dateFilter.toISOString()) : " Date "}{" "}
            </Text>
          </TouchableOpacity>

          {/* DATE RANGE CHIP */}
          <TouchableOpacity
            onPress={() => setRangeModalOpen(true)}
            style={[
              styles.chip,
              {
                backgroundColor: rangeStart || rangeEnd ? currentTheme.primary : currentTheme.muted,
                borderColor: currentTheme.border,
                marginLeft: 8,
              },
            ]}
          >
            <Ionicons name="calendar" size={14} color={ rangeStart || rangeEnd ? currentTheme.primaryForeground : currentTheme.mutedForeground } />
            <Text style={{ marginLeft: 8, color: rangeStart || rangeEnd ? currentTheme.primaryForeground : currentTheme.mutedForeground }}>
              {rangeStart || rangeEnd ? `${rangeStart ? rangeStart.toLocaleDateString() : "Any"} — ${rangeEnd ? rangeEnd.toLocaleDateString() : "Any"}` : "Date range "}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={clearFilters}
            style={[
              styles.chip,
              {
                backgroundColor: currentTheme.muted,
                borderColor: currentTheme.border,
                marginLeft: 8,
              },
            ]}
          >
            <Text style={{ color: currentTheme.mutedForeground }}>Clear </Text>
          </TouchableOpacity>

          {(filteredProjects || []).map((p: any, i) => {
            const active = activeProjectFilters.includes(p._id);
            return (
              <TouchableOpacity
                key={`${p._id}-${i}-filter`}
                onPress={() => toggleProjectFilter(p._id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? p.color : currentTheme.muted,
                    borderColor: currentTheme.border,
                    marginLeft: 8,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active ? "#fff" : currentTheme.mutedForeground,
                  }}
                >
                  {safeProjectLabel(p)}{" "}
                </Text>
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
    ),
    [
      dateFilter,
      datePickerOpen,
      rangeStart,
      rangeEnd,
      activeProjectFilters,
      projects,
      currentTheme,
      clearFilters,
      filteredProjects,
    ]
  );

  const TabsRow = useCallback(
    () => (
      <View
        style={[
          styles.tabs,
          {
            borderBottomColor: currentTheme.border,
            backgroundColor: currentTheme.background,
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 12 }}
        >
          {TABS.map((t) => {
            const active = t === selectedTab;
            return (
              <TouchableOpacity
                key={t}
                onPress={() => setSelectedTab(t)}
                style={[
                  styles.tabButton,
                  active && {
                    borderBottomColor: currentTheme.primary,
                    borderBottomWidth: 2,
                  },
                ]}
              >
                <Text
                  style={{
                    color: active
                      ? currentTheme.primary
                      : currentTheme.mutedForeground,
                    fontWeight: active ? "700" : "500",
                  }}
                >
                  {t}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    ),
    [selectedTab, currentTheme]
  );

  const EmptyTasksView = ({ style }: any) => (
    <View style={[{ padding: 24, alignItems: "center" }, style]}>
      <Ionicons
        name="checkmark-circle-outline"
        size={54}
        color={currentTheme.mutedForeground}
      />
      <Text
        style={{
          color: currentTheme.cardForeground,
          fontWeight: "700",
          marginTop: 12,
        }}
      >
        No tasks
      </Text>
      <Text
        style={{
          color: currentTheme.mutedForeground,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        You're all caught up — add a task to get started. {" "}
      </Text>
      <TouchableOpacity
        onPress={onAddTask}
        style={{
          marginTop: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderRadius: 10,
          backgroundColor: currentTheme.primary,
        }}
      >
        <Text style={{ color: currentTheme.primaryForeground }}>Add Task{" "}</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMixedItem = useCallback(
    ({ item }: { item: any }) => {
      if (item.__type === "projects") return <ProjectsRow />;
      if (item.__type === "filters") return <FiltersRow />;
      if (item.__type === "tabs") return <TabsRow />;
      if (item.__type === "task") return renderTaskCard(item.task);
      if (item.__type === "empty") return <EmptyTasksView />;
      return null;
    },
    [ProjectsRow, FiltersRow, TabsRow, renderTaskCard, projects]
  );

  // Pull-to-refresh handler — replace with real fetch if needed
  const refreshData = useCallback(async () => {
    try {
      setRefreshing(true);
      await new Promise((r) => setTimeout(r, 700));
    } catch (err) {
      toast.show("Failed to refresh", "danger");
    } finally {
      setRefreshing(false);
    }
  }, [toast]);

  return (
    <View
      style={[styles.screen, { backgroundColor: currentTheme.background }]}
      onStartShouldSetResponder={() => {
        swipeController.closeOpen();
        return false;
      }}
    >
      <Header
        team={team}
        user={user}
        currentTheme={currentTheme}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        setTeamModalOpen={setTeamModalOpen}
        router={router}
        dateFilter={dateFilter}
        datePickerOpen={datePickerOpen}
        setDatePickerOpen={setDatePickerOpen}
        headerTranslateY={headerTranslateY}
        headerScale={headerScale}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />

      <Animated.FlatList
        data={listData}
        renderItem={renderMixedItem}
        onScrollBeginDrag={() => {
          swipeController.closeOpen();
        }}
        keyExtractor={(item, i) =>
          item.__type === "task"
            ? `${(item as any)._id}-${i}-task`
            : `${item.__type}-${(item as any)._id}`
        }
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 12,
          paddingBottom: insets.bottom + 120,
          minHeight: WINDOW.height + 1,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        stickyHeaderIndices={[0, 1, 2]}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }] as any,
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        removeClippedSubviews
        refreshControl={
          <RefreshControl
            style={{ zIndex: 9999999, elevation: 9999 }}
            refreshing={refreshing}
            onRefresh={refreshData}
            colors={[currentTheme.primary]}
            tintColor={currentTheme.primaryForeground}
          />
        }
      />

      <Animated.View
        style={{
          position: "absolute",
          right: 20,
          bottom: insets.bottom ? insets.bottom + 24 : 24,
          transform: [{ scale: fabScale }],
        }}
      >
        <TouchableOpacity
          onPress={onAddTask}
          style={[
            styles.fab,
            {
              backgroundColor: currentTheme.primary,
              shadowColor: "#000",
              shadowOpacity: 0.16,
              shadowRadius: 8,
              elevation: 8,
            },
          ]}
          accessibilityLabel="Add task"
        >
          <Ionicons
            name="add"
            size={28}
            color={currentTheme.primaryForeground}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* range modal */}
      <Modal visible={rangeModalOpen} transparent animationType="fade" onRequestClose={() => setRangeModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setRangeModalOpen(false)}>
          <Animated.View style={[styles.modalContent, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
            <Text style={[styles.modalTitle, { color: currentTheme.cardForeground }]}>Filter by date range</Text>

            <Text style={{ color: currentTheme.mutedForeground, marginTop: 6 }}>Start date</Text>
            <TouchableOpacity
              onPress={() => openNativePicker("start")}
              style={[styles.dateInput, { justifyContent: "center", backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}

            >
              <Text style={{ color: rangeStart ? currentTheme.cardForeground : currentTheme.mutedForeground }}>
                {rangeStart ? rangeStart.toLocaleDateString() : "Any "} 
              </Text>
            </TouchableOpacity>

            <Text style={{ color: currentTheme.mutedForeground, marginTop: 6 }}>End date</Text>
            <TouchableOpacity
              onPress={() => openNativePicker("end")}
              style={[styles.dateInput, { justifyContent: "center", backgroundColor: currentTheme.background, borderColor: currentTheme.border }]}
            >
              <Text style={{ color: rangeEnd ? currentTheme.cardForeground : currentTheme.mutedForeground }}>
                {rangeEnd ? rangeEnd.toLocaleDateString() : "Any "}
              </Text>
            </TouchableOpacity>

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16 }}>
              <TouchableOpacity onPress={() => { setRangeStart(null); setRangeEnd(null); setRangeModalOpen(false); }} style={[styles.saveButton, { backgroundColor: currentTheme.muted, width: "48%" }]}>
                <Text style={{ color: currentTheme.cardForeground, fontWeight: "600" }}>Clear</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setRangeModalOpen(false)} style={[styles.saveButton, { backgroundColor: currentTheme.primary, width: "48%" }]}>
                <Text style={{ color: currentTheme.primaryForeground, fontWeight: "600" }}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Pressable>
      </Modal>

      {/* Native date-time picker for range (Android/iOS) */}
      {showNativePicker && nativePickerTarget && (
        <DateTimePicker
          value={(nativePickerTarget === "start" ? (rangeStart ?? new Date()) : (rangeEnd ?? new Date()))}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "calendar"}
          onChange={(e, selected) => onNativeDateChange(e, selected ?? undefined)}
        />
      )}

      {/* existing team modal */}
      <Modal
        visible={teamModalOpen}
        transparent
        animationType="none"
        onRequestClose={() => setTeamModalOpen(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setTeamModalOpen(false)}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                backgroundColor: currentTheme.card,
                borderColor: currentTheme.border,
              },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <TextInput
                placeholder="Search teams..."
                placeholderTextColor={currentTheme.mutedForeground}
                style={[
                  styles.teamSearchInput,
                  {
                    backgroundColor: currentTheme.background,
                    color: currentTheme.cardForeground,
                  },
                ]}
                onChangeText={(text) => {
                  setFilteredTeams(
                    teams.filter((t) =>
                      t.name.toLowerCase().includes(text.toLowerCase())
                    )
                  );
                }}
              />
              <TouchableOpacity
                onPress={() => setTeamModalOpen(false)}
                style={{ marginLeft: 12 }}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={currentTheme.mutedForeground}
                />
              </TouchableOpacity>
            </View>

            {/* teams list / loading / empty */}
            {isTeamsLoading ? (
              <View style={{ padding: 16 }}>
                <View
                  style={{
                    height: 56,
                    width: "100%",
                    backgroundColor: adjustAlpha(currentTheme.muted, 0.18),
                    borderRadius: 10,
                  }}
                />
              </View>
            ) : (filteredTeams?.length ?? 0) === 0 ? (
              <View style={{ padding: 18, alignItems: "center" }}>
                <Text style={{ color: currentTheme.mutedForeground }}>
                  No teams found
                </Text>
                <Text
                  style={{ color: currentTheme.cardForeground, marginTop: 8 }}
                >
                  Create a team to collaborate with others.
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setTeamModalOpen(false);
                    router.push("/(routes)/teams");
                  }}
                  style={{
                    marginTop: 12,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 10,
                    backgroundColor: currentTheme.primary,
                  }}
                >
                  <Text style={{ color: currentTheme.primaryForeground }}>
                    Create Team{" "}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 260 }}>
                {filteredTeams?.map((teamItem: any, index) => (
                  <TouchableOpacity
                    key={teamItem._id}
                    onPress={() => {
                      switchTeamHandler(teamItem?._id);
                      setTeamModalOpen(false);
                    }}
                    style={styles.modalRow}
                  >
                    <Avatar user={teamItem} />
                    <Text
                      style={{
                        marginLeft: 12,
                        color: currentTheme.cardForeground,
                      }}
                    >
                      {teamItem.name}{" "}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <TouchableOpacity
              onPress={() => {
                setTeamModalOpen(false);
                router.push("/(routes)/teams");
              }}
              style={[
                styles.modalRow,
                {
                  borderTopWidth: 1,
                  borderColor: currentTheme.border,
                  marginTop: 8,
                },
              ]}
            >
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={currentTheme.secondary}
              />
              <Text style={{ marginLeft: 12, color: currentTheme.secondary }}>
                Create / Manage Team
              </Text>
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
function formatDate(d?: string | Date) {
  if (!d) return "";
  try {
    const date = typeof d === "string" ? new Date(d) : new Date(d);
    if (Number.isNaN(date.getTime())) return String(d) || "";
    return date
      .toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
      .replace(",", " •");
  } catch {
    return String(d) || "";
  }
}

function calculateProjectProgress(project: any) {
  const totalTasks = project?.tasks?.length ?? 0;
  const completedTasks =
    project?.tasks?.filter(
      (t: any) => t.status === "completed" || t.status === "canceled"
    ).length ?? 0;
  const progress =
    totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);
  return { progress, totalTasks, completedTasks };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamContainer: { flexDirection: "row", alignItems: "center", flex: 1 },
  teamIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconButton: { position: "relative", padding: 6 },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: { marginLeft: 8, flex: 1, minHeight: 36 },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
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
  filterRow: { borderBottomWidth: 0.5, paddingVertical: 8 },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    marginVertical: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  tabs: { flexDirection: "row", paddingVertical: 10, borderBottomWidth: 0.5 },
  tabButton: { marginRight: 16, paddingBottom: 6 },
  taskCard: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    marginHorizontal: 12,
  },
  taskLeft: { width: 14, alignItems: "center", marginRight: 12 },
  priorityDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  taskBody: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center" },
  taskTitle: { fontSize: 16, fontWeight: "700" },
  metaText: { fontSize: 12 },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  projectChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 6,
    borderWidth: 1,
  },
  swipeAction: {
    width: 100,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  swipeText: { marginTop: 6, fontWeight: "700" },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "#00000040",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
  },
  modalRow: { paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  teamSearchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 6 : 10,
  },
  dateInput: {
    // flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 6 : 10,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
  saveButton: {
    marginTop: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    height: 44,
  },
});
