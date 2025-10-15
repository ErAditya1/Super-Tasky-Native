// app/(tabs)/projects/[id].tsx
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
} from "react-native";
import {
  useRouter,
  useLocalSearchParams,
  useGlobalSearchParams,
  Stack,
} from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

type Task = {
  id: string;
  title: string;
  due?: string;
  priority: "low" | "medium" | "high";
  assignee?: string;
  completed?: boolean;
};
type Member = { id: string; name: string; role?: string };

const SAMPLE_TASKS: Task[] = [
  {
    id: "t1",
    title: "Design onboarding flow",
    due: "2025-10-15",
    priority: "high",
    assignee: "u1",
  },
  {
    id: "t2",
    title: "Implement sync worker",
    due: "2025-10-18",
    priority: "medium",
    assignee: "u2",
  },
];

const SAMPLE_MEMBERS: Member[] = [
  { id: "u1", name: "Aditya Kumar", role: "Owner" },
  { id: "u2", name: "Neha Singh", role: "Designer" },
];

export default function ProjectDetail() {
  const { id } = useGlobalSearchParams();

  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<"Tasks" | "Members" | "Chat">(
    "Tasks"
  );
  const [tasks, setTasks] = useState<Task[]>(SAMPLE_TASKS);
  const [members] = useState<Member[]>(SAMPLE_MEMBERS);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<
    { id: string; author: string; body: string }[]
  >([{ id: "m1", author: "Aditya", body: "Welcome to the project!" }]);

  const projectTitle = useMemo(() => `Project ${id}`, [id]); // replace with real lookup

  function onSendMessage() {
    if (!message.trim()) return;
    setMessages((m) => [
      ...m,
      { id: Date.now().toString(), author: "You", body: message },
    ]);
    setMessage("");
  }

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: currentTheme.background,
          paddingBottom: insets.bottom + 12,
        },
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View
        style={[
          styles.header,
          {
            // backgroundColor: currentTheme.card,
            borderBottomColor: currentTheme.border,
          },
        ]}
      >
        
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons
            name="chevron-back"
            size={24}
            color={currentTheme.cardForeground}
          />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: currentTheme.cardForeground }]}
        >
          {projectTitle}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab selector */}
      <View style={[styles.segment, { backgroundColor: currentTheme.card }]}>
        {["Tasks", "Members", "Chat"].map((t) => {
          const active = t === activeTab;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setActiveTab(t as any)}
              style={[
                styles.segmentItem,
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

      {/* Content */}
      <View style={{ flex: 1, padding: 12 }}>
        {activeTab === "Tasks" && (
          <FlatList
            data={tasks}
            keyExtractor={(t) => t.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.taskRow,
                  {
                    backgroundColor: currentTheme.card,
                    borderColor: currentTheme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: currentTheme.cardForeground,
                      fontWeight: "700",
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text
                    style={{
                      color: currentTheme.mutedForeground,
                      marginTop: 6,
                    }}
                  >
                    {item.due ? `Due ${item.due}` : "No due date"}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/(routes)/projects/${'projectId'}/tasks/${item.id}`)}
                >
                  <Text style={{ color: currentTheme.primary }}>Open</Text>
                </TouchableOpacity>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}

        {activeTab === "Members" && (
          <FlatList
            data={members}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => (
              <View
                style={[
                  styles.memberRow,
                  {
                    backgroundColor: currentTheme.card,
                    borderColor: currentTheme.border,
                  },
                ]}
              >
                <Text
                  style={{
                    color: currentTheme.cardForeground,
                    fontWeight: "700",
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: currentTheme.mutedForeground }}>
                  {item.role}
                </Text>
              </View>
            )}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          />
        )}

        {activeTab === "Chat" && (
          <View style={{ flex: 1 }}>
            <FlatList
              data={messages}
              keyExtractor={(m) => m.id}
              renderItem={({ item }) => (
                <View style={{ marginBottom: 8 }}>
                  <Text
                    style={{
                      color: currentTheme.cardForeground,
                      fontWeight: "600",
                    }}
                  >
                    {item.author}
                  </Text>
                  <Text style={{ color: currentTheme.mutedForeground }}>
                    {item.body}
                  </Text>
                </View>
              )}
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
              }}
            >
              <TextInput
                placeholder="Message the team..."
                placeholderTextColor={currentTheme.mutedForeground}
                value={message}
                onChangeText={setMessage}
                style={[
                  styles.messageInput,
                  {
                    backgroundColor: currentTheme.card,
                    color: currentTheme.cardForeground,
                    borderColor: currentTheme.border,
                  },
                ]}
              />
              <TouchableOpacity
                onPress={onSendMessage}
                style={[
                  styles.sendBtn,
                  { backgroundColor: currentTheme.primary },
                ]}
              >
                <Text
                  style={{
                    color: currentTheme.primaryForeground,
                    fontWeight: "700",
                  }}
                >
                  Send
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

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
  headerTitle: { fontSize: 18, fontWeight: "700" },

  segment: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  segmentItem: { marginRight: 18, paddingBottom: 6 },

  taskRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  memberRow: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  messageInput: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginRight: 8,
  },
  sendBtn: { paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10 },
});
