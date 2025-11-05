// components/TaskCard.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import Avatar from "@/components/Avatar";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { TaskInterface, insertFavouriteTask, updateTask } from "@/store/task/taskSlice";

import {
  favouriteHandler,
  repeatHandler,
  archieveHandler,
  deleteTask as deleteTaskApi,
  updateTaskActivity,
  getTaskById,
} from "@/lib/api/task";
import { useToast } from "./Toast";
import { addProjects, updateProject } from "@/store/project2/projectSlice";

/* =========================================================
   TaskCard
   ========================================================= */
type TaskCardProps = {
  task: TaskInterface;
  onPress?: () => void;
  onLongPress?: () => void;
  onOpenActivity?: (task: TaskInterface) => void;
  /** parent receives (taskId, field, value) must return true/false */
  onApply?: (taskId: string, field: string, value: any) => Promise<boolean>;
  /** optional callback invoked when activity sheet finishes an update and returns the updated task object */
  onActivityUpdated?: (updatedTask: Partial<TaskInterface>) => void;
  theme: any;
  borderColor?: string;
  style?: any;
};

export default function TaskCard({
  task,
  onPress,
  onLongPress,
  onOpenActivity,
  onActivityUpdated,
  theme: themeProp,
  borderColor = "transparent",
  style,
}: TaskCardProps) {
  const priorityColorMap: Record<string, string> = {
    none: "#A0A0A0",
    low: "#4ECCA3",
    medium: "#FFB400",
    high: "#FF4B4B",
    critical: "#B300FF",
  };
  const priorityColor = priorityColorMap[(task as any).priority ?? "none"];

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

  const project = (task as any).project ?? null;
  const title = String((task as any).title ?? "");
  const dueDate = (task as any).dueDate ?? null;
  const assignee = (task as any).assignedToUser ?? (task as any).assignedTo ?? null;
  const tags = Array.isArray((task as any).tags) ? ((task as any).tags as string[]) : [];
  const showTags = tags.length > 0 && !!tags[0];

  const [sheetVisible, setSheetVisible] = useState(false);
  const [localTask, setLocalTask] = useState<Partial<TaskInterface> | null>(task);

  useEffect(() => setLocalTask(task), [task]);

  const openSheet = () => {
    if (onOpenActivity) {
      onOpenActivity(task);
      return;
    }
    setSheetVisible(true);
    AccessibilityInfo.announceForAccessibility(`${task.title} opened`);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={onPress}
        onLongPress={() => {
          if (onLongPress) onLongPress();
          openSheet();
        }}
        accessibilityRole="button"
        accessibilityLabel={`Open task ${title}`}
        style={[
          styles.card,
          { borderLeftColor: borderColor, borderColor: themeProp.border, backgroundColor: themeProp.card },
          style,
        ]}
      >
        <View style={styles.left}>
          <View style={[styles.priorityDot, { backgroundColor: priorityColor, shadowColor: priorityColor }]} />
        </View>

        <View style={styles.body}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text numberOfLines={1} style={[styles.title, { color: themeProp.cardForeground }]}>
              {title}
            </Text>

            {project && (
              <View style={[styles.projectChip, { backgroundColor: project?.color ? `${project.color}22` : themeProp.muted }]} accessibilityLabel={`Project ${project?.name ?? ""}`}>
                <Text style={{ color: project?.color ?? themeProp.mutedForeground, fontWeight: "600" }}>
                  {String(project?.name ?? project?.title ?? "")}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 8 }}>
            <Text style={[styles.meta, { color: themeProp.mutedForeground }]}>
              {dueDate ? formatDate(dueDate) : "No due date"}{" "}
            </Text>

            <View style={{ width: 12 }} />

            {assignee ? <Avatar user={assignee} /> : null}

            <View style={{ flex: 1 }} />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {showTags ? tags.slice(0, 3).map((tag) => (
                <View key={tag} style={[styles.tag, { borderColor: themeProp.border }]}>
                  <Text style={{ fontSize: 12, color: themeProp.cardForeground }}>{tag} </Text>
                </View>
              )) : null}
            </View>
          </View>
        </View>
      </TouchableOpacity>

      <TaskActivitySheet
        visible={sheetVisible}
        task={localTask}
        onClose={() => setSheetVisible(false)}
        
        onUpdated={(updated: Partial<TaskInterface>) => {
          // update local task and notify optional parent handler
          if (updated) {

            setLocalTask(updated);
            if (onActivityUpdated) onActivityUpdated(updated);
          }
        }}
      />
    </>
  );
}

