// ActivityScreen.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  SectionList,
  Pressable,
  TextInput,
  Switch,
  Modal,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import {
  GestureHandlerRootView,
  ScrollView,
  Swipeable,
} from "react-native-gesture-handler";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { getMessagesByTeam } from "@/lib/api/comman";

/* ----------------------------
   Types
   ---------------------------- */
type NotificationType =
  | "task"
  | "mention"
  | "member"
  | "reminder"
  | "comment"
  | "system";

type ActivityItem = {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; // ISO
  read: boolean;
  avatar?: string;
  project?: { id: string; name: string; color?: string };
  meta?: Record<string, any>;
};

/* ----------------------------
   Sample initial data (replace with real API)
   ---------------------------- */


/* ----------------------------
   Helpers
   ---------------------------- */
function adjustAlpha(hex: string | undefined, alpha: number) {
  if (!hex || hex[0] !== "#") return `rgba(0,0,0,${alpha})`;
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function prettyTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((+now - +d) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 3600 * 24) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / (3600 * 24));
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString();
}

function groupByDate(items: ActivityItem[]) {
  const sections: { title: string; data: ActivityItem[] }[] = [];
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);
  const startOfWeek = new Date(startOfToday);
  startOfWeek.setDate(startOfToday.getDate() - 7);

  const today: ActivityItem[] = [];
  const yesterday: ActivityItem[] = [];
  const week: ActivityItem[] = [];
  const older: ActivityItem[] = [];

  items.forEach((it) => {
    const t = new Date(it.createdAt);
    if (t >= startOfToday) today.push(it);
    else if (t >= startOfYesterday) yesterday.push(it);
    else if (t >= startOfWeek) week.push(it);
    else older.push(it);
  });

  if (today.length) sections.push({ title: "Today", data: today });
  if (yesterday.length) sections.push({ title: "Yesterday", data: yesterday });
  if (week.length) sections.push({ title: "This week", data: week });
  if (older.length) sections.push({ title: "Older", data: older });

  // ensure stable order: Today -> Yesterday -> This week -> Older
  return sections;
}

/* map type -> icon + color */
function iconForType(type: NotificationType) {
  switch (type) {
    case "task":
      return { name: "checkmark-circle", color: "#16A34A" };
    case "mention":
      return { name: "at", color: "#6366F1" };
    case "member":
      return { name: "person-add", color: "#FB923C" };
    case "reminder":
      return { name: "notifications", color: "#EF4444" };
    case "comment":
      return { name: "chatbubble-ellipses", color: "#60A5FA" };
    case "system":
    default:
      return { name: "information-circle", color: "#9CA3AF" };
  }
}

/* ----------------------------
   Main screen component
   ---------------------------- */
