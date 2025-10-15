// app/screens/TermsScreen.tsx
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

export type TermsScreenProps = {
  onClose?: () => void;
};

export default function TermsScreen({ onClose }: TermsScreenProps) {
  const { isDark, toggleTheme } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
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
    <View style={[styles.screen, { backgroundColor: colors.background}]}>
        <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, {  borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={handleClose} style={styles.headerBtn}>
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>Close</Text>
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.cardForeground }]}>Terms of Service</Text>

        <TouchableOpacity
          onPress={() => (typeof toggleTheme === "function" ? toggleTheme() : undefined)}
          style={styles.headerBtn}
        >
          <Text style={[styles.headerBtnText, { color: colors.primary }]}>{isDark ? "Light" : "Dark"}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={[styles.h1, { color: colors.foreground }]}>Terms of Service</Text>
        <Text style={[styles.lead, { color: colors.mutedForeground }]}>Last updated: Oct 2025</Text>

        <View style={{ height: 12 }} />

        <Section title="1. Acceptance">
          By accessing or using Super Tasky you agree to these Terms. If you do not agree, do not use the service.
        </Section>

        <Section title="2. Use of Service">
          You may use the service for lawful purposes. You are responsible for the content you create and share.
        </Section>

        <Section title="3. Account">
          You must provide accurate information and keep your account secure. We can suspend or terminate accounts for violations.
        </Section>

        <Section title="4. User Content">
          You retain ownership of content you upload. By uploading you grant us a license to operate and improve the service.
        </Section>

        <Section title="5. Liability">
          The service is provided "as is". We are not liable for indirect damages to the extent permitted by law.
        </Section>

        <Section title="6. Governing Law">
          These terms are governed by the laws in the jurisdictions where the service operates.
        </Section>

        <View style={{ height: 18 }} />

        <Text style={[styles.paragraph, { color: colors.mutedForeground }]}>
          For detailed legal information and privacy see our policies:
          {"\n"}
          <Text style={{ color: colors.primary, textDecorationLine: "underline" }} onPress={() => openLink("https://example.com/privacy")}>
            Privacy Policy
          </Text>
        </Text>

        <View style={{ height: 24 }} />

        <View style={styles.buttonsRow}>
          <TouchableOpacity style={[styles.ghostButton, { borderColor: colors.border }]} onPress={handleClose}>
            <Text style={{ color: colors.cardForeground }}>Close</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={() => openLink("https://example.com/contact")}>
            <Text style={{ color: colors.accentForeground, fontWeight: "700" }}>Contact</Text>
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
