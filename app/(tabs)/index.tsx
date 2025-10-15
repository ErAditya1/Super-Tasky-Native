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

  const scrollY = useRef(new Animated.Value(0)).current;
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [0, -60],
    extrapolate: "clamp",
  });
  const headerScale = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0.96],
    extrapolate: "clamp",
  });
  const fabScale = useRef(new Animated.Value(1)).current;

  const bottomSheetAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bottomSheetAnim, {
      toValue: teamModalOpen ? 1 : 0,
      duration: 280,
      useNativeDriver: Platform.OS === "ios", // safer fallback
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

  const renderTask = ({ item }: { item: Task }) => {
    const assignee = item.assignee
      ? (usersById[item.assignee] as User)
      : undefined;
    const project = item.projectId
      ? (projectsById[item.projectId] as Project)
      : undefined;

    return (
      <GestureHandlerRootView>
        <Swipeable
          renderLeftActions={() => renderLeftActions(item)}
          renderRightActions={() => renderRightActions(item)}
          overshootLeft={false}
          overshootRight={false}
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
                    backgroundColor: PRIORITY_COLORS[item.priority],
                    shadowColor: PRIORITY_COLORS[item.priority],
                  },
                ]}
                accessibilityLabel={`Priority ${item.priority}`}
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
                  {item.title}
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
                  {item.dueDate
                    ? `Due ${formatDate(item.dueDate)}`
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
                  {item.tags?.map((tagId) => {
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
        </Swipeable>
      </GestureHandlerRootView>
    );
  };

  const ProjectCard = ({ item }: { item: Project }) => (
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
        style={{ flexDirection: "row", marginTop: 10, alignItems: "center" }}
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
  );

  const bottomTranslateY = bottomSheetAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [400, 0],
  });

  const Header = () => (
    <Animated.View
      style={[
        styles.header,
        {
          transform: [{ translateY: headerTranslateY }, { scale: headerScale }],
          // backgroundColor: currentTheme.card,
          borderBottomColor: currentTheme.border,
        },
      ]}
    >
      <View style={styles.headerTop}>
        <TouchableOpacity
          onPress={() => setTeamModalOpen(true)}
          style={styles.teamContainer}
        >
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
          <View style={{ marginLeft: 10 }}>
            <Text
              style={{ color: currentTheme.cardForeground, fontWeight: "700" }}
            >
              {currentTeam.name}
            </Text>
            <Text style={{ color: currentTheme.mutedForeground, fontSize: 12 }}>
              3 members • 2 projects
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

      <View style={[styles.searchRow, { backgroundColor: currentTheme.card }]}>
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

  return (
    <View style={[styles.screen, { backgroundColor: currentTheme.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      <Header />

      <View style={{ marginTop: 10 }}>
        <FlatList
          data={SAMPLE_PROJECTS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ paddingHorizontal: 12 }}
          renderItem={({ item }) => <ProjectCard item={item} />}
          ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
        />
      </View>

      <View
        style={[styles.filterRow, { backgroundColor: currentTheme.background }]}
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

      <View
        style={[
          styles.tabs,
          {
            borderBottomColor: currentTheme.border,
            backgroundColor: currentTheme.background,
          },
        ]}
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
      </View>

      <Animated.FlatList
        data={filteredTasks}
        keyExtractor={(t) => t.id}
        renderItem={renderTask}
        contentContainerStyle={{
          padding: 12,
          paddingBottom: insets.bottom + 120,
        }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        ListEmptyComponent={() => (
          <View style={{ padding: 24, alignItems: "center" }}>
            <Text style={{ color: currentTheme.mutedForeground }}>
              No tasks match your filters.
            </Text>
          </View>
        )}
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
                transform: [{ translateY: bottomTranslateY }],
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
                      // Optionally navigate to team page
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
    return d;
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  animatedHeader: {
    zIndex: 10,
  },

  header: {
    paddingHorizontal: 16,
    // We'll add top padding via insets in parent maybe
    paddingTop: 8,
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
    backgroundColor: "rgba(0,0,0,0.05)",
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

  projectCard: {
    width: 220,
    padding: 16,
    borderRadius: 14,
    elevation: 4,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    overflow: "hidden",
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
    marginBottom: 6,
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
