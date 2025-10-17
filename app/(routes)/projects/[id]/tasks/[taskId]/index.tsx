// app/(routes)/projects/[projectId]/tasks/index.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addTasks, TaskInterface } from "@/store/task/taskSlice";
import { getTasksByProject, deleteTask, updateTaskActivity } from "@/lib/api/task";
import { useToast } from "@/components/Toast";


/* ---------------- Types ---------------- */
type Opt = { value: string; label: string };

/* ---------------- Small helpers / UI bits ---------------- */
function StatusIcon({ status }: { status?: string }) {
  // simple emoji-based icons for portability — swap with icon lib if desired
  switch (status) {
    case "pending":
      return <Text style={styles.icon}>⏳</Text>;
    case "in_progress":
      return <Text style={styles.icon}>🔄</Text>;
    case "completed":
      return <Text style={styles.icon}>✅</Text>;
    case "canceled":
      return <Text style={styles.icon}>⛔</Text>;
    default:
      return <Text style={styles.icon}>⚪</Text>;
  }
}
function PriorityBadge({ priority }: { priority?: TaskInterface["priority"] }) {
  let color = "#9CA3AF";
  if (priority === "critical") color = "#7C3AED";
  if (priority === "high") color = "#EF4444";
  if (priority === "medium") color = "#F59E0B";
  if (priority === "low") color = "#10B981";
  return (
    <View style={[styles.priorityBadge, { backgroundColor: color }]}>
      <Text style={styles.priorityText}>{priority ?? "none"}</Text>
    </View>
  );
}

