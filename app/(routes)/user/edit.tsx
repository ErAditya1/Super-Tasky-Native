import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useRouter } from "expo-router";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 chars"),
  email: z.string().email("Invalid email"),
  mobileNumber: z.string().min(10, "Invalid number"),
  about: z.string().optional(),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  mobileNumber: string;
  about?: string;
  avatar?: string;
  coverImage?: string;
}

interface Props {
  user: User;
  onSave: (
    data: UpdateProfileForm & { avatar?: string; coverImage?: string }
  ) => Promise<void>;
}

const EditProfileScreen: React.FC<Props> = ({ user, onSave }) => {
  const [avatar, setAvatar] = useState<string | null>(user?.avatar || null);
  const [cover, setCover] = useState<string | null>(user?.coverImage || null);
  const [loading, setLoading] = useState(false);
  const { isDark } = useThemeToggle();
  const router = useRouter();
  const colors = theme[isDark ? "dark" : "light"];

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name,
      username: user?.username,
      email: user?.email,
      mobileNumber: user?.mobileNumber,
      about: user?.about || "",
    },
  });

  // 📸 Pick image helper
  const pickImage = async (
    setImage: React.Dispatch<React.SetStateAction<string | null>>
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission denied", "Please allow access to storage.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = async (data: UpdateProfileForm) => {
    setLoading(true);
    try {
      await onSave({ ...data, avatar: avatar || "", coverImage: cover || "" });
      Alert.alert("Profile updated successfully");
    } catch (e) {
      Alert.alert("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Icon name="arrow-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Edit Profile
        </Text>
        <TouchableOpacity onPress={handleSubmit(handleSave)}>
          <Icon name="check" size={26} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {/* Cover Photo */}
      <TouchableOpacity
        style={[styles.coverContainer, { backgroundColor: colors.card }]}
        onPress={() => pickImage(setCover)}
      >
        {cover ? (
          <Image source={{ uri: cover }} style={styles.coverImage} />
        ) : (
          <View style={[styles.coverImage, styles.coverPlaceholder]}>
            <Icon name="image-plus" size={36} color={colors.accentForeground} />
            {/* <Text style={styles.coverText}>Add Cover </Text> */}
          </View>
        )}
      </TouchableOpacity>

      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={() => pickImage(setAvatar)}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder,  { backgroundColor: colors.card }]}>
              <Icon name="camera-plus" size={32} color={colors.accentForeground} />
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Form */}
      <View style={styles.form}>
        <Text style={styles.label}>Full Name</Text>
        <Controller
          control={control}
          name="name"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { color: colors.cardForeground, backgroundColor: colors.card }]}
              value={value}
              onChangeText={onChange}
              placeholder="Enter name"
            />
          )}
        />
        {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

        <Text style={styles.label}>Username</Text>
        <Controller
          control={control}
          name="username"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card }]}
              value={value}
              onChangeText={onChange}
              placeholder="Enter username"
            />
          )}
        />
        {errors.username && (
          <Text style={styles.error}>{errors.username.message}</Text>
        )}

        <Text style={styles.label}>Email</Text>
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card }]}
              value={value}
              onChangeText={onChange}
              keyboardType="email-address"
            />
          )}
        />
        {errors.email && (
          <Text style={styles.error}>{errors.email.message}</Text>
        )}

        <Text style={styles.label}>Mobile Number</Text>
        <Controller
          control={control}
          name="mobileNumber"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { color: colors.foreground, backgroundColor: colors.card }]}
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
            />
          )}
        />
        {errors.mobileNumber && (
          <Text style={styles.error}>{errors.mobileNumber.message}</Text>
        )}

        <Text style={styles.label}>About</Text>
        <Controller
          control={control}
          name="about"
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: "top" , color: colors.foreground, backgroundColor: colors.card }]}
              value={value}
              onChangeText={onChange}
              multiline
              placeholder="Tell something about yourself"
            />
          )}
        />

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSubmit(handleSave)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
   header: { height: 64, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1 },
  headerBtn: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  coverContainer: { width: "100%", height: 160 },
  coverImage: {
    width: "100%",
    height: "100%",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  coverPlaceholder: { justifyContent: "center", alignItems: "center" },
  coverText: { marginTop: 4 },
  avatarContainer: { alignItems: "center", marginTop: -50 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#fff",
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
  },
  form: { padding: 20 },
  label: { fontWeight: "600", fontSize: 14, marginTop: 16 },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: "#007AFF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
  error: { color: "red", fontSize: 12 },
});