/* =========================================================
   TaskActivitySheet (dynamic assignees + toasts + auto-update)
   ========================================================= */
type PickerOpt = { value: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };
type UserOpt = { value: string; label: string; avatar?: string };

export function TaskActivitySheet({
  visible,
  task,
  onClose,
  userOptions,
  onUpdated, // optional callback to notify parent with updated task object
}: {
  visible: boolean;
  task?: any;
  onClose: () => void;
  userOptions?: UserOpt[];
  onUpdated?: (updatedTask: Partial<TaskInterface>) => void;
}) {
  const { isDark } = useThemeToggle() as any;
  const currentTheme = theme[isDark ? "dark" : "light"];
  const translateY = useRef(new Animated.Value(600)).current;
  const [local, setLocal] = useState<Partial<TaskInterface> | null>(task ?? null);
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const toast = useToast()

  const projectFromRedux = useAppSelector((s: any) =>
    (s?.project?.projects ?? []).find((p: any) => (p._id ?? p.id) === (task?.project?._id ?? task?.project))
  );
  const {projects} = useAppSelector(s=>s.project)

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
    { value: "2 Point", label: "2 Points`", icon: "pricetag-outline", color: "#2563eb" },
    { value: "3 Point", label: "3 Points", icon: "pricetag-outline", color: "#7c3aed" },
    { value: "4 Point", label: "4 Points", icon: "pricetag-outline", color: "#7c3aed" },
    { value: "5 Point", label: "5 Points", icon: "pricetag-outline", color: "#b91c1c" },
  ];
  const TYPE: PickerOpt[] = [
    { value: "Task", label: "Task", icon: "list-outline", color: "#a16207" },
    { value: "Improvement", label: "Improvement", icon: "trending-up-outline", color: "#047857" },
    { value: "Research", label: "Research", icon: "flask-outline", color: "#2563eb" },
    { value: "Testing", label: "Testing", icon: "search-outline", color: "#0f766e" },
    { value: "Bug", label: "Bug", icon: "bug-outline", color: "#b91c1c" },
  ];

  
  // toast helper (falls back to Alert)
  const showToast = useCallback(
    (msg: string, type: "success" | "danger" | "normal" = "normal") => {
      if (toast?.show) toast.show(msg, type);
      else {
        if (type === "danger") Alert.alert("Error", msg);
        else Alert.alert("Info", msg);
      }
    },
    [toast]
  );

  // dynamic assignee list
  const assignedUserOpts = React.useMemo<UserOpt[]>(() => {
    if (userOptions?.length) return userOptions;

    const membersFromTask = (task as any)?.projectData?.members;
    const membersFromRedux = (projectFromRedux as any)?.members;

    const raw = Array.isArray(membersFromTask) ? membersFromTask : Array.isArray(membersFromRedux) ? membersFromRedux : [];

    if (raw.length) {
      return raw.map((m: any) => {
        if (!m) return { value: "unknown", label: "Unknown" };
        if (typeof m === "string") return { value: m, label: m };
        const id = m._id ?? m.id ?? m.username ?? m.name ?? "unknown";
        const name = m.name ?? m.username ?? String(id);
        const avatar = m.avatar?.url || m.photo?.url || undefined;
        return { value: String(id), label: String(name), avatar };
      });
    }

    // fallback
    return [
      { value: "unassigned", label: "Unassigned" },
      { value: "ravi", label: "Ravi Sharma" },
      { value: "amit", label: "Amit Verma" },
    ];
  }, [userOptions, task, projectFromRedux]);

  useEffect(() => setLocal(task ?? null), [task]);

  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 8 }).start();
    } else {
      Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start();
    }
  }, [visible, translateY]);

  const getListForKey = (key: string): PickerOpt[] => {
    switch (key) {
      case "status": return STATUS;
      case "priority": return PRIORITY;
      case "points": return POINTS;
      case "type": return TYPE;
      default: return [];
    }
  };
  const findOpt = (key: string, value?: string | null): PickerOpt | undefined => getListForKey(key).find((o) => String(o.value) === String(value));

  // ---------- APPLY: first try parent onApply, otherwise call updateTaskActivity directly ----------
  const apply = async (field: string, value: any) => {
    if (!local?._id) return;
    const prev = (local as any)[field];
    setLocal((s) => (s ? { ...s, [field]: value } : s));
    setLoadingField(field);

    try {
     
      // 1) perform the update here using updateTaskActivity API
      const payload: any = { [field]: value };
      const res = await updateTaskActivity(String(local._id), payload);

      if (res?.success) {
        // prefer res.data.data but handle a few shapes
        const updated = res.data?.data ?? res.data ?? null;
        if (updated) {
          
          const rs = await getTaskById(local._id)

          if(rs.success){
            const newTask = rs.data.data
            // if (onUpdated) onUpdated(newTask);
            dispatch(updateTask({taskId:local._id, updatedTask:newTask}))
                      // newTask: the updated task object
            // task:     the original task (only needed if you don't trust newTask.project)
            const targetProjectId =
              newTask.project?._id ?? newTask.project ?? task?.project?._id ?? task?.project;

            const updatedProjects = projects.map((p) => {
              if (p._id !== targetProjectId) return p;

              const tasks = Array.isArray(p.tasks) ? p.tasks : [];
              let changed = false;

              const nextTasks = tasks.map((t) => {
                if (t._id !== newTask._id) return t;
                changed = true;
                // merge keeps other task props; replace if you prefer: `return newTask`
                return { ...t, ...newTask };
              });

              // If nothing changed (task not found), return original project to preserve referential equality
              if (!changed) return p;

              return { ...p, tasks: nextTasks };
            });

            dispatch(addProjects(updatedProjects));


          }

          // notify parent (TaskCard) that the task changed

          

        }
        showToast(res.data?.message ?? `${field} updated`, "success");
      } else {
        setLocal((s) => (s ? { ...s, [field]: prev } : s));
        showToast(res?.message ?? `Failed to update ${field}`, "danger");
      }
    } catch (err: any) {
      setLocal((s) => (s ? { ...s, [field]: prev } : s));
      showToast(err?.message ?? `Error updating ${field}`, "danger");
    } finally {
      setLoadingField(null);
      setPickerOpenFor(null);
    }
  };

  // quick actions copied from your earlier code (keeps same behavior)
  const handleToggleFavourite = useCallback(async () => {
    if (!local?._id) return;
    const id = local._id;
    const next = !(local as any)?.isFavourite;
    setLocal((s) => (s ? { ...s, isFavourite: next } : s));
    setActionLoading("fav");
    try {
      const res = await favouriteHandler(String(id));
      if (!res?.success) throw new Error(res?.message || "Failed to toggle favourite");
      if (res.data?.data) dispatch(insertFavouriteTask(res.data.data));
      showToast(next ? "Added to favourites" : "Removed from favourites", "success");
      if (onUpdated) onUpdated(res.data?.data ?? { _id: id, isFavourite: next } as any);
    } catch (err: any) {
      setLocal((s) => (s ? { ...s, isFavourite: !next } : s));
      showToast(err?.message || "Server error", "danger");
    } finally {
      setActionLoading(null);
    }
  }, [local, dispatch, showToast, onUpdated]);

  const handleToggleRepeat = useCallback(async () => {
    if (!local?._id) return;
    const id = local._id;
    const next = !(local as any)?.repeatDaily;
    setLocal((s) => (s ? { ...s, repeatDaily: next } : s));
    setActionLoading("repeat");
    try {
      const res = await repeatHandler(String(id));
      if (!res?.success) throw new Error(res?.message || "Failed to toggle repeat");
      showToast(next ? "Repeat enabled" : "Repeat disabled", "success");
      if (onUpdated) onUpdated(res.data?.data ?? { _id: id, repeatDaily: next } as any);
    } catch (err: any) {
      setLocal((s) => (s ? { ...s, repeatDaily: !next } : s));
      showToast(err?.message || "Server error", "danger");
    } finally {
      setActionLoading(null);
    }
  }, [local, showToast, onUpdated]);

  const handleArchive = useCallback(async () => {
    if (!local?._id) return;
    const id = local._id;
    Alert.alert("Archive task", "Archive task will be deleted after thirty days! Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: async () => {
          setActionLoading("archive");
          try {
            const res = await archieveHandler(String(id));
            if (!res?.success) throw new Error(res?.message || "Archive failed");
            showToast(res.data?.message ?? "Task archived", "success");
            onClose();
            if (onUpdated) onUpdated(res.data?.data ?? { _id: id, isArchieved: true } as any);
          } catch (err: any) {
            showToast(err?.message || "Server error", "danger");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }, [local, onClose, showToast, onUpdated]);

  const handleDelete = useCallback(async () => {
    if (!local?._id) return;
    const id = local._id;
    Alert.alert("Delete task", "Delete task permanently? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setActionLoading("delete");
          try {
            const res = await deleteTaskApi(String(id));
            if (!res?.success) throw new Error(res?.message || "Delete failed");
            showToast(res.data?.message ?? "Task deleted", "success");
            onClose();
            if (onUpdated) onUpdated(null as any); // parent can remove task from list
          } catch (err: any) {
            showToast(err?.message || "Server error", "danger");
          } finally {
            setActionLoading(null);
          }
        },
      },
    ]);
  }, [local, onClose, showToast, onUpdated]);

  const handleFocusMode = useCallback(() => {
    if (!local?._id) return;
    const projId =
      task?.project?._id ??
      task?.project ??
      (local as any)?.project?._id ??
      (local as any)?.project ??
      "unknown";
    router.push(`/(routes)/projects/${projId}/tasks/${local._id}/focus`);
    onClose();
  }, [local, onClose, router, task]);

  if (!visible || !task) return null;

  const statusEmoji = (status?: string) => {
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
  };

  const renderOptRow = (opt: PickerOpt, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity key={opt.value} onPress={onPress} style={[styles.pickerItem, { borderBottomColor: currentTheme.border }]}>
      <View style={[styles.optIconWrap, { backgroundColor: opt.color + "22" }]}>
        <Ionicons name={opt.icon} size={18} color={opt.color} />
      </View>
      <Text style={{ color: currentTheme.cardForeground, flex: 1 }}>{opt.label}</Text>
      {isSelected ? <Ionicons name="checkmark" size={18} color={currentTheme.primary} /> : null}
    </TouchableOpacity>
  );

  const renderAssigneeRow = (member: UserOpt, isSelected: boolean, onPress: () => void) => (
    <TouchableOpacity key={member.value} onPress={onPress} style={[styles.pickerItem, { borderBottomColor: currentTheme.border }]}>
      <Avatar size={28} user={{ _id: member.value, name: member.label, avatar: { url: member.avatar } } as any} />
      <Text style={{ color: currentTheme.cardForeground, marginLeft: 10, flex: 1 }}>{member.label}</Text>
      {isSelected ? <Ionicons name="checkmark" size={18} color={currentTheme.primary} /> : null}
    </TouchableOpacity>
  );

  const pillItems: Array<{ key: "status" | "priority" | "points" | "type" | "assignedToUser"; label: string; icon?: PickerOpt }> = [
    { key: "status", label: `Status: ${String((local as any)?.status ?? task.status ?? "None")}`, icon: findOpt("status", (local as any)?.status ?? task.status) },
    { key: "priority", label: `Priority: ${String((local as any)?.priority ?? task.priority ?? "None")}`, icon: findOpt("priority", (local as any)?.priority ?? task.priority) },
    { key: "points", label: `Points: ${String((local as any)?.points ?? task.points ?? "No Estimate")}`, icon: findOpt("points", (local as any)?.points ?? task.points) },
    { key: "type", label: `Type: ${String((local as any)?.type ?? task.type ?? "Task")}`, icon: findOpt("type", (local as any)?.type ?? task.type) },
    { key: "assignedToUser", label: "Assignee: " + (typeof (local as any)?.assignedToUser === "string" ? (local as any)?.assignedToUser : (local as any)?.assignedToUser?.name ?? (typeof task.assignedToUser === "string" ? task.assignedToUser : task.assignedToUser?.name) ?? "Unassigned") }
  ];

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent>
      <Pressable style={styles.sheetOverlay} onPress={onClose} accessible={false} />
      <Animated.View style={[styles.sheet, { backgroundColor: currentTheme.card, borderColor: currentTheme.border, transform: [{ translateY }] }]} accessibilityViewIsModal accessibilityLiveRegion="polite">
        {/* Grabber + Header */}
        <View style={styles.sheetGrab} />
        <View style={styles.sheetHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <Avatar user={(task as any).user ?? (local as any).assignedToUser ?? (task as any).assignedToUser} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sheetTitle, { color: currentTheme.cardForeground }]} numberOfLines={1}>{task.title}</Text>
              <Text style={{ color: currentTheme.mutedForeground, fontSize: 12 }}>{task.project?.name ?? projectFromRedux?.name ?? "Project"} • {statusEmoji((local as any)?.status ?? task.status)}</Text>
            </View>
          </View>

          <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close task details" style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={currentTheme.mutedForeground} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ padding: 12 }} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Primary actions */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <Pill loading={actionLoading === "fav"} icon={(local as any)?.isFavourite ? "star" : "star-outline"} label={(local as any)?.isFavourite ? "Unfavourite" : "Favourite"} onPress={handleToggleFavourite} theme={currentTheme} />
            <Pill loading={actionLoading === "repeat"} icon="repeat-outline" label={(local as any)?.repeatDaily ? "Repeating" : "Repeat"} onPress={handleToggleRepeat} theme={currentTheme} />
            <Pill loading={actionLoading === "archive"} icon="archive-outline" label="Archive" onPress={handleArchive} theme={currentTheme} />
          </View>

          {/* Focus + Delete */}
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
            <TouchableOpacity onPress={handleFocusMode} style={[styles.actionPill, { backgroundColor: currentTheme.primary, borderColor: currentTheme.primary }]}>
              <Ionicons name="time-outline" size={18} color={currentTheme.primaryForeground} />
              <Text style={{ color: currentTheme.primaryForeground, marginLeft: 8, fontWeight: "700" }}>Focus Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleDelete} style={[styles.actionPillDanger, { borderColor: currentTheme.border }]}>
              {actionLoading === "delete" ? <ActivityIndicator size="small" color={currentTheme.destructive || "#ff3b30"} /> : <Ionicons name="trash-outline" size={18} color={currentTheme.destructive || "#ff3b30"} />}
              <Text style={{ color: currentTheme.destructive || "#ff3b30", marginLeft: 8, fontWeight: "700" }}>Delete</Text>
            </TouchableOpacity>
          </View>

          {/* Quick overview */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
            <InfoCell label="Due" value={task.dueDate ? new Date(task.dueDate).toLocaleString() : "No due date"} theme={currentTheme} />
            <InfoCell label="Created" value={task.createdAt ? new Date(task.createdAt).toLocaleDateString() : "-"} theme={currentTheme} />
            <InfoCell label="Points" value={(local as any)?.points ?? task.points ?? "No Estimate"} theme={currentTheme} />
          </View>

          {/* Editable fields with icons */}
          <SectionLabel text="Quick edit" color={currentTheme.mutedForeground} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {pillItems.map((f) => (
              <TouchableOpacity key={f.key} onPress={() => setPickerOpenFor(f.key)} style={[styles.pill, { backgroundColor: currentTheme.muted, borderColor: currentTheme.border }]} accessibilityLabel={`Edit ${f.key}`}>
                {f.icon ? <View style={[styles.pillIconBubble, { backgroundColor: f.icon.color + "22" }]}><Ionicons name={f.icon.icon} size={16} color={f.icon.color} /></View> : (f.key === "assignedToUser" ? <View style={[styles.pillIconBubble, { backgroundColor: currentTheme.popover }]}><Ionicons name="person-outline" size={16} color={currentTheme.mutedForeground} /></View> : null)}
                <Text style={{ color: currentTheme.mutedForeground, fontWeight: "700", flexShrink: 1 }}>{f.label}</Text>
                {loadingField === f.key && <ActivityIndicator style={{ marginLeft: 8 }} size="small" color={currentTheme.primary} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Description */}
          <View style={{ marginTop: 16 }}>
            <SectionLabel text="Description" color={currentTheme.mutedForeground} />
            <View style={[styles.cardSmall, { backgroundColor: currentTheme.popover, borderColor: currentTheme.border }]}>
              <Text style={{ color: currentTheme.popoverForeground }}>{task.description ?? "No description"}</Text>
            </View>
          </View>

          {/* Picker modal */}
          <Modal visible={Boolean(pickerOpenFor)} transparent animationType="fade" onRequestClose={() => setPickerOpenFor(null)}>
            <Pressable style={styles.sheetPickerOverlay} onPress={() => setPickerOpenFor(null)} />
            <View style={[styles.pickerBox, { backgroundColor: currentTheme.card, borderColor: currentTheme.border }]}>
              <View style={[styles.pickerHeader, { borderBottomColor: currentTheme.border }]}>
                <Text style={{ color: currentTheme.cardForeground, fontWeight: "700", fontSize: 16 }}>
                  {pickerOpenFor === "assignedToUser" ? "Assign to" : pickerOpenFor === "status" ? "Change status" : pickerOpenFor === "priority" ? "Change priority" : pickerOpenFor === "points" ? "Estimate points" : "Change type"}
                </Text>
                <TouchableOpacity onPress={() => setPickerOpenFor(null)} style={{ padding: 6 }}>
                  <Ionicons name="close" size={20} color={currentTheme.mutedForeground} />
                </TouchableOpacity>
              </View>

              <ScrollView>
                {pickerOpenFor === "assignedToUser"
                  ? assignedUserOpts.map((u) => {
                      const currentVal = typeof (local as any)?.assignedToUser === "string" ? (local as any)?.assignedToUser : (local as any)?.assignedToUser?._id ?? (typeof task.assignedToUser === "string" ? task.assignedToUser : task.assignedToUser?._id);
                      const isSel = String(currentVal ?? "") === String(u.value);
                      return renderAssigneeRow(u, isSel, () => apply("assignedToUser", u.value));
                    })
                  : getListForKey(pickerOpenFor ?? "status").map((opt) => {
                      const current = (local as any)?.[pickerOpenFor ?? "status"] ?? (task as any)?.[pickerOpenFor ?? "status"];
                      const isSel = String(current) === opt.value;
                      return renderOptRow(opt, isSel, () => apply(pickerOpenFor ?? "status", opt.value));
                    })}
              </ScrollView>

              <TouchableOpacity style={[styles.pickerClose, { backgroundColor: currentTheme.primary }]} onPress={() => setPickerOpenFor(null)}>
                <Text style={{ color: currentTheme.primaryForeground, fontWeight: "700" }}>Close</Text>
              </TouchableOpacity>
            </View>
          </Modal>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

/* =========================================================
   Presentational helpers
   ========================================================= */
function Pill({ loading, icon, label, onPress, theme }: { loading?: boolean; icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; theme: any; }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.actionPill, { backgroundColor: theme.popover, borderColor: theme.border }]}>
      {loading ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name={icon} size={18} color={theme.cardForeground} />}
      <Text style={{ color: theme.cardForeground, marginLeft: 8, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

function InfoCell({ label, value, theme }: { label: string; value: string; theme: any; }) {
  return (
    <View>
      <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: theme.cardForeground, fontWeight: "700" }}>{value}</Text>
    </View>
  );
}

function SectionLabel({ text, color }: { text: string; color: string }) {
  return <Text style={{ color, fontSize: 12, marginBottom: 6 }}>{text}</Text>;
}

/* =========================================================
   Styles (single unified block)
   ========================================================= */
const styles = StyleSheet.create({
  // Card
  card: {
    flexDirection: "row",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginHorizontal: 12,
    shadowOpacity: Platform.OS === "ios" ? 0.06 : 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  left: { width: 14, alignItems: "center", marginRight: 12 },
  priorityDot: { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  body: { flex: 1 },
  title: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12 },
  projectChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  tag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginLeft: 6, borderWidth: 1 },

  // Sheet overlay + container
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    maxHeight: "86%",
    overflow: "hidden",
  },
  sheetGrab: { width: 48, height: 4, backgroundColor: "#999", opacity: 0.65, borderRadius: 4, alignSelf: "center", marginTop: 8, marginBottom: 8 },
  sheetHeader: { paddingHorizontal: 12, paddingVertical: 8, flexDirection: "row", alignItems: "center" },
  sheetTitle: { fontSize: 16, fontWeight: "700", paddingLeft: 2 },
  closeBtn: { padding: 8, marginLeft: 8 },

  // Actions
  actionPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flex: 1 },
  actionPillDanger: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, flex: 1 },

  // Quick edit pill
  pill: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 16, borderWidth: 1, marginRight: 8, marginTop: 8, flexDirection: "row", alignItems: "center", gap: 8 },
  pillIconBubble: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },

  cardSmall: { padding: 12, borderRadius: 8, borderWidth: 1 },

  // Picker
  sheetPickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)" },
  pickerBox: { position: "absolute", left: 12, right: 12, bottom: 40, maxHeight: "56%", borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  pickerHeader: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerItem: { paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", alignItems: "center" },
  pickerClose: { padding: 12, alignItems: "center", justifyContent: "center" },
  optIconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginRight: 10 },
});
