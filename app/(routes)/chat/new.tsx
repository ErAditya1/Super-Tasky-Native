import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Stack, useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastSeen?: string;
};

const mockContacts: Contact[] = [
  { id: "1", name: "Alice Johnson", lastSeen: "Online" },
  { id: "2", name: "Bob Smith", lastSeen: "Last seen today at 8:45 PM" },
  { id: "3", name: "Charlie Brown", lastSeen: "Online" },
  { id: "4", name: "Diana Prince", lastSeen: "Last seen yesterday" },
  { id: "5", name: "Ethan Hunt", lastSeen: "Online" },
  { id: "6", name: "Fiona Williams", lastSeen: "Last seen 5 min ago" },
  { id: "7", name: "George Miller", lastSeen: "Online" },
];

export default function NewChatScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [search, setSearch] = useState("");

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return mockContacts;
    return mockContacts.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const handleStartChat = (contact: Contact) => {
    router.push(`/chat/${contact.id}`);
  };

  return (
    <View
      style={[
        styles.container,
      ]}
    >
        <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View
        style={[
          styles.header,
          {borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="arrow-left" size={22} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.cardForeground }]}>
          New Chat
        </Text>
      </View>

      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card }]}>
        <Icon
          name="magnify"
          size={20}
          color={colors.mutedForeground}
          style={{ marginRight: 6 }}
        />
        <TextInput
          placeholder="Search contacts"
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* New group option */}
      <TouchableOpacity
        onPress={() => router.push("/chat/new-group")}
        style={[styles.groupRow, { borderBottomColor: colors.border }]}
      >
        <View
          style={[
            styles.avatar,
            { backgroundColor: colors.primary + "22", borderColor: colors.primary },
          ]}
        >
          <Icon name="account-multiple-plus" size={22} color={colors.primary} />
        </View>
        <Text style={{ color: colors.cardForeground, fontWeight: "600" }}>
          New Group
        </Text>
      </TouchableOpacity>

      {/* Contact list */}
      <FlatList
        data={filteredContacts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.contactRow, { borderBottomColor: colors.border }]}
            onPress={() => handleStartChat(item)}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.primary + "33" }]}
            >
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {item.name.charAt(0)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: colors.cardForeground,
                  fontWeight: "600",
                  fontSize: 15,
                }}
              >
                {item.name}
              </Text>
              <Text
                style={{
                  color: colors.mutedForeground,
                  fontSize: 13,
                  marginTop: 3,
                }}
              >
                {item.lastSeen}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        contentContainerStyle={{ paddingBottom: 60 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 60,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: "700", marginLeft: 12 },
  iconBtn: { padding: 8 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: Platform.OS === "ios" ? 6 : 2 },
  groupRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 1,
  },
});
