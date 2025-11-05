// app/(tabs)/task/[taskId].tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  Dimensions,
  Modal,
} from "react-native";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import * as Sharing from "expo-sharing";

import { theme as colorTokens } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppDispatch } from "@/store/hooks";
import {
  addComment,
  archieveHandler,
  deleteTask,
  favouriteHandler,
  getTaskDashboard,
  lastSeenHandler,
  repeatHandler,
  uploadAttachment,
} from "@/lib/api/task";
import Avatar from "@/components/Avatar";
import { addCurrentTask, insertFavouriteTask, TaskInterface } from "@/store/task/taskSlice";
import { TaskActivitySheet } from "@/components/TaskCard";

type UserPreview = {
  _id: string;
  name: string;
  avatar?: { url: string };
  username?: string;
};

type ProjectType = {
  name?: string;
  members?: UserPreview[];
};

type CommentType = {
  _id: string;
  text: string;
  createdAt: string;
  user?: string;
  commentUser?: UserPreview;
};

type AttachmentType = {
  _id: string;
  url?: string;
  fileUrl?: string;
  type?: string;
  createdAt?: string;
  attachmentUser?: UserPreview;
  name?: string;
  size?: number;
};

type TeamData = {
  _id: string;
  name?: string;
  description?: string;
};

