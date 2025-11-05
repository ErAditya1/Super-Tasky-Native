// components/SwipeableTaskCard.tsx
import React, { useRef, useEffect, useCallback } from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import TaskCard from "./TaskCard";
import { swipeController } from "./swipeController";
import { TaskInterface, updateTask } from "@/store/task/taskSlice";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addProjects } from "@/store/project2/projectSlice"; // <-- adjust import to your slices
// If updateTask action actually lives in taskSlice, import from there:
// import { updateTask } from "@/store/task/taskSlice";

import { updateTaskActivity, getTaskById } from "@/lib/api/task";

type Props = {
  task: TaskInterface;
  theme: any;
  onPress?: () => void;
  onEdit?: () => void;
  onToggleComplete?: () => void; // still supported (custom override)
  borderColor?: string;
  renderLeft?: (task: TaskInterface) => React.ReactNode;
  renderRight?: (task: TaskInterface) => React.ReactNode;
  /** optional toast with .show(message, type) */
  toast?: { show?: (msg: string, type?: "success" | "danger" | "info") => void };
};

export default function SwipeableTaskCard({
  task,
  theme,
  onPress,
  onEdit,
  borderColor,
  renderLeft,
  renderRight,
  toast,
}: Props) {
  const ref = useRef<any>(null);
  const dispatch = useAppDispatch();
  const projects = useAppSelector((s: any) => s?.project?.projects ?? []); // adjust selector

  useEffect(() => {
    return () => {
      if (swipeController.getOpen() === ref.current) swipeController.setOpen(null);
    };
  }, []);

  const showToast = useCallback(
    (msg: string, type: "success" | "danger" | "info" = "info") => {
      if (toast?.show) return toast.show(msg, type);
      // optional: console.warn(msg);
    },
    [toast]
  );

  const updateProjectsWithTask = useCallback(
    (newTask: any) => {
      const targetProjectId =
        newTask.project?._id ?? newTask.project ?? (task as any)?.project?._id ?? (task as any)?.project;

      const updatedProjects = projects.map((p: any) => {
        if (p._id !== targetProjectId) return p;

        const tasksArr = Array.isArray(p.tasks) ? p.tasks : [];
        let changed = false;

        const nextTasks = tasksArr.map((t: any) => {
          if (t._id !== newTask._id) return t;
          changed = true;
          return { ...t, ...newTask };
        });

        // If the task wasn't in the array, you can choose to insert it
        // return changed ? { ...p, tasks: nextTasks } : { ...p, tasks: [...tasksArr, newTask] };
        return changed ? { ...p, tasks: nextTasks } : p;
      });

      dispatch(addProjects(updatedProjects));
    },
    [dispatch, projects, task]
  );

  const handleToggle = useCallback(async () => {
   

    const current = (task as any).status;
    const nextStatus = current === "completed" ? "pending" : "completed";

    // Close the swipe row immediately for snappy UX
    ref.current?.close?.();

    try {
      // 1) Call API to update status
      const res = await updateTaskActivity(String(task._id), { status: nextStatus });

      if (res?.success) {
        // 2) Prefer a clean copy of the task from server
        const rs = await getTaskById(String(task._id));
        if (rs?.success && rs.data?.data) {
          const newTask = rs.data.data;

          // 3) Update task in Redux (adjust action import to your real one)
          dispatch(updateTask({ taskId: task._id, updatedTask: newTask }));

          // 4) Update project.tasks safely
          updateProjectsWithTask(newTask);
        }

        showToast(res.data?.message ?? (nextStatus === "completed" ? "Marked as completed" : "Moved to pending"), "success");
      } else {
        showToast(res?.message ?? "Failed to update status", "danger");
      }
    } catch (err: any) {
      showToast(err?.message ?? "Error updating status", "danger");
    }
  }, [ task, dispatch, updateProjectsWithTask, showToast]);

  const defaultRight = () => (
    <Pressable
      onPress={() => {
        onEdit?.();
        ref.current?.close?.();
      }}
      style={[styles.action, { backgroundColor: theme.primary }]}
    >
      <Ionicons name="create" size={18} color={theme.primaryForeground} />
      <Text style={[styles.actionText, { color: theme.primaryForeground }]}>Edit</Text>
    </Pressable>
  );

  const defaultLeft = () => {
    const isDone = (task as any).status === "completed";
    return (
      <Pressable
        onPress={handleToggle}
        style={[styles.action, { backgroundColor: theme.secondary }]}
      >
        <Ionicons name={isDone ? "reload" : "checkmark-done"} size={18} color={theme.secondaryForeground} />
        <Text style={[styles.actionText, { color: theme.secondaryForeground }]}>{isDone ? "Undo" : "Done"}</Text>
      </Pressable>
    );
  };

  return (
    <GestureHandlerRootView>
      <Swipeable
        ref={ref}
        renderRightActions={() => (renderRight ? renderRight(task) : defaultRight())}
        renderLeftActions={() => (renderLeft ? renderLeft(task) : defaultLeft())}
        overshootLeft={false}
        overshootRight={false}
        onSwipeableOpen={() => {
          const prev = swipeController.getOpen();
          if (prev && prev !== ref.current && typeof prev.close === "function") {
            try { prev.close(); } catch {}
          }
          swipeController.setOpen(ref.current);
        }}
        onSwipeableClose={() => {
          if (swipeController.getOpen() === ref.current) swipeController.setOpen(null);
        }}
      >
        <TaskCard task={task} onPress={onPress} theme={theme} borderColor={borderColor} />
      </Swipeable>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  action: { width: 100, alignItems: "center", justifyContent: "center", padding: 12 },
  actionText: { marginTop: 6, fontWeight: "700" },
});
