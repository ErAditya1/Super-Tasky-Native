// app/(tabs)/favorites/index.tsx
import React, { useMemo, useState, useCallback, useEffect } from "react";
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
  Modal,
  Pressable,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { theme as colorTokens } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import TaskCard from "@/components/TaskCard";
import { favouriteHandler, getFavouriteTasks } from "@/lib/api/task";
import {
  insertFavouriteTask,
  addFavouriteTasks,
} from "@/store/task/taskSlice";
import { Alert } from "react-native";

/**
 * FavouriteTasksScreen - dynamic version
 *
 * - Fetches favourites from server
 * - Optimistic toggleFavourite with rollback
 * - Filter sheet for All/Active/Completed/High priority
 * - Search, pull-to-refresh, FAB to create
 */

export default function FavouriteTasksScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const { isDark } = useThemeToggle();
  const theme = colorTokens[isDark ? "dark" : "light"];

  // local UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "high">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]); // local list of favourite tasks
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);

  // Optional: read any favourites stored in Redux as a fallback
  const favouritesFromSlice = useAppSelector((s: any) => s.task?.favourites ?? null);

  // Fetch favourites from API on mount
  useEffect(() => {
    let mounted = true;
    const fetchFavs = async () => {
      setLoading(true);
      try {
        const res = await getFavouriteTasks();
        if (!mounted) return;
        
        if (res?.success) {
          const data = res.data?.data ?? [];
          setTasks(data);
          // optional: store to redux
          dispatch(addFavouriteTasks(data));
        } else {
          console.error("Failed to load favourites:", res?.message);
          // fallback to redux slice if available
          if (Array.isArray(favouritesFromSlice) && favouritesFromSlice.length) {
            setTasks(favouritesFromSlice);
          } else {
            setTasks([]);
          }
        }
      } catch (err) {
        console.error("fetchFavs error", err);
        if (Array.isArray(favouritesFromSlice) && favouritesFromSlice.length) {
          setTasks(favouritesFromSlice);
        } else {
          setTasks([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchFavs();
    return () => {
      mounted = false;
    };
  }, [dispatch, favouritesFromSlice]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await getFavouriteTasks();
      if (res?.success) {
        const data = res.data?.data ?? [];
        setTasks(data);
        dispatch(addFavouriteTasks(data));
      } else {
        Alert.alert("Refresh failed", res?.message || "Could not refresh favourites");
      }
    } catch (err) {
      console.error("onRefresh error", err);
      Alert.alert("Refresh failed", (err as any)?.message || "Unknown error");
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);


  // Filter + search
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return tasks
      .filter((t: any) => {
        if (filter === "active" && t.status === "completed") return false;
        if (filter === "completed" && t.status !== "completed") return false;
        if (filter === "high" && (t.priority ?? "").toLowerCase() !== "high") return false;
        return true;
      })
      .filter((t: any) => {
        if (!q) return true;
        const title = (t.title ?? "").toString().toLowerCase();
        const tags = Array.isArray(t.tags) ? t.tags.join(" ").toLowerCase() : "";
        const project = (t.projectData?.name ?? t.project ?? "").toString().toLowerCase();
        return title.includes(q) || tags.includes(q) || project.includes(q);
      });
  }, [tasks, filter, searchQuery]);

  function openTask(t: any) {
    // navigate to your task details route used elsewhere
    // adjust route if your routes differ
    router.push(`/(routes)/projects/${t.project?._id ?? t.project}/tasks/${t._id}`);
  }

  const renderItem = ({ item }: { item: any }) => {
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
      <View style={{ marginBottom: 10 }}>
        <TaskCard
          task={item}
          theme={theme}
          borderColor={borderColor}
          onPress={() => openTask(item)}
        //   onLongPress={() => openTask(item)}
          onApply={async (taskId, field, value) => {
            // If TaskCard's sheet calls onApply, we can update local tasks here (optimistic)
            setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, [field]: value } : t)));
            // optionally call API; for now we attempt favouriteHandler for 'isFavourite' only
            try {
              // placeholder: if your API supports field update endpoint use it.
              return true;
            } catch {
              // rollback
              setTasks((prev) => prev.map((t) => (t._id === taskId ? { ...t, [field]: (prev.find(p=>p._id===taskId) as any)[field] } : t)));
              return false;
            }
          }}
        />

     
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.background, paddingBottom: insets.bottom + 12 }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.card }]}>
        <Text style={[styles.headerTitle, { color: theme.cardForeground }]}>⭐ Favourite Tasks</Text>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 8 }}>
            <Ionicons name="chevron-back" size={20} color={theme.cardForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterSheetOpen(true)} style={{ padding: 8 }}>
            <Ionicons name="filter" size={20} color={theme.cardForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={18} color={theme.mutedForeground} />
        <TextInput
          placeholder="Search tasks, project or tags..."
          placeholderTextColor={theme.mutedForeground}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.cardForeground }]}
          returnKeyType="search"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")} style={{ padding: 6 }}>
            <Ionicons name="close-circle" size={18} color={theme.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

     

      {/* Content */}
      <View style={{ flex: 1, padding: 12 }}>
        {loading ? (
          <View style={{ alignItems: "center", justifyContent: "center", paddingTop: 24 }}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={{ color: theme.mutedForeground, marginBottom: 8 }}>No favourite tasks yet.</Text>
            <TouchableOpacity onPress={() => router.push(`/(routes)/NewTask`)} style={[styles.primaryBtn, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.primaryForeground }}>Create a task </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(t: any) => t._id}
            renderItem={renderItem}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
            ListEmptyComponent={() => (
              <View style={{ padding: 16 }}>
                <Text style={{ color: theme.mutedForeground }}>No tasks match your filter.</Text>
              </View>
            )}
          />
        )}
      </View>

      {/* FAB: create new task */}
      <TouchableOpacity style={[styles.fab, { backgroundColor: theme.primary }]} onPress={() => router.push(`/(routes)/NewTask`)}>
        <Ionicons name="add" size={22} color={theme.primaryForeground} />
      </TouchableOpacity>

      {/* Filter sheet modal (detailed) */}
      <Modal visible={filterSheetOpen} transparent animationType="slide">
        <Pressable style={styles.sheetOverlay} onPress={() => setFilterSheetOpen(false)} />
        <View style={[styles.filterSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sheetGrab} />
          <Text style={[styles.sheetTitle, { color: theme.cardForeground }]}>Filter tasks</Text>

          <View style={{ padding: 12 }}>
            {(
              [
                { key: "all", label: "All" },
                { key: "active", label: "Active" },
                { key: "completed", label: "Completed" },
                { key: "high", label: "High priority" },
              ] as { key: "all" | "active" | "completed" | "high"; label: string }[]
            ).map((opt) => (
              <TouchableOpacity
                key={opt.key}
                onPress={() => {
                  setFilter(opt.key);
                  setFilterSheetOpen(false);
                }}
                style={[styles.pickerItem, { borderBottomColor: theme.border }]}
              >
                <Text style={{ color: theme.cardForeground }}>{opt.label} </Text>
                {filter === opt.key && <Text style={{ color: theme.mutedForeground }}>Selected</Text>}
              </TouchableOpacity>
            ))}

            <View style={{ height: 12 }} />

            <TouchableOpacity
              onPress={() => {
                setFilter("all");
                setSearchQuery("");
                setFilterSheetOpen(false);
              }}
              style={[styles.pickerClose, { backgroundColor: theme.primary }]}
            >
              <Text style={{ color: theme.primaryForeground }}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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

  segmentRow: { flexDirection: "row", paddingHorizontal: 12, paddingVertical: 6, marginHorizontal: 12 },
  segmentItem: { marginRight: 18, paddingBottom: 6 },

  smallBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  smallBtnText: { fontSize: 13, fontWeight: "700" },

  row: { flexDirection: "row", paddingHorizontal: 18, marginTop: 8, alignItems: "center" },

  empty: { alignItems: "center", justifyContent: "center", flex: 1 },

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
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 6,
  },

  primaryBtn: { padding: 10, borderRadius: 8, minWidth: 140, alignItems: "center", justifyContent: "center" },

  // Filter sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
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
  sheetTitle: { fontSize: 16, fontWeight: "700", paddingLeft: 8 },
  pickerItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerClose: { padding: 12, alignItems: "center", justifyContent: "center" },
});
