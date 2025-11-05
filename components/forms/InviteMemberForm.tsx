// components/InviteMemberForm.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Keyboard,
  Platform,
  Modal,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { useAppDispatch } from "@/store/hooks";
import { insertInviteMember } from "@/store/team/teamSlice";
import { InviteThrowEmail } from "@/lib/api/team";
import { getUserSuggestion } from "@/lib/api/user";
import { useToast } from "@/components/Toast"; // assuming you have this
import Avatar from "@/components/Avatar";
import { Picker } from "@react-native-picker/picker";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

// if you already have inviteSchema in schemas, import it; otherwise define here

const inviteSchema = z.object({
  identifier: z.string().min(1, "Email or username is required"), // replaces email
  role: z.enum(["admin", "member", "viewer"]),
});

type FormValues = z.infer<typeof inviteSchema>;

type SuggestedUser = {
  _id: string;
  name: string;
  email: string;
  username: string;
  avatar?: { url?: string } | null;
  status?: string;
  isOnline?: boolean;
};

type Props = {
  setOpen?: (v: boolean) => void; // optional close callback from parent modal
  initialIdentifier?: string;
};

export default function InviteMemberForm({
  setOpen,
  initialIdentifier = "",
}: Props) {
  const dispatch = useAppDispatch();
  const toast = useToast();
  const { isDark } = useThemeToggle();
  const colors = theme[isDark ? "dark" : "light"];

  const [userSuggestions, setUserSuggestions] = useState<SuggestedUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const debounceRef = useRef<number | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { isSubmitting, isValid },
  } = useForm<FormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      identifier: initialIdentifier ?? "",
      role: "member",
    },
    mode: "onChange",
  });

  // fetch suggestions (debounced)
  const fetchSuggestions = async (q: string) => {
    if (!q || q.trim().length < 2) {
      setUserSuggestions([]);
      return;
    }
    try {
      setLoadingSuggestions(true);
      const res = await getUserSuggestion(q);
      if (res?.success) {
        const users = res.data?.data?.users ?? res.data?.users ?? [];
        setUserSuggestions(users);
        setShowSuggestions(true);
      } else {
        setUserSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      setUserSuggestions([]);
      setShowSuggestions(false);
      // optionally log
      // console.warn("suggestions error", err);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleIdentifierChange = (text: string) => {
    setValue("identifier", text, { shouldDirty: true, shouldTouch: true });
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    // debounce
    // @ts-ignore - setTimeout returns number on RN
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  // select a suggestion to fill identifier
  const handleSelectSuggestion = (u: SuggestedUser) => {
    const val = u.username ?? u.email ?? u.name;
    setValue("identifier", val, { shouldDirty: true });
    setUserSuggestions([]);
    setShowSuggestions(false);
    Keyboard.dismiss();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      const res = await InviteThrowEmail(data);
      if (res.success) {
        toast?.show?.(res.data?.message ?? "Invite sent", "success");
        if (res.data?.data) {
          dispatch(insertInviteMember(res.data.data));
        }
        reset();
        setUserSuggestions([]);
        setShowSuggestions(false);
        if (typeof setOpen === "function") setOpen(false);
      } else {
        toast?.show?.(res.message ?? "Invite failed", "danger");
      }
    } catch (err) {
      toast?.show?.("Network or server error", "danger");
    }
  };

  // clear suggestions when identifier emptied
  useEffect(() => {
    const identifier = getValues("identifier") ?? "";
    if (!identifier || identifier.trim().length < 2) {
      setUserSuggestions([]);
      setShowSuggestions(false);
    }
    // cleanup on unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <View style={[styles.container]}>
      <View style={styles.row}>
        <Text style={[styles.label, {color:colors.foreground}]}>Email or Username *</Text>
        <Controller
          control={control}
          name="identifier"
          render={({ field: { value } }) => (
            <View>
              <TextInput
                value={value}
                onChangeText={handleIdentifierChange}
                placeholder="enter email or username"
                style={styles.input}
                onFocus={() => {
                  if (userSuggestions.length > 0) setShowSuggestions(true);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="done"
              />
              {loadingSuggestions ? (
                <View style={styles.suggestionsLoading}>
                  <ActivityIndicator size="small" />
                </View>
              ) : null}
            </View>
          )}
        />
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && userSuggestions?.length > 0 && userSuggestions[0]._id && (
        <View style={[styles.suggestions,{backgroundColor: colors.card, borderColor: colors.border}]}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={userSuggestions}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => {
                if(!item) return <></>
                console.log(item)
                return (
              <TouchableOpacity
                style={styles.suggestionItem}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={styles.suggestionLeft}>
                  <Avatar user={item as any} size={40} />
                </View>

                <View style={styles.suggestionBody}>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={[styles.suggestionName, {color:colors.foreground}]}>{item.name}</Text>
                    <View
                      style={[
                        styles.badge,
                        !item.isOnline 
                          ? styles.badgeDefault
                          : styles.badgeSuccess,
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {item.isOnline ? "Online":"Ofline"}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.suggestionSub, {color:colors.foreground}]}>{item.email}</Text>
                  <Text style={[styles.suggestionSub, {color:colors.foreground}]}>@{item.username}</Text>
                </View>
              </TouchableOpacity>
            )
            }}
          />
        </View>
      )}

      {/* Role picker */}
      <View style={[styles.row, { marginTop: 12 }]}>
        <Text style={[styles.label,{color:colors.foreground}]}>Role</Text>
        <Controller
          control={control}
          name="role"
          render={({ field: { onChange, value } }) => (
            <View style={[styles.pickerWrap]}>
              <Picker
                selectedValue={value}
                onValueChange={(v: any) => onChange(v)}
                mode="dropdown"
                
              >
                <Picker.Item label="Member" value="member" />
                <Picker.Item label="Admin" value="admin" />
                <Picker.Item label="Viewer" value="viewer" />
              </Picker>
            </View>
          )}
        />
      </View>

      {/* Submit */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[
            styles.button,
            isSubmitting || !isValid ? { opacity: 0.6 } : null,
          ]}
          onPress={handleSubmit(onSubmit)}
          disabled={isSubmitting || !isValid}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Invite</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.buttonAlt]}
          onPress={() => {
            reset();
            setUserSuggestions([]);
            setShowSuggestions(false);
            if (typeof setOpen === "function") setOpen(false);
          }}
        >
          <Text style={styles.buttonAltText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%", paddingVertical: 8 },
  row: { marginBottom: 6 },
  label: { fontWeight: "700", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  suggestions: {
    maxHeight: 240,
    borderWidth: 1,
    borderRadius: 8,
    marginTop: 6,
    paddingVertical: 6,
  },
  suggestionsLoading: { position: "absolute", right: 12, top: 12 },
  suggestionItem: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: "center",
  },
  suggestionLeft: { marginRight: 10 },
  suggestionBody: { flex: 1 },
  suggestionName: { fontWeight: "700" },
  suggestionSub: { color: "#6B7280", fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  badgeSuccess: { backgroundColor: "#10B981" },
  badgeDefault: { backgroundColor: "#9CA3AF" },
  pickerWrap: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  actions: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  button: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 8,
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  buttonAlt: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonAltText: { color: "#374151", fontWeight: "700" },
});