export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];

  // data: null = loading, [] = empty
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // UI states
  const [query, setQuery] = useState("");
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  // load on mount
  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await getMessagesByTeam();
      if (res?.success) {
        setItems((res.data?.data as ActivityItem[]) ?? []);
      } else {
        console.error("Failed fetch", res?.message);
        setItems([]); // show empty on failure
      }
    } catch (e) {
      console.error(e);
      setItems([]); // fail-safe
    }
  }

  // --- All hooks (useMemo/useCallback) must run unconditionally ---
  const unreadCount = useMemo(() => (items ?? []).filter((i) => !i.read).length, [items]);

  const filtered = useMemo(() => {
    const list = items ?? [];
    const q = query.trim().toLowerCase();
    return list
      .filter((i) => (filterType === "all" ? true : i.type === filterType))
      .filter((i) => (!unreadOnly ? true : !i.read))
      .filter((i) => {
        if (!q) return true;
        return (
          i.title.toLowerCase().includes(q) ||
          i.message.toLowerCase().includes(q) ||
          (i.project?.name ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [items, query, filterType, unreadOnly]);

  const sections = useMemo(() => groupByDate(filtered), [filtered]);

  const performHaptics = useCallback(
    (type: "success" | "impact" | "notification" = "impact") => {
      if (!vibrationEnabled) return;
      try {
        if (type === "success") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        else if (type === "notification")
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {}
    },
    [vibrationEnabled]
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load()
    performHaptics("notification");
    setRefreshing(false);
  }, [performHaptics]);

  const markAllRead = useCallback(() => {
    setItems((prev) => (prev ?? []).map((i) => ({ ...i, read: true })));
    performHaptics("success");
  }, [performHaptics]);

  const toggleRead = useCallback(
    (id: string) => {
      setItems((prev) => (prev ?? []).map((i) => (i._id === id ? { ...i, read: !i.read } : i)));
      performHaptics("impact");
    },
    [performHaptics]
  );

  const deleteItem = useCallback(
    (id: string) => {
      setItems((prev) => (prev ?? []).filter((i) => i._id !== id));
      performHaptics("success");
    },
    [performHaptics]
  );

  const bulkMarkRead = useCallback(() => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) {
      Alert.alert("Select items", "No items selected.");
      return;
    }
    setItems((prev) => (prev ?? []).map((i) => (ids.includes(i._id) ? { ...i, read: true } : i)));
    setSelected({});
    setSelectMode(false);
    performHaptics("success");
  }, [selected, performHaptics]);

  const bulkDelete = useCallback(() => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (!ids.length) {
      Alert.alert("Select items", "No items selected.");
      return;
    }
    Alert.alert("Delete", `Delete ${ids.length} notifications?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          setItems((prev) => (prev ?? []).filter((i) => !ids.includes(i._id)));
          setSelected({});
          setSelectMode(false);
          performHaptics("success");
        },
      },
    ]);
  }, [selected, performHaptics]);

  const onToggleSelect = useCallback((id: string) => {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }, []);

  const selectAllVisible = useCallback(() => {
    const allVisible = filtered.map((i) => i._id);
    setSelected(Object.fromEntries(allVisible.map((id) => [id, true])));
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelected({});
    setSelectMode(false);
  }, []);

  const renderRightActions = (item: ActivityItem) => (
    <View style={{ flexDirection: "row", width: 220 }}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          toggleRead(item._id);
          swipeableRefs.current[item._id]?.close?.();
        }}
        style={[styles.swipeAction, { backgroundColor: colors.primary }]}
      >
        <Ionicons name={item.read ? "mail-open-outline" : "mail-outline"} size={18} color={colors.primaryForeground} />
        <Text style={[styles.swipeText, { color: colors.primaryForeground }]}>{item.read ? "Unread" : "Read"}</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        onPress={() => {
          swipeableRefs.current[item._id]?.close?.();
          deleteItem(item._id);
        }}
        style={[styles.swipeAction, { backgroundColor: colors.destructive || "#ff3b30" }]}
      >
        <Ionicons name="trash-outline" size={18} color={colors.primaryForeground} />
        <Text style={[styles.swipeText, { color: colors.primaryForeground }]}>Delete</Text>
      </Pressable>
    </View>
  );

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const Icon = iconForType(item.type);
    const isSelected = !!selected[item._id];

    return (
      <Swipeable
        ref={(ref) => {
          swipeableRefs.current[item._id] = ref;
        }}
        renderRightActions={() => renderRightActions(item)}
        overshootRight={false}
        overshootLeft={false}
      >
        
        <Pressable
          onLongPress={() => {
            setSelectMode(true);
            onToggleSelect(item._id);
            performHaptics("impact");
          }}
          onPress={() => {
            if (selectMode) {
              onToggleSelect(item._id);
              return;
            }
            toggleRead(item._id);
            performHaptics("impact");
            Alert.alert(item.title, item.message, [{ text: "Open", onPress: () => {} }, { text: "Close", style: "cancel" }]);
          }}
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: item.read ? colors.background : adjustAlpha(colors.primary, 0.06),
              borderBottomColor: colors.border,
              opacity: pressed ? 0.95 : 1,
            },
          ]}
        >
          {/* ... (your row content unchanged) */}
          <View style={styles.left}>
            <View style={[styles.avatarFallback, { backgroundColor: item.project?.color ?? "#999" }]}>
              <Text style={[styles.avatarInitials, { color: "#fff" }]}>{(item.title || " ").charAt(0).toUpperCase()}</Text>
            </View>
            <View style={[styles.iconBadge, { backgroundColor: Icon.color }]}>
              <Ionicons name={Icon.name as any} size={14} color="#fff" />
            </View>
          </View>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>{item.title}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{prettyTime(item.createdAt)}</Text>
                {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              </View>
            </View>

            <Text numberOfLines={2} style={[styles.message, { color: colors.mutedForeground }]}>{item.message}</Text>

            {item.project && (
              <View style={{ marginTop: 8, flexDirection: "row", alignItems: "center" }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.project.color, marginRight: 8 }} />
                <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>{item.project.name}</Text>
              </View>
            )}
          </View>

          {selectMode ? (
            <Pressable onPress={() => onToggleSelect(item._id)} style={{ padding: 8 }}>
              <View style={[styles.checkbox, isSelected && { backgroundColor: colors.primary }]}>
                {isSelected ? <Ionicons name="checkmark" size={14} color={colors.primaryForeground} /> : null}
              </View>
            </Pressable>
          ) : (
            <View style={{ width: 8 }} />
          )}
        </Pressable>
        
      </Swipeable>
    );
  };

  // ---- Now it's safe to early-return UI based on data ----
  // Show a loading placeholder while items are null (first fetch)
  if (items === null) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaView style={[styles.safe, { justifyContent: "center", alignItems: "center", backgroundColor: colors.background }]}>
          <Ionicons name="notifications-outline" size={36} color={colors.mutedForeground} />
          <Text style={{ marginTop: 8, color: colors.mutedForeground }}>Loading activity… </Text>
        </SafeAreaView>
      </GestureHandlerRootView>
    );
  }

  // If items is [], let SectionList render ListEmptyComponent (no early return)
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        {/* header, controls, bulk bar... (unchanged) */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.h2, { color: colors.foreground }]}>Activity</Text>
            <Text style={[styles.sub, { color: colors.mutedForeground }]}>{unreadCount} new</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Pressable onPress={() => setSettingsOpen(true)} style={({ pressed }) => [{ padding: 8, opacity: pressed ? 0.85 : 1 }]} accessibilityLabel="Activity settings">
              <Ionicons name="settings-outline" size={20} color={colors.mutedForeground} />
            </Pressable>

            <Pressable onPress={() => markAllRead()} style={({ pressed }) => [{ padding: 8, marginLeft: 8, opacity: pressed ? 0.85 : 1 }]} accessibilityLabel="Mark all read">
              <Text style={{ color: colors.primary, fontWeight: "600" }}>Mark all read</Text>
            </Pressable>
          </View>
        </View>

        {/* controls, bulk bar, SectionList, Settings modal (unchanged) */}
        {/* ... place the rest of your JSX here exactly as before (SectionList using `sections`, ListEmptyComponent will show when sections empty) */}

  {/* Bulk action bar */}
        {selectMode && (
          <Animated.View
            style={[
              styles.bulkBar,
              { backgroundColor: colors.card, borderTopColor: colors.border },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 12 }}
            >
              <Text style={{ color: colors.mutedForeground, marginTop: 10 }}>
                {Object.values(selected).filter(Boolean).length} selected{" "}
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <TouchableOpacity
                  onPress={bulkMarkRead}
                  style={[styles.bulkBtn, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name="mail-open-outline"
                    size={18}
                    color={colors.foreground}
                  />
                  <Text style={{ marginLeft: 8, color: colors.foreground }}>
                    Mark read{" "}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={bulkDelete}
                  style={[styles.bulkBtn, { borderColor: colors.border }]}
                >
                  <Ionicons
                    name="trash-outline"
                    size={18}
                    color={colors.destructive || "#ff3b30"}
                  />
                  <Text
                    style={{
                      marginLeft: 8,
                      color: colors.destructive || "#ff3b30",
                    }}
                  >
                    Delete{" "}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={selectAllVisible}
                  style={[styles.bulkBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.mutedForeground }}>
                    Select all{" "}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={clearSelection}
                  style={[styles.bulkBtn, { borderColor: colors.border }]}
                >
                  <Text style={{ color: colors.mutedForeground }}>Done </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Animated.View>
        )}


        <SectionList
          sections={sections}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={{ color: colors.mutedForeground, fontWeight: "700" }}>{title}</Text>
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            <View style={{ padding: 28, alignItems: "center" }}>
              <Ionicons name="notifications-off-outline" size={42} color={colors.mutedForeground} />
              <Text style={{ color: colors.foreground, fontWeight: "700", marginTop: 12 }}>No activity</Text>
              <Text style={{ color: colors.mutedForeground, textAlign: "center", marginTop: 8 }}>You're all caught up — we'll notify you when activity happens.</Text>
            </View>
          }
        />

        {/* Settings modal (unchanged) */}
        <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
          <Pressable style={styles.sheetOverlay} onPress={() => setSettingsOpen(false)} />
          <Animated.View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* ... settings content */}
            <View style={styles.sheetGrab} />
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Notifications settings</Text>
            <View style={{ padding: 12 }}>
              {/* vibration, sound toggles and buttons */}
              <View style={styles.settingRow}>
                <View>
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>Vibration</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Haptic feedback on notifications and actions</Text>
                </View>
                <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} thumbColor={vibrationEnabled ? colors.primary : undefined} />
              </View>

              <View style={styles.settingRow}>
                <View>
                  <Text style={{ color: colors.foreground, fontWeight: "700" }}>Sound</Text>
                  <Text style={{ color: colors.mutedForeground, fontSize: 12 }}>Play sound for important updates</Text>
                </View>
                <Switch value={soundEnabled} onValueChange={setSoundEnabled} thumbColor={soundEnabled ? colors.primary : undefined} />
              </View>

              <View style={{ height: 12 }} />

              <TouchableOpacity onPress={() => { setItems([]); setSettingsOpen(false); }} style={[styles.pickerClose, { backgroundColor: colors.destructive || "#ff3b30" }]}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Clear all notifications</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSettingsOpen(false)} style={[styles.pickerClose, { backgroundColor: colors.primary, marginTop: 8 }]}>
                <Text style={{ color: colors.primaryForeground, fontWeight: "700" }}>Done</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Modal>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}


/* ----------------------------
   Styles
   ---------------------------- */
const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  h2: { fontSize: 20, fontWeight: "700" },
  sub: { fontSize: 13 },

  controlsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 10,
  },
  searchInput: {
    marginLeft: 8,
    flex: 1,
    paddingVertical: Platform.OS === "android" ? 0 : 6,
  },

  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0,
  },

  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "flex-start",
    borderBottomWidth: 1,
  },
  left: {
    width: 56,
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  avatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { color: "#fff", fontWeight: "700" },

  iconBadge: {
    position: "absolute",
    right: -4,
    bottom: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  body: { flex: 1 },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { fontWeight: "700", fontSize: 15, flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },

  message: { marginTop: 4, fontSize: 13 },

  swipeAction: {
    width: 110,
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
  },
  swipeText: { marginTop: 6, fontWeight: "700", color: "#fff" },

  safeAreaPadding: { paddingBottom: 80 },

  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: "60%",
    overflow: "hidden",
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
  sheetTitle: { fontSize: 16, fontWeight: "700", paddingLeft: 12 },

  pickerClose: {
    padding: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },

  bulkBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: 8,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