/* ---------------- TaskActivityCard (inline) ----------------
   - Renders dropdown-like buttons for Status, Priority, Points, Type, Assigned User
   - Uses Modal for option picking (no external libs)
   - Calls updateTaskActivity API and shows optimistic UI
------------------------------------------------------------ */
export function TaskActivityCard({
  task,
  onUpdated,
  userOptions,
}: {
  task?: Partial<TaskInterface> | null;
  onUpdated?: (field: string, value: any) => void;
  userOptions?: { label: string; value: string }[]; // optional list of users
}) {
  const [local, setLocal] = useState<Partial<TaskInterface> | null>(task ?? null);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalOptions, setModalOptions] = useState<Opt[]>([]);
  const [modalField, setModalField] = useState<string | null>(null);

  useEffect(() => {
    setLocal(task ?? null);
  }, [task]);

  const OPTIONS = {
    status: [
      { value: "pending", label: "Pending" },
      { value: "in_progress", label: "In Progress" },
      { value: "completed", label: "Completed" },
      { value: "canceled", label: "Canceled" },
    ],
    priority: [
      { value: "none", label: "None" },
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "critical", label: "Critical" },
    ],
    points: [
      { value: "No Estimate", label: "No Estimate" },
      { value: "1 Point", label: "1 Point" },
      { value: "2 Point", label: "2 Point" },
      { value: "3 Point", label: "3 Point" },
      { value: "4 Point", label: "4 Point" },
      { value: "5 Point", label: "5 Point" },
    ],
    type: [
      { value: "Task", label: "Task" },
      { value: "Improvement", label: "Improvement" },
      { value: "Research", label: "Research" },
      { value: "Testing", label: "Testing" },
      { value: "Bug", label: "Bug" },
    ],
  };

  const builtUserOptions = useMemo(() => {
    if (userOptions && userOptions.length) return userOptions;
    // fallback: derive from task.projectData.members if available
    const members = (task as any)?.projectData?.members;
    if (Array.isArray(members) && members.length > 0) {
      return members.map((m: any) => ({ value: m._id ?? m.id ?? String(m), label: m.name ?? String(m) }));
    }
    return [{ value: "unassigned", label: "Unassigned" }];
  }, [task, userOptions]);

  const openPicker = (field: string) => {
    setModalField(field);
    if (field === "assignedToUser") setModalOptions(builtUserOptions as any);
    else setModalOptions(OPTIONS[field as keyof typeof OPTIONS] ?? []);
    setModalOpen(true);
  };

  const toastNative = useToast()

  const applyUpdate = async (value: string) => {
    if (!task?._id || !modalField) return;
    const field = modalField;
    setModalOpen(false);
    const prev = (local as any)?.[field];
    setLocal((s) => (s ? { ...s, [field]: value } : s));
    setLoadingField(field);
    try {
      const res = await updateTaskActivity(task._id.toString(), { [field]: value });
      if (res?.success) {
        toastNative?.show?.(`${field} updated`);
        if (res.data?.data) setLocal(res.data.data as any);
        if (onUpdated) onUpdated(field, value);
      } else {
        // rollback
        setLocal((s) => (s ? { ...s, [field]: prev } : s));
        toastNative?.show?.(`Failed to update ${field}`,"danger" );
      }
    } catch (err) {
      setLocal((s) => (s ? { ...s, [field]: prev } : s));
      toastNative?.show?.({ title: `Error updating ${field}`, status: "danger" } as any);
    } finally {
      setLoadingField(null);
    }
  };

  if (!local) return null;

  return (
    <View style={styles.activityCard}>
      <Text style={styles.activityTitle}>Task Activity</Text>

      <View style={styles.activityRow}>
        <TouchableOpacity style={styles.activityCell} onPress={() => openPicker("status")}>
          <Text style={styles.activityLabel}>Status</Text>
          <Text style={styles.activityValue}>{(local as any).status ?? "None"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.activityCell} onPress={() => openPicker("priority")}>
          <Text style={styles.activityLabel}>Priority</Text>
          <Text style={styles.activityValue}>{(local as any).priority ?? "None"}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.activityRow}>
        <TouchableOpacity style={styles.activityCell} onPress={() => openPicker("points")}>
          <Text style={styles.activityLabel}>Points</Text>
          <Text style={styles.activityValue}>{(local as any).points ?? "No Estimate"}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.activityCell} onPress={() => openPicker("type")}>
          <Text style={styles.activityLabel}>Type</Text>
          <Text style={styles.activityValue}>{(local as any).type ?? "Task"}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginTop: 8 }}>
        <TouchableOpacity style={styles.activityCellFull} onPress={() => openPicker("assignedToUser")}>
          <Text style={styles.activityLabel}>Assigned User</Text>
          <Text style={styles.activityValue}>
            {typeof (local as any).assignedToUser === "string"
              ? (local as any).assignedToUser
              : (local as any).assignedToUser?.name ?? "Unassigned"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal for selecting options */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setModalOpen(false)}>
          <View style={styles.modalBox}>
            <ScrollView>
              {modalOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalItem}
                  onPress={() => applyUpdate(opt.value)}
                >
                  <Text style={styles.modalItemLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalClose} onPress={() => setModalOpen(false)}>
              <Text style={{ color: "#fff", fontWeight: "600" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ---------------- Main screen: ProjectTasksScreen ---------------- */
export default function ProjectTasksScreen() {
  
  const params = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { projectId } = (params as any) ?? {};
  const tasksFromStore = useAppSelector((s) => s.task.tasks) as TaskInterface[]; // existing store shape
  const [localTasks, setLocalTasks] = useState<TaskInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<number | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed" | "high">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [pointsFilter, setPointsFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const toastNative = useToast()

  useEffect(() => {
    // initialize local tasks from redux store if present
    if (tasksFromStore && tasksFromStore.length) setLocalTasks(tasksFromStore);
  }, [tasksFromStore]);

  const fetchTasks = useCallback(async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getTasksByProject(projectId.toString());
      if (res?.success) {
        const list = res.data?.data ?? [];
        setLocalTasks(list);
        dispatch(addTasks(list));
      } else {
        setStatus(res.status ?? null);
      }
    } catch (err) {
      console.error("fetchTasks error", err);
      setStatus(500);
    } finally {
      setLoading(false);
    }
  }, [projectId, dispatch]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTodos = useMemo(() => {
    return localTasks
      .filter((task) => {
        if (filter === "active" && task.status === "completed") return false;
        if (filter === "completed" && task.status !== "completed") return false;
        if (filter === "high" && task.priority !== "high") return false;

        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (pointsFilter !== "all" && task.points !== pointsFilter) return false;
        if (typeFilter !== "all" && task.type !== typeFilter) return false;
        if (categoryFilter !== "all" && task.category !== categoryFilter) return false;

        return true;
      })
      .filter((todo) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
          (todo.title ?? "").toLowerCase().includes(term) ||
          (todo.category ?? "").toLowerCase().includes(term) ||
          ((todo.tags ?? []).join(" ") ?? "").toLowerCase().includes(term)
        );
      });
  }, [
    localTasks,
    filter,
    searchTerm,
    statusFilter,
    priorityFilter,
    pointsFilter,
    typeFilter,
    categoryFilter,
  ]);

  const deleteTaskHandler = async (taskId: string) => {
    const ok = await new Promise<boolean>((resolve) =>
      Alert.alert("Delete task", "Delete task permanently? This cannot be undone.", [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Delete", style: "destructive", onPress: () => resolve(true) },
      ])
    );
    if (!ok) return;
    try {
      const res = await deleteTask(taskId);
      if (res?.success) {
        toastNative?.show("Task Deleted", "danger");
        // remove locally
        setLocalTasks((prev) => prev.filter((t) => (t._id ?? t._id) !== taskId));
      } else {
        toastNative?.show?.({ title: "Deletion failed", status: "danger" } as any);
      }
    } catch (err) {
      console.error(err);
      toastNative?.show?.({ title: "Deletion error", status: "danger" } as any);
    }
  };

  const handleActivityUpdate = (field: string, value: any) => {
    // optimistic update in list
    setLocalTasks((prev) => prev.map((t) => ((t._id ?? t._id) === (taskIdFromUpdate as string) ? { ...t } : t)));
    // We don't know which task was updated here; TaskActivityCard calls updateTaskActivity itself.
  };

  // For navigation to task detail
  const goToTaskDetail = (taskId: string) => {
    router.push(`/(routes)/projects/${projectId}/tasks/${taskId}`);
  };

  // small guard UI for forbidden status
  if (status === 403) {
    return (
      <View style={styles.center}>
        <Text style={styles.h1}>403 — Forbidden</Text>
        <Text style={styles.muted}>You don't have permission for this project.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 8 }}>Loading tasks...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Project Tasks</Text>
        <Text style={styles.headerSub}>Project ID: {projectId}</Text>
      </View>

      {/* Filters Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow} contentContainerStyle={{ paddingRight: 12 }}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tasks..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />

        <SmallPicker label="Filter" value={filter} onValueChange={(v) => setFilter(v as any)} options={[
          { value: "all", label: "All" },
          { value: "active", label: "Active" },
          { value: "completed", label: "Completed" },
          { value: "high", label: "High Priority" },
        ]} />

        <SmallPicker label="Status" value={statusFilter} onValueChange={setStatusFilter} options={[
          { value: "all", label: "All" },
          { value: "pending", label: "Pending" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" },
          { value: "canceled", label: "Canceled" },
        ]} />

        <SmallPicker label="Priority" value={priorityFilter} onValueChange={setPriorityFilter} options={[
          { value: "all", label: "All" },
          { value: "none", label: "None" },
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" },
          { value: "critical", label: "Critical" },
        ]} />

        <SmallPicker label="Points" value={pointsFilter} onValueChange={setPointsFilter} options={[
          { value: "all", label: "All" },
          { value: "No Estimate", label: "No Estimate" },
          { value: "1 Point", label: "1 Point" },
          { value: "2 Point", label: "2 Point" },
          { value: "3 Point", label: "3 Point" },
          { value: "4 Point", label: "4 Point" },
          { value: "5 Point", label: "5 Point" },
        ]} />

        <SmallPicker label="Type" value={typeFilter} onValueChange={setTypeFilter} options={[
          { value: "all", label: "All" },
          { value: "Task", label: "Task" },
          { value: "Feature", label: "Feature" },
          { value: "Improvement", label: "Improvement" },
          { value: "Research", label: "Research" },
          { value: "Testing", label: "Testing" },
          { value: "Bug", label: "Bug" },
        ]} />

        <SmallPicker label="Category" value={categoryFilter} onValueChange={setCategoryFilter} options={[
          { value: "all", label: "All" },
          { value: "Frontend", label: "Frontend" },
          { value: "Backend", label: "Backend" },
          { value: "Testing", label: "Testing" },
          { value: "Design", label: "Design" },
        ]} />
      </ScrollView>

      {/* Tasks list */}
      <View style={styles.listWrap}>
        {filteredTodos.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>No tasks found.</Text>
          </View>
        ) : (
          <FlatList
            data={filteredTodos}
            keyExtractor={(item) => (item._id ?? item._id ?? Math.random().toString()) as string}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => goToTaskDetail(item._id ?? (item as any).id)} activeOpacity={0.9}>
                <View style={[styles.taskRow, { borderLeftColor: priorityColorFor(item.priority) }]}>
                  <View style={styles.left}>
                    <StatusIcon status={item.status} />
                  </View>

                  <View style={styles.middle}>
                    <Text style={[styles.taskTitle, item.status === "completed" ? { textDecorationLine: "line-through", color: "#6b7280" } : {}]}>
                      {item.title}
                    </Text>
                    <Text style={styles.taskMeta}>
                      {item.project?.name ?? ""} • {item.assignedToUser ? (typeof item.assignedToUser === "string" ? item.assignedToUser : (item.assignedToUser as any).name) : "Unassigned"}
                    </Text>
                  </View>

                  <View style={styles.right}>
                    <PriorityBadge priority={item.priority} />
                    <TouchableOpacity style={styles.iconBtn} onPress={() => deleteTaskHandler(item._id ?? (item as any).id)}>
                      <Text style={{ color: "#ef4444" }}>🗑️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => goToTaskDetail(item._id ?? (item as any).id)}>
                      <Text>➡️</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            contentContainerStyle={{ paddingBottom: 120 }}
          />
        )}
      </View>

      {/* Small activity card for selected task if any */}
      {/* For demo show first task's activity card; adapt as needed */}
      {filteredTodos.length > 0 ? (
        <TaskActivityCard task={filteredTodos[0] as any} onUpdated={handleActivityUpdate} />
      ) : (
        <View style={[styles.activityCard, { marginTop: 12 }]}>
          <Text style={styles.activityTitle}>Activity</Text>
          <Text style={styles.muted}>None</Text>
        </View>
      )}
    </View>
  );
}