type TaskType = {
  _id: string;
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  points?: string;
  type?: string;
  assignedToUser?: UserPreview | string;
  assignedToTeam?: TeamData | string;
  project?: string;
  dueDate?: string | null;
  tags?: string[];
  isFocused?: boolean;
  repeatDaily?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastSeen?: string;
  isFavourite?: boolean;
  isArchieved?: boolean;

  comments?: CommentType[];
  commentsCount?: number;
  latestComment?: CommentType;

  attachments?: AttachmentType[];
  attachmentsCount?: number;

  teamData?: TeamData;
  projectData?: ProjectType;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function TaskDetailsScreen() {
  const { taskId, projectId } = useGlobalSearchParams() as {
    taskId?: string;
    projectId?: string;
  };
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();

  const { isDark } = useThemeToggle();
  const theme = colorTokens[isDark ? "dark" : "light"];

  const [task, setTask] = useState<TaskType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>("");
  const [pickedDocs, setPickedDocs] = useState<
    DocumentPicker.DocumentPickerAsset[]
  >([]);
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [activitySheetVisible, setActivitySheetVisible] = useState(false);

  // attachment viewer
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  // prevent double actions
  const actionBusyRef = useRef(false);

  const fetchTask = useCallback(async (isFirst = false) => {
    if (!taskId) return;
    setLoading(isFirst);
    try {
      const res = await getTaskDashboard(taskId.toString());
      if (res?.success) {
        const fetched =
          res.data?.data?.task ?? res.data?.task ?? res.data?.data ?? res.data;
        setTask(fetched);
        setStatusCode(null);
      } else {
        setStatusCode(res?.status ?? null);
        Alert.alert("Failed to load task", res?.message || "Unknown");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Failed to load task", err?.message || "Unknown");
      setStatusCode(null);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchTask(true);
    return () => {
      if (taskId) lastSeenHandler(taskId.toString()).catch(() => {});
    };
  }, [fetchTask, taskId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTask(true);
    setRefreshing(false);
  }, [fetchTask]);

  /* ----------------- Actions ----------------- */
  const handleArchive = async () => {
    if (!taskId || actionBusyRef.current) return;
    Alert.alert(
      "Archive task",
      "Archived tasks are deleted after 30 days. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: async () => {
            actionBusyRef.current = true;
            try {
              const res = await archieveHandler(taskId.toString());
              if (res.success) {
                Alert.alert("Task archived", res.data?.message || "Archived");
                router.back();
              } else {
                Alert.alert("Archive failed", res.message || "Unknown");
              }
            } finally {
              actionBusyRef.current = false;
            }
          },
        },
      ]
    );
  };

  const handleDelete = async () => {
    if (!taskId || actionBusyRef.current) return;
    Alert.alert("Delete permanently?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          actionBusyRef.current = true;
          try {
            const res = await deleteTask(taskId.toString());
            if (res.success) {
              Alert.alert("Task deleted", res.data?.message || "Deleted");
              if (projectId) router.push(`/(routes)/projects/${projectId}`);
              else router.push("/");
            } else {
              Alert.alert("Deletion failed", res.message || "Unknown");
            }
          } finally {
            actionBusyRef.current = false;
          }
        },
      },
    ]);
  };

  const handleRepeat = async () => {
    if (!taskId || !task) return;
    // optimistic
    setTask((t) => (t ? { ...t, repeatDaily: !t.repeatDaily } : t));
    const res = await repeatHandler(taskId.toString());
    if (!res.success) {
      // rollback
      setTask((t) => (t ? { ...t, repeatDaily: !t.repeatDaily } : t));
      Alert.alert("Failed", res.message || "Unknown");
    }
  };

  const handleFavourite = async () => {
    if (!taskId || !task) return;
    // optimistic
    setTask((t) => (t ? { ...t, isFavourite: !t.isFavourite } : t));
    const res = await favouriteHandler(taskId.toString());
    if (res.success) {
      if (res.data?.data)
        dispatch(insertFavouriteTask(res.data?.data as any) as any);
    } else {
      // rollback
      setTask((t) => (t ? { ...t, isFavourite: !t.isFavourite } : t));
      Alert.alert("Failed", res.message || "Unknown");
    }
  };

  // comment
  const commentHandler = async () => {
    if (!taskId || !commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await addComment(taskId.toString(), commentText.trim());
      if (res.success) {
        const newComment = res.data?.data?.comment ?? res.data?.data ?? null;
        if (newComment) {
          setTask((prev) =>
            prev
              ? {
                  ...prev,
                  comments: prev.comments
                    ? [newComment, ...(prev.comments ?? [])]
                    : [newComment],
                  commentsCount: (prev.commentsCount || 0) + 1,
                  latestComment: newComment,
                }
              : prev
          );
        } else {
          await fetchTask();
        }
        setCommentText("");
      } else {
        Alert.alert("Add comment failed", res.message || "Unknown");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Add comment failed", err?.message || "Unknown");
    } finally {
      setSubmitting(false);
    }
  };

  // attachments
  const pickFiles = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        type: "*/*",
        multiple: true, // SDK 51: 'multiple'; older: allowMultiSelection
      } as any);
      if (!res.canceled) {
        const assets = (res.assets ||
          []) as DocumentPicker.DocumentPickerAsset[];
        setPickedDocs((prev) => [...prev, ...assets]);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("File pick failed", (err as any)?.message || "Unknown");
    }
  };

  const attachmentHandler = async () => {
    if (!taskId || pickedDocs.length === 0) return;
    setSubmitting(true);
    const form = new FormData();
    pickedDocs.forEach((f, idx) => {
      const uri = f.uri;
      const name = f.name ?? `file-${idx}`;
      form.append("attachments", {
        uri,
        name,
        type: f.mimeType || "application/octet-stream",
      } as any);
    });

    try {
      const res = await uploadAttachment(taskId.toString(), form);
      if (res.success) {
        setPickedDocs([]);
        await fetchTask();
      } else {
        Alert.alert("Upload failed", res.message || "Unknown");
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert("Upload failed", err?.message || "Unknown");
    } finally {
      setSubmitting(false);
    }
  };

  const openAttachment = async (att: AttachmentType) => {
    const url = att.url ?? att.fileUrl;
    if (!url) return;
    // simple: image -> inline viewer; anything else -> open in browser
    const isImage = !!url.match?.(/\.(jpg|jpeg|png|gif|webp|avif)$/i);
    if (isImage) {
      setViewerUri(url);
      setViewerOpen(true);
    } else {
      await WebBrowser.openBrowserAsync(url);
    }
  };

  const shareAttachment = async (att: AttachmentType) => {
    const url = att.url ?? att.fileUrl;
    if (!url) return;
    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(url);
      } else {
        await WebBrowser.openBrowserAsync(url);
      }
    } catch {}
  };

  /* ----------------- Activity (mini chart) ----------------- */
  const activityChartData = useMemo(() => {
    if (!task) return [];
    const days: Record<
      string,
      { date: string; comments: number; attachments: number }
    > = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      days[key] = { date: key, comments: 0, attachments: 0 };
    }

    (task.comments || []).forEach((c) => {
      const d = (c.createdAt || "").split?.("T")[0];
      if (d && days[d]) days[d].comments++;
    });

    (task.attachments || []).forEach((a) => {
      const d = (a.createdAt || "").split?.("T")[0];
      if (d && days[d]) days[d].attachments++;
    });

    return Object.values(days).map((v) => ({
      date: v.date,
      comments: v.comments,
      attachments: v.attachments,
      activity: v.comments + v.attachments,
    }));
  }, [task]);

 
  /* ----------------- Guards ----------------- */
  if (statusCode === 403) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={[{ color: theme.cardForeground }]}>Forbidden </Text>
          <Text style={{ color: theme.mutedForeground, marginTop: 8 }}>
            You don't have permission for this task.{" "}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (statusCode === 404) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={[{ color: theme.cardForeground }]}>Not Found </Text>
          <Text style={{ color: theme.mutedForeground, marginTop: 8 }}>
            Task not found.{" "}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 8, color: theme.mutedForeground }}>
            Loading task...{" "}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <View style={styles.center}>
          <Text style={{ color: theme.cardForeground }}>No task data. </Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ----------------- UI ----------------- */
  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingBottom: insets.bottom },
      ]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.border, backgroundColor: theme.card },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.cardForeground}
          />
        </TouchableOpacity>

        <View style={{ flex: 1, paddingHorizontal: 8 }}>
          <Text
            numberOfLines={1}
            style={[styles.headerTitle, { color: theme.cardForeground }]}
          >
            {task.title}{" "}
          </Text>
          <Text
            numberOfLines={1}
            style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }}
          >
            {typeof task.assignedToUser === "string"
              ? "Unassigned"
              : (task.assignedToUser as any)?.name || "Unassigned"}{" "}
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            onPress={handleFavourite}
            style={[styles.iconBtn, { borderColor: theme.border }]}
          >
            <Ionicons
              name={task.isFavourite ? "star" : "star-outline"}
              size={18}
              color={task.isFavourite ? theme.primary : theme.cardForeground}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActivitySheetVisible(true)}
            style={[styles.iconBtn, { borderColor: theme.border }]}
          >
            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color={theme.cardForeground}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
          />
        }
      >
        {/* Top badges */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
          }}
        >
          <BadgeChip text={task.status ?? "—"} theme={theme} />
          <BadgeChip text={task.priority ?? "—"} theme={theme} />
          {task.tags?.slice?.(0, 3)?.map((t) => (
            <View key={t} style={[styles.tag, { borderColor: theme.border }]}>
              <Text style={{ color: theme.cardForeground }}>{t} </Text>
            </View>
          ))}
        </View>

        {/* Details card */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text style={[styles.h3, { color: theme.cardForeground }]}>
            {task.title}{" "}
          </Text>
          <Text
            style={{
              color: theme.mutedForeground,
              marginTop: 8,
              lineHeight: 20,
            }}
          >
            {task.description || "No description"}{" "}
          </Text>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
            }}
          >
            <InfoTriplet
              label="Due"
              value={
                task.dueDate
                  ? new Date(task.dueDate).toLocaleDateString()
                  : "No due date"
              }
              theme={theme}
            />
            <InfoTriplet
              label="Created"
              value={
                task.createdAt
                  ? new Date(task.createdAt).toLocaleDateString()
                  : "-"
              }
              theme={theme}
            />
            <InfoTriplet
              label="Points"
              value={task.points ?? "—"}
              theme={theme}
            />
          </View>

          {/* Activity mini bars */}
          <View style={{ marginTop: 16 }}>
            <Text style={{ color: theme.mutedForeground, marginBottom: 8 }}>
              Activity (last 7d){" "}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-end",
                height: 84,
              }}
            >
              {activityChartData.length === 0 ? (
                <Text style={{ color: theme.mutedForeground }}>
                  No activity{" "}
                </Text>
              ) : (
                activityChartData.map((d) => {
                  const max = Math.max(
                    ...activityChartData.map((x) => x.activity || 0),
                    1
                  );
                  const height =
                    Math.round(((d.activity || 0) / (max || 1)) * 64) + 6;
                  return (
                    <View
                      key={d.date}
                      style={{ flex: 1, alignItems: "center" }}
                    >
                      <View
                        style={{
                          width: 12,
                          height,
                          backgroundColor: theme.primary,
                          borderRadius: 6,
                        }}
                      />
                      <Text
                        style={{
                          color: theme.mutedForeground,
                          fontSize: 10,
                          marginTop: 6,
                        }}
                      >
                        {new Date(d.date).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}{" "}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>

        {/* Actions row */}
        <View style={{ marginTop: 8, marginBottom: 2 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 6 }}
          >
            <ActionButton
              icon="time-outline"
              label="Focus"
              onPress={() =>
                router.push(
                  `/(routes)/projects/${projectId}/tasks/${task._id}/focus`
                )
              }
              theme={theme}
            />
            <ActionButton
              icon="repeat-outline"
              label={task.repeatDaily ? "Repeating" : "Repeat"}
              onPress={handleRepeat}
              theme={theme}
            />
            <ActionButton
              icon="archive-outline"
              label="Archive"
              onPress={handleArchive}
              destructive
              theme={theme}
            />
            <ActionButton
              icon="trash-outline"
              label="Delete"
              onPress={handleDelete}
              destructive
              theme={theme}
            />
            <ActionButton
              icon="create-outline"
              label="Edit"
              onPress={() => dispatch(addCurrentTask(task._id))}
              theme={theme}
            />
            <ActionButton
              icon={
                task.isFavourite ? ("star" as any) : ("star-outline" as any)
              }
              label={task.isFavourite ? "Fav’d" : "Fav"}
              onPress={handleFavourite}
              theme={theme}
            />
          </ScrollView>
        </View>

        {/* Attachments */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={{
              color: theme.cardForeground,
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            Attachments{" "}
          </Text>

          {task.attachments && task.attachments.length > 0 ? (
            <View style={styles.attachGrid}>
              {task.attachments.map((a) => {
                const url = a.url ?? a.fileUrl;
                const isImage = !!url?.match?.(
                  /\.(jpg|jpeg|png|gif|webp|avif)$/i
                );
                return (
                  <TouchableOpacity
                    key={a._id}
                    style={[styles.attachment, { borderColor: theme.border }]}
                    onPress={() => openAttachment(a)}
                    onLongPress={() => shareAttachment(a)}
                  >
                    {isImage ? (
                      <Image
                        source={{ uri: url }}
                        style={styles.attachmentImg}
                      />
                    ) : (
                      <View
                        style={[styles.fileBox, { borderColor: theme.border }]}
                      >
                        <Ionicons
                          name="document-text-outline"
                          size={28}
                          color={theme.cardForeground}
                        />
                        <Text
                          style={{
                            color: theme.cardForeground,
                            fontSize: 12,
                            marginTop: 6,
                          }}
                          numberOfLines={1}
                        >
                          {a.type ?? "File"}{" "}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={{
                        color: theme.mutedForeground,
                        fontSize: 11,
                        marginTop: 6,
                      }}
                      numberOfLines={1}
                    >
                      {a.name ?? a.attachmentUser?.name ?? "Attachment"}{" "}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={{ color: theme.mutedForeground }}>
              No attachments{" "}
            </Text>
          )}

          {/* upload controls */}
          <View style={{ flexDirection: "row", marginTop: 12, gap: 8 }}>
            <TouchableOpacity
              onPress={pickFiles}
              style={[styles.pickBtn, { borderColor: theme.border }]}
            >
              <Ionicons
                name="attach-outline"
                size={18}
                color={theme.cardForeground}
              />
              <Text style={{ color: theme.cardForeground, marginLeft: 8 }}>
                {pickedDocs.length
                  ? `${pickedDocs.length} selected`
                  : "Pick file(s)"}{" "}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={attachmentHandler}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              disabled={submitting || pickedDocs.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={{ color: theme.primaryForeground }}>Upload </Text>
              )}
            </TouchableOpacity>

            {pickedDocs.length > 0 && (
              <TouchableOpacity
                onPress={() => setPickedDocs([])}
                style={[styles.ghostBtn, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.cardForeground }}>Clear </Text>
              </TouchableOpacity>
            )}
          </View>

          {pickedDocs.length > 0 && (
            <Text
              style={{
                color: theme.mutedForeground,
                fontSize: 12,
                marginTop: 8,
              }}
            >
              Selected: {pickedDocs.map((d) => d.name).join(", ")}{" "}
            </Text>
          )}
        </View>

        {/* Comments */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Text
            style={{
              color: theme.cardForeground,
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            Comments{" "}
            {typeof task.commentsCount === "number"
              ? `(${task.commentsCount})`
              : ""}{" "}
          </Text>

          <View style={{ maxHeight: 320 }}>
            {task.comments && task.comments.length > 0 ? (
              <FlatList
                data={task.comments}
                keyExtractor={(c) => c._id}
                renderItem={({ item }) => (
                  <View
                    style={[styles.commentRow, { borderColor: theme.border }]}
                  >
                    <View style={{ flexDirection: "row", gap: 10 }}>
                      <Avatar user={item.commentUser as any} size={40} />
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            flexDirection: "row",
                            justifyContent: "space-between",
                          }}
                        >
                          <Text
                            style={{
                              color: theme.cardForeground,
                              fontWeight: "700",
                            }}
                          >
                            {item.commentUser?.name ?? "User"}{" "}
                          </Text>
                          <Text
                            style={{
                              color: theme.mutedForeground,
                              fontSize: 12,
                            }}
                          >
                            {new Date(item.createdAt).toLocaleString()}{" "}
                          </Text>
                        </View>
                        <Text
                          style={{ color: theme.cardForeground, marginTop: 6 }}
                        >
                          {item.text}{" "}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : (
              <Text style={{ color: theme.mutedForeground }}>
                No comments yet.{" "}
              </Text>
            )}
          </View>

          <TextInput
            placeholder="Write a comment..."
            placeholderTextColor={theme.mutedForeground}
            style={[
              styles.textarea,
              {
                backgroundColor: theme.popover,
                color: theme.cardForeground,
                borderColor: theme.border,
              },
            ]}
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />

          <View
            style={{
              flexDirection: "row",
              marginTop: 10,
              justifyContent: "flex-end",
            }}
          >
            <TouchableOpacity
              onPress={() => setCommentText("")}
              style={[
                styles.ghostBtn,
                { borderColor: theme.border, marginRight: 8 },
              ]}
            >
              <Text style={{ color: theme.cardForeground }}>Clear </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={commentHandler}
              style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              disabled={submitting || !commentText.trim()}
            >
              {submitting ? (
                <ActivityIndicator color={theme.primaryForeground} />
              ) : (
                <Text style={{ color: theme.primaryForeground }}>Post </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Fullscreen Image Viewer (simple) */}
      <Modal
        visible={viewerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerOpen(false)}
      >
        <View style={styles.viewerBackdrop}>
          <TouchableOpacity
            style={styles.viewerBackdrop}
            activeOpacity={1}
            onPress={() => setViewerOpen(false)}
          />
          <View style={styles.viewerBox}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              bouncesZoom
              centerContent
            >
              {!!viewerUri && (
                <Image
                  source={{ uri: viewerUri }}
                  style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
                  resizeMode="contain"
                />
              )}
            </ScrollView>
            <TouchableOpacity
              onPress={() => setViewerOpen(false)}
              style={styles.viewerClose}
            >
              <Ionicons name="close" size={20} color="#fff" />
              <Text style={{ color: "#fff", marginLeft: 8, fontWeight: "700" }}>
                Close{" "}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Task Activity Sheet */}
      <TaskActivitySheet
        visible={activitySheetVisible}
        task={task}
        onClose={() => setActivitySheetVisible(false)}
        onUpdated={(updated: Partial<TaskInterface>) => {
          // update local task and notify optional parent handler
          if (updated) {
            fetchTask()
          }
        }}
      />
    </SafeAreaView>
  );
}

/* ----- small components ----- */
function BadgeChip({ text, theme }: { text: string; theme: any }) {
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: theme.popover, borderColor: theme.border },
      ]}
    >
      <Text style={{ color: theme.popoverForeground, fontWeight: "700" }}>
        {text}{" "}
      </Text>
    </View>
  );
}

function InfoTriplet({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View>
      <Text style={{ color: theme.mutedForeground, marginBottom: 4 }}>
        {label}{" "}
      </Text>
      <Text style={{ color: theme.cardForeground, fontWeight: "700" }}>
        {value}{" "}
      </Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
  destructive,
  theme,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  theme: any;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.actionWrap,
        {
          borderColor: theme.border,
          backgroundColor: destructive ? "rgba(255,80,80,0.06)" : theme.popover,
        },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={
          destructive ? theme.destructive || "#ff3b30" : theme.cardForeground
        }
      />
      <Text
        style={{
          color: destructive
            ? theme.destructive || "#ff3b30"
            : theme.cardForeground,
          marginLeft: 8,
        }}
      >
        {label}{" "}
      </Text>
    </TouchableOpacity>
  );
}

/* ----- styles ----- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 72,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: { padding: 10, borderRadius: 10 },
  headerTitle: { fontSize: 16, fontWeight: "800" },

  card: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },

  h3: { fontSize: 18, fontWeight: "800" },

  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },

  actionWrap: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginRight: 10,
  },

  attachGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-start",
  },
  attachment: {
    width: (SCREEN_WIDTH - 64) / 3,
    marginRight: 8,
    marginBottom: 12,
  },
  attachmentImg: {
    width: "100%",
    height: 90,
    borderRadius: 8,
    backgroundColor: "#f1f1f1",
  },
  fileBox: {
    width: "100%",
    height: 90,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },

  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
  },
  ghostBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  commentRow: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    backgroundColor: "transparent",
  },
  textarea: {
    minHeight: 88,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    marginTop: 10,
  },

  iconBtn: { padding: 10, borderRadius: 10, borderWidth: 1, marginLeft: 6 },

  viewerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerBox: {
    width: "100%",
    flex: 1,
    justifyContent: "center",
  },
  viewerClose: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
  },
});
