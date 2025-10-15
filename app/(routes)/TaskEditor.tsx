// app/(tabs)/TaskEditor.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";

import { theme } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";

const priorities = ["Low", "Medium", "High"];
const projectsMock = ["Project A", "Project B", "Project C"];
const teamMembersMock = ["Alice", "Bob", "Charlie"];

export default function TaskEditor() {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme ?? "light"];
  const insets = useSafeAreaInsets();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [project, setProject] = useState(projectsMock[0]);
  const [assignee, setAssignee] = useState(teamMembersMock[0]);
  const [priority, setPriority] = useState(priorities[0]);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [dueDate, setDueDate] = useState<Date | null>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: currentTheme.background }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
    >
      <Text style={[styles.label, { color: currentTheme.foreground }]}>
        Title
      </Text>
      <TextInput
        style={[styles.input, { backgroundColor: currentTheme.card, color: currentTheme.cardForeground }]}
        value={title}
        onChangeText={setTitle}
        placeholder="Enter task title"
        placeholderTextColor={currentTheme.mutedForeground}
      />

      <Text style={[styles.label, { color: currentTheme.foreground }]}>
        Description
      </Text>
      <TextInput
        style={[styles.textarea, { backgroundColor: currentTheme.card, color: currentTheme.cardForeground }]}
        value={description}
        onChangeText={setDescription}
        placeholder="Enter task description"
        placeholderTextColor={currentTheme.mutedForeground}
        multiline
      />

      <Text style={[styles.label, { color: currentTheme.foreground }]}>
        Project
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {projectsMock.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.dropdownItem,
              { backgroundColor: project === p ? currentTheme.primary : currentTheme.card },
            ]}
            onPress={() => setProject(p)}
          >
            <Text style={{ color: project === p ? currentTheme.primaryForeground : currentTheme.cardForeground }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: currentTheme.foreground }]}>Assignee</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        {teamMembersMock.map((m) => (
          <TouchableOpacity
            key={m}
            style={[
              styles.dropdownItem,
              { backgroundColor: assignee === m ? currentTheme.primary : currentTheme.card },
            ]}
            onPress={() => setAssignee(m)}
          >
            <Text style={{ color: assignee === m ? currentTheme.primaryForeground : currentTheme.cardForeground }}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={[styles.label, { color: currentTheme.foreground }]}>Priority</Text>
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        {priorities.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              styles.priorityBtn,
              { backgroundColor: priority === p ? currentTheme.primary : currentTheme.card },
            ]}
            onPress={() => setPriority(p)}
          >
            <Text style={{ color: priority === p ? currentTheme.primaryForeground : currentTheme.cardForeground }}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.label, { color: currentTheme.foreground }]}>Tags</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 12 }}>
        {tags.map((t) => (
          <View key={t} style={[styles.tag, { backgroundColor: currentTheme.accent }]}>
            <Text style={{ color: currentTheme.accentForeground }}>{t}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", marginBottom: 12 }}>
        <TextInput
          style={[styles.input, { flex: 1, backgroundColor: currentTheme.card, color: currentTheme.cardForeground }]}
          value={tagInput}
          onChangeText={setTagInput}
          placeholder="Add a tag"
          placeholderTextColor={currentTheme.mutedForeground}
          onSubmitEditing={addTag}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: currentTheme.primary }]} onPress={addTag}>
          <Text style={{ color: currentTheme.primaryForeground }}>Add</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.label, { color: currentTheme.foreground }]}>Due Date</Text>
      <TouchableOpacity
        style={[styles.input, { backgroundColor: currentTheme.card, justifyContent: "center" }]}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={{ color: currentTheme.cardForeground }}>
          {dueDate ? dueDate.toDateString() : "Select due date"}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={dueDate || new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "inline" : "default"}
          onChange={(_, date) => {
            setShowDatePicker(false);
            if (date) setDueDate(date);
          }}
        />
      )}

      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 24 }}>
        <TouchableOpacity
          style={[styles.cancelBtn, { backgroundColor: currentTheme.destructive }]}
        >
          <Text style={{ color: currentTheme.cardForeground }}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: currentTheme.primary }]}
        >
          <Text style={{ color: currentTheme.primaryForeground }}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  label: { fontWeight: "600", marginBottom: 6 },
  input: { padding: 12, borderRadius: 10, marginBottom: 12 },
  textarea: { padding: 12, borderRadius: 10, marginBottom: 12, minHeight: 80 },
  dropdownItem: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  priorityBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginRight: 8 },
  tag: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginRight: 6, marginBottom: 6 },
  addBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, marginLeft: 8 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, marginRight: 8, alignItems: "center" },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, marginLeft: 8, alignItems: "center" },
});
