// app/screens/PrivacyScreen.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import { Stack, useRouter } from "expo-router";

export type PrivacyScreenProps = {
  /**
   * Called when user accepts the privacy policy.
   * If omitted the screen will simply go back.
   */
  onAccept?: () => void;
  onClose?: () => void;
};

export default function PrivacyScreen({ onAccept, onClose }: PrivacyScreenProps) {
  const { isDark, toggleTheme } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleAccept = () => {
    if (onAccept) {
      try {
        onAccept();
      } catch (err) {
        console.warn("onAccept error", err);
      }
    } else {
      router.back();
    }
  };

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const openLink = async (url: string) => {
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert("Cannot open link", url);
    } catch (e) {
      console.warn("openLink error", e);
    }
  };

  const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
      <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>{children}</Text>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, {  borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>Close</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.cardForeground }]}>Privacy Policy</Text>

        <TouchableOpacity
          onPress={() => (typeof toggleTheme === "function" ? toggleTheme() : undefined)}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>{isDark ? "Light" : "Dark"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.h1, { color: colors.foreground }]}>Privacy Policy</Text>
        <Text style={[styles.lead, { color: colors.mutedForeground }]}>Last updated: Oct 2025</Text>

        <View style={{ height: 12 }} />

        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          This Privacy Policy explains how we collect, use, and share information when you use Super Tasky.
        </Text>

        <Section title="Information We Collect">
          We may collect account information (name, email), content you create (tasks, messages, files),
          usage data and diagnostics, and optional profile data (avatar, bio).
        </Section>

        <Section title="How We Use Information">
          We use collected data to provide core app functionality, improve the product, personalize your
          experience, and communicate important notifications.
        </Section>

        <Section title="Sharing & Disclosure">
          We do not sell personal data. We may share data with third-party providers for storage and analytics,
          or with other users you interact with (e.g., messages, shared tasks), and when required by law.
        </Section>

        <Section title="File Uploads & Media">
          Uploaded files are stored securely. Avoid uploading sensitive personal data unless you have consent
          from all parties involved.
        </Section>

        <Section title="Your Rights">
          You may request access, correction, export, or deletion of your data. Contact us at{" "}
          <Text style={{ color: colors.primary, textDecorationLine: "underline" }} onPress={() => openLink("mailto:privacy@supertasky.example")}>
            privacy@supertasky.example
          </Text>
          .
        </Section>

        <View style={{ height: 18 }} />

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.ghostButton, { borderColor: colors.border }]} onPress={handleClose}>
            <Text style={{ color: colors.cardForeground }}>Close</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleAccept}>
            <Text style={{ color: colors.accentForeground, fontWeight: "700" }}>Accept</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    height: 64,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerBtn: { padding: 8 },
  headerBtnText: { fontSize: 14, fontWeight: "600" },
  headerTitle: { fontSize: 16, fontWeight: "700" },

  content: { paddingHorizontal: 16, paddingTop: 16 },

  h1: { fontSize: 22, fontWeight: "800" },
  lead: { fontSize: 13, marginTop: 4 },

  section: { marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 6 },
  paragraph: { fontSize: 14, lineHeight: 20 },

  buttonsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  ghostButton: { flex: 1, paddingVertical: 12, borderWidth: 1, borderRadius: 10, alignItems: "center", marginRight: 8 },
  primaryButton: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginLeft: 8 },
});
