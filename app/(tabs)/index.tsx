// app/index.tsx
import React, { useMemo, useRef, useState, useEffect } from "react";
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
  StatusBar,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppSelector } from "@/store/hooks";
import { Image } from "expo-image";

type Priority = "low" | "medium" | "high";
type User = { id: string; name: string; initials: string };
type Project = { id: string; title: string; color: string; progress?: number };
type Tag = { id: string; title: string };
type Task = {
  id: string;
  title: string;
  notes?: string;
  dueDate?: string;
  priority: Priority;
  assignee?: string;
  projectId?: string;
  tags?: string[];
  completed?: boolean;
};

const SAMPLE_USERS: User[] = [
  { id: "u1", name: "Aditya Kumar", initials: "AK" },
  { id: "u2", name: "Neha Singh", initials: "NS" },
  { id: "u3", name: "Ravi Patel", initials: "RP" },
];

const SAMPLE_PROJECTS: Project[] = [
  { id: "p1", title: "Bright Veil", color: "#5B4BFF", progress: 0.6 },
  { id: "p2", title: "NOU e-Learning", color: "#10B981", progress: 0.35 },
  { id: "p3", title: "Apollo Redesign", color: "#FF6B6B", progress: 0.78 },
];

const SAMPLE_TAGS: Tag[] = [
  { id: "t1", title: "UI" },
  { id: "t2", title: "Backend" },
  { id: "t3", title: "High Priority" },
];

const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    title: "Finish Super Tasky UI",
    dueDate: "2025-10-15",
    priority: "high",
    assignee: "u1",
    projectId: "p1",
    tags: ["t1", "t3"],
  },
  {
    id: "2",
    title: "Team meeting — Sprint planning",
    dueDate: "2025-10-16",
    priority: "medium",
    assignee: "u2",
    projectId: "p1",
    tags: ["t2"],
  },
  {
    id: "3",
    title: "Export project docs",
    dueDate: "2025-10-17",
    priority: "low",
    assignee: "u3",
    projectId: "p2",
    tags: [],
  },
];

const PRIORITY_COLORS: Record<Priority, string> = {
  low: "#4ECCA3",
  medium: "#FFB400",
  high: "#FF4B4B",
};

const TABS = ["Today", "Upcoming", "All Tasks", "Completed"] as const;
type TabName = (typeof TABS)[number];

const WINDOW = Dimensions.get("window");
const HEADER_HEIGHT = 112; // header area height (including search) — used for layout