/* ---------------- Small reusable components ---------------- */
function SmallPicker({ label, value, onValueChange, options }: { label: string; value: string | any; onValueChange: (v: string) => void; options: Opt[] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.smallPickerWrap}>
      <TouchableOpacity style={styles.smallPicker} onPress={() => setOpen(true)}>
        <Text style={styles.smallPickerText}>{label}: </Text>
        <Text style={styles.smallPickerValue}>{options.find((o) => o.value === value)?.label ?? (value ?? "All")}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.modalBoxSmall}>
            <ScrollView>
              {options.map((opt) => (
                <TouchableOpacity key={opt.value} style={styles.modalItem} onPress={() => { onValueChange(opt.value); setOpen(false); }}>
                  <Text style={styles.modalItemLabel}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

/* ---------------- Styles ---------------- */
const screenW = Math.min(Dimensions.get("window").width, 900);

const styles = StyleSheet.create({
  container: { flex: 1, padding: 12, backgroundColor: "#fff" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  h1: { fontSize: 20, fontWeight: "700" },
  muted: { color: "#6b7280" },

  header: { paddingVertical: 12, paddingHorizontal: 6, borderBottomWidth: 1, borderColor: "#e5e7eb" },
  headerTitle: { fontSize: 20, fontWeight: "700" },
  headerSub: { color: "#6b7280", marginTop: 4 },

  filtersRow: { marginTop: 12, marginBottom: 12 },
  searchInput: { minWidth: 200, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, marginRight: 8, backgroundColor: "#fff" },
  smallPickerWrap: { marginRight: 8 },
  smallPicker: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, minWidth: 120, backgroundColor: "#fff", flexDirection: "row", alignItems: "center" },
  smallPickerText: { color: "#374151", fontSize: 13, marginRight: 6 },
  smallPickerValue: { fontWeight: "600", fontSize: 13 },

  listWrap: { flex: 1, marginTop: 6 },

  taskRow: { flexDirection: "row", alignItems: "center", padding: 12, backgroundColor: "#fff", borderRadius: 8, borderLeftWidth: 6, borderColor: "#ddd", marginVertical: 4, elevation: 0 },
  left: { width: 36, alignItems: "center", justifyContent: "center" },
  middle: { flex: 1 },
  right: { width: 110, flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },

  taskTitle: { fontSize: 16, fontWeight: "700" },
  taskMeta: { color: "#6b7280", marginTop: 4 },

  icon: { fontSize: 18 },

  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignItems: "center", justifyContent: "center", marginRight: 8 },
  priorityText: { color: "#fff", fontWeight: "700", fontSize: 12 },

  iconBtn: { paddingHorizontal: 8, paddingVertical: 6 },

  activityCard: { marginTop: 12, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", backgroundColor: "#fff" },
  activityTitle: { fontWeight: "700", marginBottom: 8 },
  activityRow: { flexDirection: "row", justifyContent: "space-between" },
  activityCell: { flex: 1, padding: 8, borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 8, marginRight: 8 },
  activityCellFull: { padding: 8, borderWidth: 1, borderColor: "#f3f4f6", borderRadius: 8 },
  activityLabel: { color: "#6b7280", fontSize: 12 },
  activityValue: { fontWeight: "700", marginTop: 6 },

  modalOverlay: { flex: 1, backgroundColor: "#00000066", alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  modalBox: { width: Math.min(screenW - 48, 520), maxHeight: 420, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" as any },
  modalBoxSmall: { width: Math.min(screenW - 48, 340), maxHeight: 420, backgroundColor: "#fff", borderRadius: 12, overflow: "hidden" as any },
  modalItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  modalItemLabel: { fontSize: 15 },

  modalClose: { padding: 12, backgroundColor: "#111827", alignItems: "center" },
});
/* ---------------- Utilities ---------------- */
function priorityColorFor(p?: TaskInterface["priority"]) {
  if (p === "critical") return "#7C3AED";
  if (p === "high") return "#EF4444";
  if (p === "medium") return "#F59E0B";
  if (p === "low") return "#10B981";
  return "#9CA3AF";
}

// placeholder variable used in update optimism (no-op here; present to satisfy TS if referenced)
const taskIdFromUpdate: string | null = null;
