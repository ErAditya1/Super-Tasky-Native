// app/(tabs)/archive/index.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { theme as colorTokens } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch } from "@/store/hooks";
import TaskCard from "@/components/TaskCard";

// API helpers (your project structure)
import {
  favouriteHandler,
  recoverHandler as recoverTaskApi,
  deleteTask as deleteTaskApi,
  getArchievedItems,
} from "@/lib/api/task";
import {
  recoverProject as recoverProjectApi,
  deleteProject as deleteProjectApi,
} from "@/lib/api/project";

import { insertFavouriteTask, addFavouriteTasks } from "@/store/task/taskSlice";
import { useToast } from "@/components/Toast";

// Optional toast helper (web uses this); fall back to Alert if it's not available

type TaskType = any;
type ProjectType = any;

export default function ArchiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const { isDark } = useThemeToggle();
  const theme = colorTokens[isDark ? "dark" : "light"];

  // local state
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<TaskType[]>([]);
  const [projects, setProjects] = useState<ProjectType[]>([]);
  const [view, setView] = useState<"tasks" | "projects">("tasks");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "me" | "overdue">("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const toast = useToast();

  // Small wrapper: prefer toast if available, else Alert
  const showToast = (opts: {
    title: string;
    description?: string;
    variant?: "success" | "danger";
  }) => {
    if (typeof toast.show === "function") {
      toast?.show(opts.title, opts.variant);
    } else {
      // fallback
      Alert.alert(opts.title, opts.description ?? "");
    }
  };

  // Confirm wrapper using Alert -> Promise<boolean>
  const confirmAsync = async (message: string) =>
    new Promise<boolean>((resolve) =>
      Alert.alert("Confirm", message, [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "OK", onPress: () => resolve(true) },
      ])
    );

  // fetch archive from your backend
  const getArchieve = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getArchievedItems();
      if (res?.success) {
        const data = res.data?.data ?? res.data ?? res;
        setTasks(data.tasks ?? data.archivedTasks ?? []);
        setProjects(data.projects ?? data.archivedProjects ?? []);
        // optionally push favorites into redux if API provided them
        if (Array.isArray(data.favourites) && data.favourites.length > 0) {
          dispatch(addFavouriteTasks(data.favourites));
        }
      } else {
        showToast({
          title: "Failed to load archive",
          description: res?.message ?? "Unknown",
          variant: "danger",
        });
        setTasks([]);
        setProjects([]);
      }
    } catch (err: any) {
      console.error("getArchieve error", err);
      showToast({
        title: "Error",
        description: err?.message ?? "Unknown",
        variant: "danger",
      });
      setTasks([]);
      setProjects([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dispatch]);

  useEffect(() => {
    getArchieve();
  }, [getArchieve]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getArchieve();
  }, [getArchieve]);

  /* ----------------------
     Handlers - wired to your APIs
     ---------------------- */

  // Toggle favourite (optimistic)
  const toggleFavouriteLocal = useCallback(
    async (id: string) => {
      // optimistic UI flip
      setTasks((prev) =>
        prev.map((t) =>
          t._id === id ? { ...t, isFavourite: !t.isFavourite } : t
        )
      );
      setActionLoadingId(id);

      try {
        const res = await favouriteHandler(id);
        if (res?.success) {
          showToast({
            title: "Favourite toggled",
            description: res.data?.message ?? "Done",
            variant: "success",
          });
          if (res.data?.data) {
            dispatch(insertFavouriteTask(res.data.data));
          }
        } else {
          throw new Error(res?.message || "Failed to toggle favourite");
        }
      } catch (err: any) {
        // rollback
        setTasks((prev) =>
          prev.map((t) =>
            t._id === id ? { ...t, isFavourite: !t.isFavourite } : t
          )
        );
        showToast({
          title: "Failed",
          description: err?.message || "Server error",
          variant: "danger",
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [dispatch]
  );

  // Delete archived task permanently (confirm)
  const deleteTaskHandler = useCallback(
    async (taskId: string) => {
      const isConfirm = await confirmAsync(
        "Deleted task will never be recovered. Continue?"
      );
      if (!isConfirm) return;
      setActionLoadingId(taskId);
      try {
        const res = await deleteTaskApi(taskId);
        if (res?.success) {
          showToast({
            title: "Task deleted",
            description: res.data?.message,
            variant: "success",
          });
          await getArchieve();
        } else {
          showToast({
            title: "Delete failed",
            description: res?.message ?? "Unknown",
            variant: "danger",
          });
        }
      } catch (err: any) {
        console.error("deleteTask error", err);
        showToast({
          title: "Error",
          description: err?.message ?? "Unknown",
          variant: "danger",
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [getArchieve]
  );

  // Recover archived task
  const recoverTaskHandler = useCallback(
    async (taskId: string) => {
      setActionLoadingId(taskId);
      try {
        const res = await recoverTaskApi(taskId);
        if (res?.success) {
          showToast({
            title: "Task recovered",
            description: res.data?.message,
            variant: "success",
          });
          await getArchieve();
        } else {
          showToast({
            title: "Recover failed",
            description: res?.message ?? "Unknown",
            variant: "danger",
          });
        }
      } catch (err: any) {
        console.error("recoverTask error", err);
        showToast({
          title: "Error",
          description: err?.message ?? "Unknown",
          variant: "danger",
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [getArchieve]
  );

  // Delete archived project permanently
  const deleteProjectHandler = useCallback(
    async (projectId: string) => {
      const isConfirm = await confirmAsync(
        "Deleted project will never be recovered. Continue?"
      );
      if (!isConfirm) return;
      setActionLoadingId(projectId);
      try {
        const res = await deleteProjectApi(projectId);
        if (res?.success) {
          showToast({
            title: "Project deleted",
            description: res.data?.message,
            variant: "success",
          });
          await getArchieve();
        } else {
          showToast({
            title: "Delete failed",
            description: res?.message ?? "Unknown",
            variant: "danger",
          });
        }
      } catch (err: any) {
        console.error("deleteProject error", err);
        showToast({
          title: "Error",
          description: err?.message ?? "Unknown",
          variant: "danger",
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [getArchieve]
  );

  // Recover archived project
  const recoverProjectHandler = useCallback(
    async (projectId: string) => {
      setActionLoadingId(projectId);
      try {
        const res = await recoverProjectApi(projectId);
        if (res?.success) {
          showToast({
            title: "Project recovered",
            description: res.data?.message,
            variant: "success",
          });
          await getArchieve();
        } else {
          showToast({
            title: "Recover failed",
            description: res?.message ?? "Unknown",
            variant: "danger",
          });
        }
      } catch (err: any) {
        console.error("recoverProject error", err);
        showToast({
          title: "Error",
          description: err?.message ?? "Unknown",
          variant: "danger",
        });
      } finally {
        setActionLoadingId(null);
      }
    },
    [getArchieve]
  );

  /* ----------------------
     Derived lists (search/filter)
     ---------------------- */
  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t) => {
        if (filter === "me") {
          return (t.assignedToUser?._id ?? "") === (t._currentUserId ?? "");
        }
        if (filter === "overdue") {
          return t.dueDate && new Date(t.dueDate) < new Date();
        }
        return true;
      })
      .filter((t) => {
        if (!q) return true;
        const title = (t.title ?? "").toString().toLowerCase();
        const tags = Array.isArray(t.tags)
          ? t.tags.join(" ").toLowerCase()
          : "";
        const project = (t.projectData?.name ?? t.project ?? "")
          .toString()
          .toLowerCase();
        return title.includes(q) || tags.includes(q) || project.includes(q);
      });
  }, [tasks, search, filter]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (!q) return true;
      const name = (p.name ?? "").toString().toLowerCase();
      const desc = (p.description ?? "").toString().toLowerCase();
      return name.includes(q) || desc.includes(q);
    });
  }, [projects, search]);

  /* ----------------------
     Inline ProjectCard
     ---------------------- */
  function ProjectCard({ project }: { project: ProjectType }) {
    return (
      <View
        style={[
          styles.projectCard,
          { borderColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: theme.cardForeground,
              fontWeight: "700",
              fontSize: 16,
            }}
          >
            {project.name}
          </Text>
          <Text
            style={{ color: theme.mutedForeground, marginTop: 6 }}
            numberOfLines={2}
          >
            {project.description ?? "No description"}
          </Text>
          <Text
            style={{ color: theme.mutedForeground, marginTop: 6, fontSize: 12 }}
          >
            Members: {(project.members ?? []).length}
          </Text>
        </View>

        <View style={{ width: 8 }} />
        <View
          style={{ alignItems: "flex-end", justifyContent: "space-between" }}
        >
          <TouchableOpacity
            onPress={() => recoverProjectHandler(project._id)}
            style={[
              styles.smallBtn,
              { backgroundColor: theme.primary, borderColor: theme.border },
            ]}
            disabled={actionLoadingId === project._id}
          >
            {actionLoadingId === project._id ? (
              <ActivityIndicator color={theme.primaryForeground} />
            ) : (
              <Text
                style={{ color: theme.primaryForeground, fontWeight: "700" }}
              >
                Recover
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => deleteProjectHandler(project._id)}
            style={[
              styles.smallBtn,
              { marginTop: 8, borderColor: theme.border },
            ]}
            disabled={actionLoadingId === project._id}
          >
            {actionLoadingId === project._id ? (
              <ActivityIndicator color={theme.cardForeground} />
            ) : (
              <Text style={{ color: theme.cardForeground, fontWeight: "700" }}>
                Delete
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  /* ----------------------
     UI / rendering
     ---------------------- */
  return (
    <SafeAreaView
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: theme.card, borderBottomColor: theme.border },
        ]}
      >
        <Text style={[styles.headerTitle, { color: theme.cardForeground }]}>
          <Ionicons name="trash" size={20} color={theme.mutedForeground} />
          Archive
        </Text>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={theme.cardForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search + view toggle */}
      <View
        style={[
          styles.searchRow,
          { backgroundColor: theme.card, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search" size={18} color={theme.mutedForeground} />
        <TextInput
          placeholder={`Search archived ${
            view === "tasks" ? "tasks, projects, tags..." : "projects..."
          }`}
          placeholderTextColor={theme.mutedForeground}
          value={search}
          onChangeText={setSearch}
          style={[styles.searchInput, { color: theme.cardForeground }]}
          returnKeyType="search"
        />

        <TouchableOpacity onPress={() => setSearch("")} style={{ padding: 8 }}>
          <Ionicons
            name="close-circle"
            size={18}
            color={theme.mutedForeground}
          />
        </TouchableOpacity>
      </View>

      <View style={[styles.segmentRow, { backgroundColor: theme.card }]}>
        {(["tasks", "projects"] as const).map((s) => {
          const active = view === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setView(s)}
              style={[
                styles.segmentItem,
                active && {
                  borderBottomColor: theme.primary,
                  borderBottomWidth: 2,
                },
              ]}
            >
              <Text
                style={{
                  color: active ? theme.primary : theme.mutedForeground,
                  fontWeight: active ? "800" : "600",
                }}
              >
                {s === "tasks" ? "Tasks" : "Projects"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Filters (tasks only) */}
      {view === "tasks" && (
        <View
          style={[
            styles.filterRow,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          {(["all", "me", "overdue"] as const).map((f) => {
            const active = filter === f;
            const label =
              f === "all" ? "All" : f === "me" ? "Assigned to me" : "Overdue";
            return (
              <TouchableOpacity
                key={f}
                onPress={() => setFilter(f)}
                style={[
                  styles.filterBtn,
                  active && { backgroundColor: theme.primary },
                ]}
              >
                <Text
                  style={{
                    color: active
                      ? theme.primaryForeground
                      : theme.cardForeground,
                    fontWeight: active ? "800" : "600",
                  }}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Content */}
      <View style={{ flex: 1, padding: 12 }}>
        {loading ? (
          <View style={{ alignItems: "center", marginTop: 36 }}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={{ color: theme.mutedForeground, marginTop: 8 }}>
              Loading archive... {" "}
            </Text>
          </View>
        ) : view === "tasks" ? (
          filteredTasks.length === 0 ? (
            <View style={styles.empty}>
              <Text style={{ color: theme.mutedForeground }}>
                No archived tasks found.
              </Text>
            </View>
          ) : (
            <FlatList
              data={filteredTasks}
              keyExtractor={(t) => t._id}
              renderItem={({ item }) => {
                const borderColor =
                  item.status === "completed"
                    ? "#22c55e"
                    : item.status === "canceled"
                    ? "red"
                    : item.status === "in_progress"
                    ? "#0ea5e9"
                    : item.status === "pending"
                    ? "#0091e9"
                    : "transparent";

                return (
                  <View style={{ marginBottom: 12 }}>
                    <TaskCard
                      task={item}
                      theme={theme}
                      borderColor={borderColor}
                      onLongPress={() => {}}
                      onOpenActivity={() => {}}
                    />

                    <View
                      style={{
                        flexDirection: "row",
                        paddingHorizontal: 18,
                        marginTop: 8,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => recoverTaskHandler(item._id)}
                        style={[
                          styles.smallBtn,
                          { backgroundColor: theme.primary },
                        ]}
                        disabled={actionLoadingId === item._id}
                      >
                        {actionLoadingId === item._id ? (
                          <ActivityIndicator color={theme.primaryForeground} />
                        ) : (
                          <>
                            <Ionicons
                              name="arrow-undo-outline"
                              size={14}
                              color={theme.primaryForeground}
                            />
                            <Text
                              style={{
                                color: theme.primaryForeground,
                                marginLeft: 8,
                                fontWeight: "700",
                              }}
                            >
                              Recover
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => deleteTaskHandler(item._id)}
                        style={[
                          styles.smallBtn,
                          { marginLeft: 8, borderColor: theme.border },
                        ]}
                        disabled={actionLoadingId === item._id}
                      >
                        {actionLoadingId === item._id ? (
                          <ActivityIndicator color={theme.cardForeground} />
                        ) : (
                          <>
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color={theme.cardForeground}
                            />
                            <Text
                              style={{
                                color: theme.cardForeground,
                                marginLeft: 8,
                                fontWeight: "700",
                              }}
                            >
                              Delete
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <View style={{ flex: 1 }} />

                      <TouchableOpacity
                        onPress={() => toggleFavouriteLocal(item._id)}
                        style={[
                          styles.smallBtn,
                          { marginLeft: 8, borderColor: theme.border },
                        ]}
                        disabled={actionLoadingId === item._id}
                      >
                     
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              }}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={theme.primary}
                />
              }
            />
          )
        ) : projects.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: theme.mutedForeground }}>
              No archived projects found.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredProjects}
            keyExtractor={(p) => p._id}
            renderItem={({ item }) => (
              <View style={{ marginBottom: 12 }}>
                <ProjectCard project={item} />
              </View>
            )}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
              />
            }
          />
        )}
      </View>

      {/* floating action: refresh */}
      <View style={{ position: "absolute", right: 16, bottom: 24 }}>
        <TouchableOpacity
          onPress={() => getArchieve()}
          style={[styles.fab, { backgroundColor: theme.primary }]}
        >
          <Ionicons name="refresh" size={20} color={theme.primaryForeground} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ---------- styles ---------- */
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
  headerTitle: { fontSize: 18, fontWeight: "800" },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    margin: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: { flex: 1, marginLeft: 8 },

  segmentRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 12,
  },
  segmentItem: { marginRight: 18, paddingBottom: 6 },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },

  empty: { alignItems: "center", justifyContent: "center", flex: 1 },

 projectCard: {
  padding: 16,
  borderRadius: 14,
  borderWidth: 1,
  flexDirection: "column",
  justifyContent: "space-between",
},
smallBtn: {
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 12,
  borderWidth: 1,
},
  fab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },
});