export default function HomeDashboard() {
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [selectedTab, setSelectedTab] = useState<TabName>("Today");
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [currentTeam, setCurrentTeam] = useState({
    id: "team1",
    name: "Aditya's Team",
  });

  const [activeTagFilters, setActiveTagFilters] = useState<string[]>([]);
  const [activeProjectFilters, setActiveProjectFilters] = useState<string[]>(
    []
  );
  const [activeAssigneeFilters, setActiveAssigneeFilters] = useState<string[]>(
    []
  );

  const { team } = useAppSelector((state) => state.team);

  const usersById = useMemo(
    () => Object.fromEntries(SAMPLE_USERS.map((u) => [u.id, u])),
    []
  );
  const projectsById = useMemo(
    () => Object.fromEntries(SAMPLE_PROJECTS.map((p) => [p.id, p])),
    []
  );
  const tagsById = useMemo(
    () => Object.fromEntries(SAMPLE_TAGS.map((t) => [t.id, t])),
    []
  );

  const [searchQuery, setSearchQuery] = useState("");

  // Animated values used for header translate / scale on scroll
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -40], // slightly move up on scroll
    extrapolate: "clamp",
  });
  const headerScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.99],
    extrapolate: "clamp",
  });
  const fabScale = useRef(new Animated.Value(1)).current;

  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bottomSheetAnim, {
      toValue: teamModalOpen ? 1 : 0,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [teamModalOpen, bottomSheetAnim]);

  const filteredTasks = useMemo(() => {
    let list = tasks.slice();

    if (selectedTab === "Completed") {
      list = list.filter((t) => t.completed);
    } else {
      list = list.filter((t) => !t.completed);
    }

    if (activeTagFilters.length) {
      list = list.filter(
        (t) => t.tags && activeTagFilters.every((ft) => t.tags?.includes(ft))
      );
    }
    if (activeProjectFilters.length) {
      list = list.filter(
        (t) => t.projectId && activeProjectFilters.includes(t.projectId)
      );
    }
    if (activeAssigneeFilters.length) {
      list = list.filter(
        (t) => t.assignee && activeAssigneeFilters.includes(t.assignee)
      );
    }

    if (searchQuery.trim().length > 0) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((t) => {
        const titleMatch = t.title.toLowerCase().includes(q);
        const notesMatch = t.notes?.toLowerCase().includes(q) ?? false;
        const projectMatch = t.projectId
          ? (projectsById[t.projectId]?.title ?? "").toLowerCase().includes(q)
          : false;
        const assigneeMatch = t.assignee
          ? (usersById[t.assignee]?.name ?? "").toLowerCase().includes(q)
          : false;
        return titleMatch || notesMatch || projectMatch || assigneeMatch;
      });
    }

    return list;
  }, [
    tasks,
    selectedTab,
    activeTagFilters,
    activeProjectFilters,
    activeAssigneeFilters,
    searchQuery,
  ]);

  // Build a mixed-data array so we can use stickyHeaderIndices on the FlatList.
  // Items:
  //  - index 0 => Projects row (sticky)
  //  - index 1 => Filter row (sticky)
  //  - index 2 => Tabs row (sticky)
  //  - index >=3 => tasks
  const listData = useMemo(() => {
    const arr: Array<any> = [
      { __type: "projects" },
      { __type: "filters" },
      { __type: "tabs" },
      // then tasks
      ...filteredTasks.map((t) => ({ __type: "task", task: t })),
    ];
    return arr;
  }, [filteredTasks]);

  function markComplete(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: true } : t))
    );
  }
  function undoComplete(taskId: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: false } : t))
    );
  }
  function onEditTask(taskId: string) {
    router.push(`/(routes)/projects/${"projectId"}/tasks/${taskId}/edit`);
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

  function toggleTagFilter(tagId: string) {
    setActiveTagFilters((s) =>
      s.includes(tagId) ? s.filter((id) => id !== tagId) : [...s, tagId]
    );
  }
  function toggleProjectFilter(projectId: string) {
    setActiveProjectFilters((s) =>
      s.includes(projectId)
        ? s.filter((id) => id !== projectId)
        : [...s, projectId]
    );
  }
  function toggleAssigneeFilter(userId: string) {
    setActiveAssigneeFilters((s) =>
      s.includes(userId) ? s.filter((id) => id !== userId) : [...s, userId]
    );
  }

  // --- Swipeable management ---
  // store refs to each swipeable by task id
  const swipeableRefs = useRef<Record<string, any>>({});
  // store currently open swipeable
  const openSwipeableRef = useRef<any>(null);

  function closeOpenSwipeable() {
    if (
      openSwipeableRef.current &&
      typeof openSwipeableRef.current.close === "function"
    ) {
      try {
        openSwipeableRef.current.close();
      } catch {
        // ignore any errors closing
      }
      openSwipeableRef.current = null;
    }
  }

  const renderRightActions = (task: Task) => (
    <Pressable
      onPress={() => onEditTask(task.id)}
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
  );
  const renderLeftActions = (task: Task) => (
    <Pressable
      onPress={() => {
        if (task.completed) undoComplete(task.id);
        else markComplete(task.id);
        // after action, close the swipe
        if (swipeableRefs.current[task.id]?.close)
          swipeableRefs.current[task.id].close();
        openSwipeableRef.current = null;
      }}
      style={[styles.swipeAction, { backgroundColor: currentTheme.secondary }]}
    >
      <Ionicons
        name={task.completed ? "reload" : "checkmark-done"}
        size={18}
        color={currentTheme.secondaryForeground}
      />
      <Text
        style={[styles.swipeText, { color: currentTheme.secondaryForeground }]}
      >
        {task.completed ? "Undo" : "Done"}
      </Text>
    </Pressable>
  );

  const renderTaskCard = (task: Task) => {
    const assignee = task.assignee
      ? (usersById[task.assignee] as User)
      : undefined;
    const project = task.projectId
      ? (projectsById[task.projectId] as Project)
      : undefined;

    return (
      <GestureHandlerRootView>
        <Swipeable
          ref={(r) => {
            swipeableRefs.current[task.id] = r;
          }}
          renderLeftActions={() => renderLeftActions(task)}
          renderRightActions={() => renderRightActions(task)}
          overshootLeft={false}
          overshootRight={false}
          onSwipeableOpen={() => {
            // close previous if different
            const prev = openSwipeableRef.current;
            const current = swipeableRefs.current[task.id];
            if (prev && prev !== current && typeof prev.close === "function") {
              try {
                prev.close();
              } catch {}
            }
            openSwipeableRef.current = current;
          }}
          onSwipeableClose={() => {
            const current = swipeableRefs.current[task.id];
            if (openSwipeableRef.current === current)
              openSwipeableRef.current = null;
          }}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => {
              // If another row is open, first tap closes it.
              const open = openSwipeableRef.current;
              const thisRef = swipeableRefs.current[task.id];
              if (open && open !== thisRef) {
                closeOpenSwipeable();
                return;
              }
              // otherwise, handle tap (navigate/edit/etc) if you want
              // e.g. router.push(`/tasks/${task.id}`)
            }}
          >
            <View
              style={[
                styles.taskCard,
                {
                  backgroundColor: currentTheme.card,
                  borderColor: currentTheme.border,
                  shadowColor: isDark ? "#000" : "#000",
                },
              ]}
            >
              <View style={styles.taskLeft}>
                <View
                  style={[
                    styles.priorityDot,
                    {
                      backgroundColor: PRIORITY_COLORS[task.priority],
                      shadowColor: PRIORITY_COLORS[task.priority],
                    },
                  ]}
                  accessibilityLabel={`Priority ${task.priority}`}
                />
              </View>

              <View style={styles.taskBody}>
                <View style={styles.row}>
                  <Text
                    style={[
                      styles.taskTitle,
                      { color: currentTheme.cardForeground },
                    ]}
                    numberOfLines={1}
                    accessibilityRole="header"
                  >
                    {task.title}
                  </Text>
                  {project && (
                    <View
                      style={[
                        styles.projectChip,
                        { backgroundColor: adjustAlpha(project.color, 0.12) },
                      ]}
                    >
                      <Text style={{ color: project.color, fontWeight: "600" }}>
                        {project.title}
                      </Text>
                    </View>
                  )}
                </View>

                <View
                  style={[styles.row, { marginTop: 8, alignItems: "center" }]}
                >
                  <Text
                    style={[
                      styles.metaText,
                      { color: currentTheme.mutedForeground },
                    ]}
                  >
                    {task.dueDate
                      ? `Due ${formatDate(task.dueDate)}`
                      : "No due date"}
                  </Text>

                  <View style={{ width: 12 }} />

                  {assignee ? (
                    <View
                      style={[
                        styles.avatar,
                        {
                          backgroundColor: currentTheme.sidebarAccent,
                          borderWidth: 0,
                        },
                      ]}
                      accessibilityLabel={`Assigned to ${assignee.name}`}
                    >
                      <Text
                        style={{
                          color: currentTheme.sidebarAccentForeground,
                          fontWeight: "700",
                        }}
                      >
                        {assignee.initials}
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ flex: 1 }} />

                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {task.tags?.map((tagId) => {
                      const tag = tagsById[tagId];
                      return (
                        <View
                          key={tagId}
                          style={[
                            styles.tagChip,
                            { borderColor: currentTheme.border },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 12,
                              color: currentTheme.cardForeground,
                            }}
                          >
                            {tag?.title}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  // --- Components that are used as items in the list so we can make them sticky ---
  const ProjectsRow = () => (
    <View
      style={[
        styles.projectsContainer,
        { backgroundColor: currentTheme.background },
      ]}
    >
      <FlatList
        data={SAMPLE_PROJECTS}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/(routes)/projects/${item.id}`)}
            style={[
              styles.projectCard,
              { backgroundColor: item.color, shadowColor: item.color },
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.projectTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <View
              style={{
                flexDirection: "row",
                marginTop: 10,
                alignItems: "center",
              }}
            >
              {SAMPLE_USERS.slice(0, 3).map((u) => (
                <View key={u.id} style={styles.projectAvatar}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>
                    {u.initials}
                  </Text>
                </View>
              ))}
            </View>
            <View style={{ marginTop: 12 }}>
              <View style={styles.progressBarBackground}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${(item.progress ?? 0) * 100}%` },
                  ]}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
      />
    </View>
  );

  const FiltersRow = () => (
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
        {SAMPLE_TAGS.map((t) => {
          const active = activeTagFilters.includes(t.id);
          return (
            <TouchableOpacity
              key={t.id}
              onPress={() => toggleTagFilter(t.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? currentTheme.primary
                    : currentTheme.muted,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active
                    ? currentTheme.primaryForeground
                    : currentTheme.mutedForeground,
                }}
              >
                {t.title}{" "}
              </Text>
            </TouchableOpacity>
          );
        })}
        {SAMPLE_PROJECTS.map((p) => {
          const active = activeProjectFilters.includes(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => toggleProjectFilter(p.id)}
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
                {p.title}
              </Text>
            </TouchableOpacity>
          );
        })}
        {SAMPLE_USERS.map((u) => {
          const active = activeAssigneeFilters.includes(u.id);
          return (
            <TouchableOpacity
              key={u.id}
              onPress={() => toggleAssigneeFilter(u.id)}
              style={[
                styles.chip,
                {
                  backgroundColor: active
                    ? currentTheme.primary
                    : currentTheme.muted,
                  marginLeft: 8,
                  borderColor: currentTheme.border,
                },
              ]}
            >
              <Text
                style={{
                  color: active
                    ? currentTheme.primaryForeground
                    : currentTheme.mutedForeground,
                }}
              >
                {u.initials}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const TabsRow = () => (
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
  );

  // Header is absolute at top and animated — stays visible (sticky) while the list scrolls underneath.
  const Header = () => (
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
            // <Image source={{uri:}} alt={team?.name}/>
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
              {team?.members?.length} members • {team?.projects?.length} projects {" "}
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
            onPress={() => Alert.alert("Notifications")}
            style={styles.iconButton}
          >
            <Ionicons
              name="notifications-outline"
              size={20}
              color={currentTheme.mutedForeground}
            />
            <View
              style={[
                styles.badge,
                { backgroundColor: currentTheme.secondary },
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/(routes)/user/profile")}
            style={{ marginLeft: 12 }}
          >
            <View
              style={[
                styles.profileAvatar,
                { backgroundColor: currentTheme.sidebarPrimary },
              ]}
            >
              <Text
                style={{
                  color: currentTheme.sidebarPrimaryForeground,
                  fontWeight: "700",
                }}
              >
                AK
              </Text>
              <View
                style={[
                  styles.onlineDot,
                  { backgroundColor: currentTheme.success },
                ]}
              />
            </View>
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
          returnKeyType="search"
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
    </Animated.View>
  );

  // Render mixed list items (projects, filters, tabs, tasks)
  const renderMixedItem = ({ item, index }: { item: any; index: number }) => {
    if (item.__type === "projects") {
      return <ProjectsRow />;
    }
    if (item.__type === "filters") {
      return <FiltersRow />;
    }
    if (item.__type === "tabs") {
      return <TabsRow />;
    }
    if (item.__type === "task") {
      return renderTaskCard(item.task);
    }
    return null;
  };

  return (
    <View
      style={[styles.screen, { backgroundColor: currentTheme.background }]}
      onStartShouldSetResponder={() => {
        // close open swipeable when tapping anywhere outside
        closeOpenSwipeable();
        return false;
      }}
    >
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={currentTheme.background}
      />

      {/* Animated, absolute header on top so it's visually sticky — the list scrolls underneath */}
      <Header />

      {/* Animated FlatList with stickyHeaderIndices pointing to the three rows we want pinned under the header */}
      <Animated.FlatList
        data={listData}
        renderItem={renderMixedItem}
        keyExtractor={(item, i) =>
          item.__type === "task" ? item.task.id : `${item.__type}-${i}`
        }
        contentContainerStyle={{
          paddingTop: HEADER_HEIGHT + 12, // push content below the absolute header
          paddingBottom: insets.bottom + 120,
          minHeight: WINDOW.height + 1,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        stickyHeaderIndices={[0, 1, 2]} // ProjectsRow, FiltersRow, TabsRow will stick
        // Use native driver animation for smooth scroll-linked header animation
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }] as any,
          { useNativeDriver: true }
        )}
        onScrollBeginDrag={() => {
          // close any open swipeable when user starts scrolling
          closeOpenSwipeable();
        }}
        scrollEventThrottle={16}
        // Improve swipeable performance inside FlatList
        removeClippedSubviews
      />

      {/* Floating action button */}
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

      {/* Team modal */}
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
                  // TODO: implement team search filter
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
            <ScrollView style={{ maxHeight: 260 }}>
              {["Aditya's Team", "Design Ops", "QA Squad", "Marketing"].map(
                (name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => {
                      setCurrentTeam({ id: name, name });
                      setTeamModalOpen(false);
                    }}
                    style={styles.modalRow}
                  >
                    <Ionicons
                      name="people-outline"
                      size={20}
                      color={currentTheme.primary}
                    />
                    <Text
                      style={{
                        marginLeft: 12,
                        color: currentTheme.cardForeground,
                      }}
                    >
                      {name}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </ScrollView>
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

function formatDate(d?: string) {
  if (!d) return "";
  try {
    const date = new Date(d);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return d || "";
  }
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
  teamContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  teamIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    position: "relative",
    padding: 6,
  },
  badge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 40,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    minHeight: 36,
  },

  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },

  projectsContainer: {
    borderBottomWidth: 0.5,
  },
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
  projectTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
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
  progressBarFill: {
    height: "100%",
    backgroundColor: "#fff",
  },

  filterRow: {
    borderBottomWidth: 0.5,
    paddingVertical: 8,
  },
  chip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    marginVertical: 8,
  },

  tabs: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  tabButton: {
    marginRight: 16,
    paddingBottom: 6,
  },

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
  swipeText: {
    marginTop: 6,
    fontWeight: "700",
  },

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
  modalRow: {
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  teamSearchInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "android" ? 6 : 10,
  },
});
