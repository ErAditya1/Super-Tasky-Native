import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Platform,
  Image,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack, useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import * as ImagePicker from "expo-image-picker";

type Contact = {
  id: string;
  name: string;
  avatar?: string;
  lastSeen?: string;
};

const mockContacts: Contact[] = [
  { id: "1", name: "Alice Johnson" },
  { id: "2", name: "Bob Smith" },
  { id: "3", name: "Charlie Brown" },
  { id: "4", name: "Diana Prince" },
  { id: "5", name: "Ethan Hunt" },
  { id: "6", name: "Fiona Williams" },
  { id: "7", name: "George Miller" },
];

export default function NewGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];

  const [step, setStep] = useState<1 | 2>(1);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Contact[]>([]);
  const [groupName, setGroupName] = useState("");
  const [groupImage, setGroupImage] = useState<string | null>(null);

  const pickGroupImage = async () => {
    // Ask for media permissions
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "We need access to your photos to select a group image."
      );
      return;
    }

    // Launch the image picker
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    // Set image if selected
    if (!result.canceled) {
      setGroupImage(result.assets[0].uri);
    }
  };

  const filteredContacts = useMemo(() => {
    if (!search.trim()) return mockContacts;
    return mockContacts.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  const toggleSelect = (contact: Contact) => {
    setSelected((prev) => {
      if (prev.find((c) => c.id === contact.id))
        return prev.filter((c) => c.id !== contact.id);
      return [...prev, contact];
    });
  };

  const handleCreateGroup = () => {
    if (!groupName.trim()) return;
    
    router.replace(`/chat/group?name=${encodeURIComponent(groupName)}&members=${encodeURIComponent(selected.map((m) => m.name).join(", "))}`)
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="arrow-left" size={22} color={colors.cardForeground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.cardForeground }]}>
          {step === 1 ? "New Group" : "Group Info"}
        </Text>
      </View>

      {/* STEP 1: Select contacts */}
      {step === 1 && (
        <>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.card,
                marginBottom: selected.length > 0 ? 0 : 12,
              },
            ]}
          >
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

          {/* Selected contacts bubble bar */}
          {selected.length > 0 && (
            <View
              style={[styles.selectedBar, { borderBottomColor: colors.border }]}
            >
              <FlatList
                data={selected}
                horizontal
                keyExtractor={(i) => i.id}
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.selectedChip,
                      { backgroundColor: colors.primary + "22" },
                    ]}
                  >
                    <Text
                      style={{ color: colors.primary, fontWeight: "600" }}
                      numberOfLines={1}
                    >
                      {item.name.split(" ")[0]}
                    </Text>
                    <TouchableOpacity onPress={() => toggleSelect(item)}>
                      <Icon name="close" size={16} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            </View>
          )}

          {/* Contact list */}
          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isSelected = selected.some((c) => c.id === item.id);
              return (
                <TouchableOpacity
                  style={[
                    styles.contactRow,
                    {
                      borderBottomColor: colors.border,
                      backgroundColor: isSelected
                        ? colors.primary + "11"
                        : "transparent",
                    },
                  ]}
                  onPress={() => toggleSelect(item)}
                >
                  <View
                    style={[
                      styles.avatar,
                      {
                        backgroundColor: colors.primary + "33",
                        borderColor: colors.primary,
                      },
                    ]}
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
                  <Text
                    style={{
                      color: colors.cardForeground,
                      fontWeight: "500",
                      fontSize: 15,
                    }}
                  >
                    {item.name}
                  </Text>
                  {isSelected && (
                    <Icon
                      name="check-circle"
                      size={22}
                      color={colors.primary}
                      style={{ marginLeft: "auto" }}
                    />
                  )}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 80 }}
          />

          {selected.length > 0 && (
            <TouchableOpacity
              onPress={() => setStep(2)}
              style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            >
              <Text
                style={{ color: colors.primaryForeground, fontWeight: "700" }}
              >
                Next ({selected.length})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* STEP 2: Group Info */}
      {step === 2 && (
        <View style={{ flex: 1, padding: 20 }}>
          <TouchableOpacity
            onPress={pickGroupImage}
            style={{ alignSelf: "center", marginVertical: 20 }}
          >
            {groupImage ? (
              <Image
                source={{ uri: groupImage }}
                style={{ width: 100, height: 100, borderRadius: 50 }}
              />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.primary + "22",
                    borderColor: colors.primary,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Icon name="camera-plus" size={30} color={colors.primary} />
              </View>
            )}
          </TouchableOpacity>

          <TextInput
            placeholder="Group name"
            placeholderTextColor={colors.mutedForeground}
            style={[
              styles.input,
              {
                color: colors.foreground,
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            value={groupName}
            onChangeText={setGroupName}
          />

          <Text
            style={{
              color: colors.mutedForeground,
              textAlign: "center",
              marginVertical: 10,
            }}
          >
            Add group icon and name to continue
          </Text>

          <TouchableOpacity
            disabled={!groupName.trim()}
            onPress={handleCreateGroup}
            style={[
              styles.createBtn,
              {
                backgroundColor: groupName.trim()
                  ? colors.primary
                  : colors.muted + "33",
              },
            ]}
          >
            <Text
              style={{
                color: groupName.trim()
                  ? colors.primaryForeground
                  : colors.mutedForeground,
                fontWeight: "700",
              }}
            >
              Create Group
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Platform.OS === "ios" ? 6 : 2,
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
  selectedBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  nextBtn: {
    position: "absolute",
    bottom: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 22,
    borderRadius: 30,
    elevation: 3,
  },
  input: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginVertical: 10,
  },
  createBtn: {
    marginTop: 20,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 10,
  },
});
