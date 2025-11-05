// EditProfileScreen.tsx
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Stack, useRouter } from "expo-router";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { useToast } from "@/components/Toast";
import { AxiosError } from "axios";

// API helpers — adjust path if needed
import {
  updateUserAvatar,
  updateUserCover,
  updateUserAccount,
} from "@/lib/api/user";
import { updateUser as updateUserAction } from "@/store/user/userSlice";
import { checkUsername } from "@/lib/api/auth";

const updateProfileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().min(3, "Username must be at least 3 chars"),
  email: z.string().email("Invalid email"),
  mobileNumber: z.string().min(10, "Invalid number"),
  about: z.string().optional(),
});

type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

const EditProfileScreen: React.FC = () => {
  const { user } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const toast = useToast();

  const [avatarLocal, setAvatarLocal] = useState<string | null>(
    user?.avatar?.url ?? null
  );
  const [coverLocal, setCoverLocal] = useState<string | null>(
    user?.coverImage?.url ?? null
  );

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // username check states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState<string>("");
  const [suggestUsername, setSuggestUsername] = useState<string>("");

  const { isDark } = useThemeToggle() as any;
  const router = useRouter();
  const colors = theme[isDark ? "dark" : "light"];

  const {
    control,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    setValue,
    watch,
  } = useForm<UpdateProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      name: user?.name ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      mobileNumber: user?.mobileNumber ?? "",
      about: user?.about ?? "",
    },
  });

  // watch username for debounced API check
  const watchedUsername = watch("username", user?.username ?? "");

  useEffect(() => {
    reset({
      name: user?.name ?? "",
      username: user?.username ?? "",
      email: user?.email ?? "",
      mobileNumber: user?.mobileNumber ?? "",
      about: user?.about ?? "",
    });
    setAvatarLocal(user?.avatar?.url ?? null);
    setCoverLocal(user?.coverImage?.url ?? null);
  }, [user, reset]);

  // request permission and pick image from library
  const pickImage = async (
    setImage: React.Dispatch<React.SetStateAction<string | null>>,
    aspect: [number, number] = [1, 1],
    allowsEditing = true
  ) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Please allow access to your photos.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing,
        aspect,
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setImage(result.assets[0].uri);
      }
    } catch (err) {
      console.warn("pickImage error:", err);
      Alert.alert("Image error", "Unable to pick image.");
    }
  };

  // Upload helpers (calls your API helpers)
  async function uploadAvatar(uri: string) {
    if (!uri) return null;
    setAvatarUploading(true);
    console.log(uri)
    try {
      const formData = new FormData();
      const filename = `avatar_${Date.now()}.jpg`;
      const file: any = {
        uri,
        name: filename,
        type: "image/jpeg",
      };
      console.log(uri)
      formData.append("avatar", file);

      const res = await updateUserAvatar(formData);
      console.log(res)
      if (res?.success) {
        const newUrl = res.data?.data?.avatar?.url ?? res.data?.avatar?.url ?? null;
        if (res.data?.data) dispatch(updateUserAction(res.data.data));
        toast?.show?.(res.data?.message ?? "Avatar updated", "success");
        return newUrl;
      } else {
        toast?.show?.(res?.message ?? "Avatar upload failed", "danger");
        return null;
      }
    } catch (e) {
      console.warn("uploadAvatar error", e);
      toast?.show?.("Avatar upload failed", "danger");
      return null;
    } finally {
      setAvatarUploading(false);
    }
  }

  async function uploadCover(uri: string) {
    if (!uri) return null;
    console.log(uri)
    setCoverUploading(true);
    try {
      const formData = new FormData();
      const filename = `cover_${Date.now()}.jpg`;
      const file: any = {
        uri,
        name: filename,
        type: "image/jpeg",
      };
      formData.append("coverImage", file);

      const res = await updateUserCover(formData);
      console.log(res)
      if (res?.success) {
        const newUrl = res.data?.data?.coverImage?.url ?? res.data?.coverImage?.url ?? null;
        if (res.data?.data) dispatch(updateUserAction(res.data.data));
        toast?.show?.(res.data?.message ?? "Cover updated", "success");
        return newUrl;
      } else {
        toast?.show?.(res?.message ?? "Cover upload failed", "danger");
        return null;
      }
    } catch (e) {
      console.warn("uploadCover error", e);
      toast?.show?.("Cover upload failed", "danger");
      return null;
    } finally {
      setCoverUploading(false);
    }
  }

  async function maybeUpload(uri: string | null, type: "avatar" | "cover") {
    if (!uri) return null;
    if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
    if (type === "avatar") return await uploadAvatar(uri);
    return await uploadCover(uri);
  }

  async function submitProfile(data: UpdateProfileForm, avatarUrl?: string, coverUrl?: string) {
    setIsSubmitting(true);
    try {
      const payload: any = {
        name: data.name,
        username: data.username,
        email: data.email,
        mobileNumber: data.mobileNumber,
        about: data.about ?? "",
      };
      if (avatarUrl !== undefined) payload.avatar = avatarUrl;
      if (coverUrl !== undefined) payload.coverImage = coverUrl;

      const res = await updateUserAccount(payload);
      console.log(res.data.data)
      if (res?.success) {
        if (res.data?.data) dispatch(updateUserAction(res.data.data));
        toast?.show?.(res.data?.message ?? "Profile updated", "success");
        return true;
      } else {
        toast?.show?.(res?.message ?? "Update profile failed", "danger");
        return false;
      }
    } catch (e) {
      console.warn("submitProfile error", e);
      toast?.show?.("Update profile failed", "danger");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  // Debounce username input — update debouncedUsername after delay
  const [debouncedUsername, setDebouncedUsername] = useState(watchedUsername);
  useEffect(() => {
    const h = setTimeout(() => setDebouncedUsername(watchedUsername?.trim() ?? ""), 600);
    return () => clearTimeout(h);
  }, [watchedUsername]);

  // check username uniqueness when debouncedUsername changes
  useEffect(() => {
    // keep logs for debugging (you had console.log in your snippet)
    // console.log("Use effect called");
    const checkUsernameUnique = async () => {
      setIsCheckingUsername(true);
      setUsernameMessage("");
      setSuggestUsername("");

      try {
        const response = await checkUsername(debouncedUsername);
        // try to read message and suggested username safely
        const msg = response?.data?.message ?? response?.message ?? "";
        setUsernameMessage(msg);

        const suggested = response?.data?.data?.username ?? response?.data?.suggestedUsername ?? "";
        if (suggested && suggested !== debouncedUsername) setSuggestUsername(suggested);
      } catch (error) {
        const axiosError = error as AxiosError<any>;
        const msg = axiosError?.response?.data?.message ?? "Error checking username";
        setUsernameMessage(msg);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    if (debouncedUsername && debouncedUsername.trim() !== "") {
      checkUsernameUnique();
    } else {
      setUsernameMessage("");
      setSuggestUsername("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUsername]); // effect runs when debouncedUsername changes

  // handleSave — called by react-hook-form handleSubmit

  const handleSave = async (data: UpdateProfileForm) => {
    if (isSubmitting || avatarUploading || coverUploading) return;

    try {
      let avatarUrl = avatarLocal ?? "";
      let coverUrl = coverLocal ?? "";

      if (avatarLocal && !avatarLocal.startsWith("http")) {
        const uploaded = await maybeUpload(avatarLocal, "avatar");
        if (uploaded) avatarUrl = uploaded;
      }

      if (coverLocal && !coverLocal.startsWith("http")) {
        const uploaded = await maybeUpload(coverLocal, "cover");
        if (uploaded) coverUrl = uploaded;
      }
      return

      const ok = await submitProfile(data, avatarUrl, coverUrl);
      if (ok) router.back();
    } catch (err) {
      console.warn("handleSave error:", err);
    }
  };

  const isSaveDisabled = isSubmitting || avatarUploading || coverUploading || !isDirty;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
      <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ paddingBottom: 40 }}>
        <Stack.Screen options={{ headerShown: false }} />

        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Icon name="arrow-left" size={24} color={colors.foreground} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>

          <TouchableOpacity onPress={handleSubmit(handleSave)} disabled={isSaveDisabled} style={{ opacity: isSaveDisabled ? 0.5 : 1 }} accessibilityRole="button">
            {(isSubmitting || avatarUploading || coverUploading) ? <ActivityIndicator color={colors.primaryForeground} /> : <Icon name="check" size={26} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        {/* Cover Photo */}
        <TouchableOpacity style={[styles.coverContainer, { backgroundColor: colors.card }]} onPress={() => pickImage(setCoverLocal, [16, 9], true)}>
          {coverLocal ? <Image source={{ uri: coverLocal }} style={styles.coverImage} /> : (
            <View style={[styles.coverImage, styles.coverPlaceholder]}>
              <Icon name="image-plus" size={36} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>Add cover photo {" "}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={() => pickImage(setAvatarLocal, [1, 1], true)}>
            {avatarLocal ? <Image source={{ uri: avatarLocal }} style={[styles.avatar, { borderColor: colors.card }]} /> : (
              <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.card }]}>
                <Icon name="camera-plus" size={32} color={colors.mutedForeground} />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* upload status */}
        {(avatarUploading || coverUploading) && (
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.mutedForeground, marginTop: 6 }}>
              {avatarUploading ? "Uploading avatar..." : coverUploading ? "Uploading cover..." : "Uploading..."}{" "}
            </Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          <Text style={[styles.label, { color: colors.foreground }]}>Full Name</Text>
          <Controller control={control} name="name" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, { color: colors.cardForeground, backgroundColor: colors.card, borderColor: colors.border }]} value={value} onChangeText={onChange} placeholder="Enter name" placeholderTextColor={colors.mutedForeground} />
          )} />
          {errors.name && <Text style={styles.error}>{errors.name.message}</Text>}

          <Text style={[styles.label, { color: colors.foreground }]}>Username</Text>
          <Controller control={control} name="username" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, { color: colors.cardForeground, backgroundColor: colors.card, borderColor: colors.border }]} value={value} onChangeText={(v) => { onChange(v); }} placeholder="Enter username" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" />
          )} />
          {errors.username && <Text style={styles.error}>{errors.username.message}</Text>}

          {/* username check UI */}
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6 }}>
            {isCheckingUsername ? <ActivityIndicator size="small" color={colors.primary} /> : null}
            <Text style={{ color: colors.mutedForeground, marginLeft: isCheckingUsername ? 8 : 0 }}>
              {usernameMessage} {" "}
            </Text>
            {!!suggestUsername && (
              <TouchableOpacity onPress={() => { setValue("username", suggestUsername); setUsernameMessage("Suggested username applied"); setSuggestUsername(""); }} style={{ marginLeft: 12, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.primary, fontWeight: "700" }}>Use: {suggestUsername}</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
          <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, { color: colors.cardForeground, backgroundColor: colors.card, borderColor: colors.border }]} value={value} onChangeText={onChange} keyboardType="email-address" placeholder="you@example.com" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" />
          )} />
          {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}

          <Text style={[styles.label, { color: colors.foreground }]}>Mobile Number</Text>
          <Controller control={control} name="mobileNumber" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, { color: colors.cardForeground, backgroundColor: colors.card, borderColor: colors.border }]} value={value} onChangeText={onChange} keyboardType="phone-pad" placeholder="+91 91234 56789" placeholderTextColor={colors.mutedForeground} />
          )} />
          {errors.mobileNumber && <Text style={styles.error}>{errors.mobileNumber.message}</Text>}

          <Text style={[styles.label, { color: colors.foreground }]}>About</Text>
          <Controller control={control} name="about" render={({ field: { onChange, value } }) => (
            <TextInput style={[styles.input, { height: 100, textAlignVertical: "top", color: colors.cardForeground, backgroundColor: colors.card, borderColor: colors.border }]} value={value} onChangeText={onChange} multiline placeholder="Tell something about yourself" placeholderTextColor={colors.mutedForeground} />
          )} />

          <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary, opacity: isSaveDisabled ? 0.6 : 1 }]} onPress={handleSubmit(handleSave)} disabled={isSaveDisabled}>
            {(isSubmitting) ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.saveButtonText, { color: colors.primaryForeground }]}>Save Changes</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    height: 64,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
  },
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
  avatarContainer: { alignItems: "center", marginTop: -50 },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
  },
  avatarPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  form: { padding: 20 },
  label: { fontWeight: "600", fontSize: 14, marginTop: 12 },
  input: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginTop: 6,
    borderWidth: 1,
  },
  saveButton: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  saveButtonText: { fontWeight: "600", fontSize: 16 },
  error: { color: "red", fontSize: 12, marginTop: 6 },
});
