import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Image,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useAuth } from "@/context/AuthContext";
import { router, useRouter } from "expo-router";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import { logout } from "@/lib/api/auth";
import { clearAllAuthData } from "@/lib/api";
import Avatar from "@/components/Avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logoutUser } from "@/store/user/userSlice";

interface SettingsScreenProps {
  onBack: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}
function SettingsContent({ onBack, isDark, onToggleTheme }: SettingsScreenProps) {
  const insets = useSafeAreaInsets();
  const {isLoggedIn, setIsLoggedIn} = useAuth()
  const dispatch = useAppDispatch()
  const {user} = useAppSelector(s=>s.auth)
  const router = useRouter();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async() => {
        // Implement sign-out logic here

        const res =await logout()
        console.log(res)
        if(res.success){
            setIsLoggedIn(false);
            dispatch(logoutUser())
            await clearAllAuthData()
            router.push("/(auth)/Login");
        }


      


      }},
    ]);
  }

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentTheme.background},
      ]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: currentTheme.border, paddingBottom:20 },
          
        ]}
      >
        {/* <TouchableOpacity
          onPress={onBack}
          style={[styles.iconButton, { backgroundColor: currentTheme.card }]}
        >
          <Icon name="arrow-left" size={22} color={currentTheme.cardForeground} />
        </TouchableOpacity> */}
        <Text style={[styles.headerTitle, { color: currentTheme.foreground }]}>
          Settings
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <LinearGradient
          colors={["#6750A4", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.profileCard}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Avatar user= {user} style={styles.avatar} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.profileName}>{user?.name}</Text>
              <Text style={styles.profileName}>@{user?.username}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/(routes)/user/edit")}
          >
            <Text style={styles.editText}>Edit Profile</Text>
            <Icon name="chevron-right" size={18} color="#FFF" />
          </TouchableOpacity>
        </LinearGradient>

        {/* General Section */}
        <Section title="General" isDark={isDark}>
          <SettingItem
            icon="account-cog-outline"
            title="Account Settings"
            subtitle="Manage your account"
            onPress={() => router.push("/(routes)/user/account")}
            isDark={isDark}
          />
          <Separator isDark={isDark} />
          <SettingItem
            icon="cloud-sync-outline"
            title="Sync & Backup"
            subtitle="Cloud synchronization"
            onPress={() => Alert.alert("Sync & Backup")}
            isDark={isDark}
          />
        </Section>

        {/* Appearance */}
        <Section title="Appearance" isDark={isDark}>
          <View style={styles.itemRow}>
            <View style={styles.itemIconBox}>
              <Icon name="theme-light-dark" size={20} color={currentTheme.foreground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: currentTheme.cardForeground }]}>Dark Mode</Text>
              <Text style={[styles.itemSubtitle, { color: currentTheme.mutedForeground }]}>
                Toggle dark theme
              </Text>
            </View>
            <Switch value={isDark} onValueChange={onToggleTheme} />
          </View>
        </Section>

        {/* About Section */}
        <Section title="About" isDark={isDark}>
          <SettingItem
            icon="information-outline"
            title="About Super Tasky"
            subtitle="Version 1.0.0"
            onPress={() => router.push("/(routes)/about")}
            isDark={isDark}
          />
          <Separator isDark={isDark} />
          <SettingItem title="Privacy Policy" onPress={() => router.push("/(routes)/about/privacy")} isDark={isDark} />
          <Separator isDark={isDark} />
          <SettingItem title="Terms of Service" onPress={() => router.push("/(routes)/about/terms") } isDark={isDark} />
        </Section>

        {/* Logout */}
        <TouchableOpacity
          style={[
            styles.logoutButton,
            { backgroundColor: isDark ? "rgba(244,63,94,0.15)" : "#FEE2E2" },
          ]}
          onPress={handleSignOut}
        >
          <Icon name="logout" size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

/* ───────────────────────────── Helper Components ───────────────────────────── */

function Section({
  title,
  children,
  isDark,
}: {
  title: string;
  children: React.ReactNode;
  isDark: boolean;
}) {
  const currentTheme = theme[isDark ? "dark" : "light"];
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: isDark ? "#999" : "#666" }]}>{title}</Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: currentTheme.card,
            borderColor: currentTheme.border,
            shadowColor: isDark ? "#000" : "#000",
            shadowOffset: { width: 0, height: 2 },
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  isDark,
}: {
  icon?: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  isDark: boolean;
}) {
  const currentTheme = theme[isDark ? "dark" : "light"];
  return (
    <TouchableOpacity onPress={onPress} style={[styles.itemRow, {backgroundColor: currentTheme.card}]}>
      {icon && (
        <View style={styles.itemIconBox}>
          <Icon name={icon} size={20} color={currentTheme.foreground} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemTitle, { color: currentTheme.cardForeground }]}>{title}</Text>
        {subtitle && (
          <Text style={[styles.itemSubtitle, { color: currentTheme.mutedForeground }]}>{subtitle}</Text>
        )}
      </View>
      <Icon name="chevron-right" size={18} color={currentTheme.cardForeground} />
    </TouchableOpacity>
  );
}

function Separator({ isDark }: { isDark: boolean }) {
  const currentTheme = theme[isDark ? "dark" : "light"];
  return <View style={{ height: 1, backgroundColor: currentTheme.accent, marginLeft: 0}} />;
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const {toggleTheme, isDark } = useThemeToggle()

  return (
    <SettingsContent
      onBack={() => {}}
      isDark={isDark}
      onToggleTheme={() => {
        toggleTheme()
        // Add any additional logic for toggling the theme here
        
      }}
    />
  );
}

/* ───────────────────────────── Styles ───────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "700" },

  profileCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: "#FFF" },
  profileName: { fontSize: 18, fontWeight: "700", color: "#FFF" },
  profileEmail: { fontSize: 14, color: "#E0E0E0" },
  editButton: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  editText: { color: "#FFF", fontWeight: "500", marginRight: 4 },

  section: { marginBottom: 28, paddingHorizontal: 20 },
  sectionLabel: { fontSize: 14, marginBottom: 8, fontWeight: "600" },

  card: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: "hidden",
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  itemIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(103,80,164,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  itemTitle: { fontSize: 16, fontWeight: "600" },
  itemSubtitle: { fontSize: 13, marginTop: 2 },

  logoutButton: {
    marginHorizontal: 20,
    borderRadius: 20,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  logoutText: { color: "#DC2626", fontWeight: "600", fontSize: 16 },
});
