// app/screens/AboutScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
  Alert,
  Linking,
  Share,
  Modal,
  Pressable,
} from "react-native";
import Constants from "expo-constants";
import * as Clipboard from "expo-clipboard";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

// ---------- SafeText helper (clamp font-size to avoid RN Fabric negative font crash) ----------
import { Text as RNText } from "react-native";
import { Stack } from "expo-router";
const DEFAULT_FONT_SIZE = 14;
const clampFontSize = (v?: number) => {
  if (v == null || Number.isNaN(v)) return DEFAULT_FONT_SIZE;
  const n = Math.round(Number(v));
  return Math.max(8, Math.min(40, n));
};
function SafeText(props: any) {
  const { style, children, ...rest } = props;
  let fontSize: number | undefined;
  if (Array.isArray(style)) {
    for (const s of style) {
      if (s && typeof s === "object" && (s as any).fontSize != null) {
        fontSize = (s as any).fontSize;
        break;
      }
    }
  } else if (style && typeof style === "object") {
    fontSize = (style as any).fontSize;
  }
  const safe = clampFontSize(fontSize);
  const newStyle = [{ ...(style as object) }, { fontSize: safe }];
  return (
    <RNText {...rest} style={newStyle} allowFontScaling={false}>
      {children}
    </RNText>
  );
}

// ---------- Static demo data (replace with real strings / links) ----------
const APP_WEBSITE = "https://supertasky.vercel.app";
const PRIVACY_URL = "https://supertasky.vercel.app/privacy";
const TERMS_URL = "https://supertasky.vercel.app/terms";
const RATE_URL = "https://supertasky.vercel.app/rate";
const SUPPORT_EMAIL = "support@supertasky.app";
const REPO_URL = "https://github.com/your-org/SuperTasky-Next";

type Contributor = { name: string; role?: string; handle?: string; url?: string };

// Demo contributors (static)
const CONTRIBUTORS: Contributor[] = [
  { name: "Aditya Kumar", role: "Founder & Product", handle: "ErAditya1", url: "https://github.com/ErAditya1" },
//   { name: "Sam Carter", role: "Lead Mobile", handle: "samc", url: "https://github.com/samc" },
//   { name: "Priya Patel", role: "Design", handle: "priyap", url: "https://dribbble.com/priyap" },
];

// Short privacy / terms snippet (static)
const PRIVACY_SNIPPET = `Super Tasky respects your privacy. We store minimal information required to operate the service. We never sell your data.
For full details, open the privacy policy link.`;

const TERMS_SNIPPET = `By using Super Tasky you agree to our terms. Use responsibly and follow local laws. For details, open the terms link.`;

// Simple FAQ items
const FAQ = [
  { q: "Is Super Tasky free?", a: "Yes — the core app is free. We may offer optional paid features (subscriptions) in future." },
  { q: "How do I back up my tasks?", a: "Super Tasky syncs to your account. Visit Settings → Backup to manage exports." },
  { q: "How can I report a bug?", a: "Use the 'Contact support' action below or file an issue on the GitHub repo." },
];

// ---------- AboutScreen ----------
export default function AboutScreen() {
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();
  const dims = useWindowDimensions();

  // version reading (safe fallback)
  const appVersion = useMemo(() => {
    // In Expo: prefer expo config
    // sometimes Constants.manifest is undefined in production builds; try multiple fields
    const m: any = Constants.manifest || (Constants as any).expoConfig || {};
    return m.version || m.extra?.version || Constants.nativeAppVersion || "1.0.0";
  }, []);

  // local UI state
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // responsive image size
  const logoSize = Math.min(120, Math.round(dims.width * 0.24));

  // actions
  const onOpenWebsite = async () => {
    try {
      await Linking.openURL(APP_WEBSITE);
    } catch (e) {
      Alert.alert("Unable to open website", APP_WEBSITE);
    }
  };

  const onShareApp = async () => {
    try {
      await Share.share({
        message: `Check out Super Tasky — habit + task tracker: ${APP_WEBSITE}`,
      });
    } catch (e) {
      console.warn("share failed", e);
    }
  };

  const onRate = async () => {
    try {
      await Linking.openURL(RATE_URL);
    } catch (e) {
      Alert.alert("Unable to open rating page", RATE_URL);
    }
  };

  const onContactSupport = async () => {
    const subject = encodeURIComponent("Support request — Super Tasky");
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
    try {
      await Linking.openURL(mailto);
    } catch {
      // fallback: copy email to clipboard
      await Clipboard.setStringAsync(SUPPORT_EMAIL);
      Alert.alert("Support email copied", `${SUPPORT_EMAIL} (copied to clipboard)`);
    }
  };

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert("Unable to open link", url);
    }
  };

  // small helper to toggle FAQ expansion
  const toggleFaq = (i: number) => setExpandedFaq((cur) => (cur === i ? null : i));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background}]}>
        <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* header */}
        <View style={[styles.header, { borderBottomColor: colors.border, backgroundColor: colors.card }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={[styles.logoWrap, { width: logoSize, height: logoSize, borderRadius: Math.round(logoSize / 8) }]}>
              <Image
                source={require("../../../assets/images/detailed_logo.jpg")}
                style={{ width: "100%", height: "100%", borderRadius: Math.round(logoSize / 8) }}
                resizeMode="cover"
              />
            </View>

            <View style={{ marginLeft: 12, flex: 1 }}>
              <SafeText style={{ fontSize: 20, fontWeight: "700", color: colors.foreground }}>Super Tasky </SafeText>
              <SafeText style={{ marginTop: 4, color: colors.mutedForeground }}>Make habits stick • Get things done</SafeText>
              <SafeText style={{ marginTop: 6, color: colors.mutedForeground, fontSize: 12 }}>v{appVersion}</SafeText>
            </View>
          </View>

          <View style={{ marginTop: 12, flexDirection: "row", gap: 8 }}>
            <TouchableOpacity onPress={onShareApp} style={[styles.iconBtn, { borderColor: colors.border }]}>
              <Icon name="share-variant" size={18} color={colors.cardForeground} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRate} style={[styles.iconBtn, { marginLeft: 8, borderColor: colors.border }]}>
              <Icon name="star-outline" size={18} color={colors.cardForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* description + highlights */}
        <View style={{ marginTop: 16 }}>
          <SafeText style={{ color: colors.foreground, fontSize: 15 }}>
            Super Tasky helps you break big goals into daily habits and small tasks. Plan your day, track streaks, and build consistency.
          </SafeText>

          <View style={{ marginTop: 12 }}>
            <SafeText style={{ color: colors.foreground, fontWeight: "700", marginBottom: 8 }}>Key features</SafeText>
            <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
              <Icon name="checkbox-marked-circle-outline" size={18} color={colors.primary} />
              <SafeText style={{ marginLeft: 10, color: colors.foreground }}>Daily & recurring tasks</SafeText>
            </View>
            <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
              <Icon name="chart-line" size={18} color={colors.primary} />
              <SafeText style={{ marginLeft: 10, color: colors.foreground }}>Progress & streaks </SafeText>
            </View>
            <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
              <Icon name="cloud-sync-outline" size={18} color={colors.primary} />
              <SafeText style={{ marginLeft: 10, color: colors.foreground }}>Sync across devices </SafeText>
            </View>
            <View style={[styles.featureRow, { backgroundColor: colors.card }]}>
              <Icon name="shield-check" size={18} color={colors.primary} />
              <SafeText style={{ marginLeft: 10, color: colors.foreground }}>Privacy-first design </SafeText>
            </View>
          </View>
        </View>

        {/* contributors */}
        <View style={{ marginTop: 18 }}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>Team & contributors</SafeText>
          <View style={{ marginTop: 8 }}>
            {CONTRIBUTORS.map((c) => (
              <View key={c.name} style={[styles.rowSmall, { backgroundColor: colors.card }]}>
                <View style={{ flex: 1 }}>
                  <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>{c.name}</SafeText>
                  <SafeText style={{ color: colors.mutedForeground }}>{c.role} {c.handle ? `• @${c.handle}` : ""}</SafeText>
                </View>
                {c.url ? (
                  <TouchableOpacity onPress={() => openUrl(c.url ||"")} style={styles.linkBtn}>
                    <SafeText style={{ color: colors.primary }}>View</SafeText>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* FAQ accordion */}
        <View style={{ marginTop: 18 }}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>FAQ</SafeText>
          <View style={{ marginTop: 8 }}>
            {FAQ.map((f, i) => (
              <View key={f.q} style={[styles.faqItem, { backgroundColor: colors.card }]}>
                <TouchableOpacity onPress={() => setExpandedFaq((cur) => (cur === i ? null : i))} style={styles.faqHeader}>
                  <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>{f.q}</SafeText>
                  <Icon name={expandedFaq === i ? "chevron-up" : "chevron-down"} size={18} color={colors.cardForeground} />
                </TouchableOpacity>
                {expandedFaq === i ? (
                  <View style={styles.faqBody}>
                    <SafeText style={{ color: colors.mutedForeground }}>{f.a}</SafeText>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        </View>

        {/* Legal / contact */}
        <View style={{ marginTop: 18 }}>
          <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>Legal & contact</SafeText>

          <View style={{ marginTop: 8 }}>
            <TouchableOpacity onPress={() => setPrivacyModalOpen(true)} style={[styles.rowSmall, { backgroundColor: colors.card }]}>
              <SafeText style={{ color: colors.foreground }}>Privacy Policy </SafeText>
              <Icon name="open-in-new" size={16} color={colors.cardForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setTermsModalOpen(true)} style={[styles.rowSmall, { backgroundColor: colors.card }]}>
              <SafeText style={{ color: colors.foreground }}>Terms of Service </SafeText>
              <Icon name="open-in-new" size={16} color={colors.cardForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={onContactSupport} style={[styles.rowSmall, { backgroundColor: colors.card }]}>
              <SafeText style={{ color: colors.foreground }}>Contact support </SafeText>
              <Icon name="email-outline" size={16} color={colors.cardForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => openUrl(REPO_URL)} style={[styles.rowSmall, { backgroundColor: colors.card }]}>
              <SafeText style={{ color: colors.foreground }}>Open-source repo {" "}</SafeText>
              <Icon name="github" size={16} color={colors.cardForeground} />
            </TouchableOpacity>

            <TouchableOpacity onPress={onOpenWebsite} style={[styles.rowSmall, { backgroundColor: colors.card }]}>
              <SafeText style={{ color: colors.foreground }}>Website</SafeText>
              <Icon name="web" size={16} color={colors.cardForeground} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* Privacy modal */}
      <Modal visible={privacyModalOpen} animationType="slide" transparent>
        <SafeAreaView style={[styles.modalOverlay, { backgroundColor: colors.background + "cc" }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SafeText style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>Privacy Policy</SafeText>
            <SafeText style={{ color: colors.mutedForeground, marginTop: 12 }}>{PRIVACY_SNIPPET}</SafeText>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
              <Pressable onPress={() => { setPrivacyModalOpen(false); }} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <SafeText style={{ color: colors.foreground }}>Close</SafeText>
              </Pressable>
              <Pressable onPress={() => openUrl(PRIVACY_URL)} style={[styles.modalBtnPrimary, { backgroundColor: colors.primary, marginLeft: 8 }]}>
                <SafeText style={{ color: colors.primaryForeground }}>Open full policy </SafeText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Terms modal */}
      <Modal visible={termsModalOpen} animationType="slide" transparent>
        <SafeAreaView style={[styles.modalOverlay, { backgroundColor: colors.background + "cc" }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <SafeText style={{ color: colors.foreground, fontWeight: "700", fontSize: 16 }}>Terms of Service</SafeText>
            <SafeText style={{ color: colors.mutedForeground, marginTop: 12 }}>{TERMS_SNIPPET}</SafeText>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}>
              <Pressable onPress={() => { setTermsModalOpen(false); }} style={[styles.modalBtn, { borderColor: colors.border }]}>
                <SafeText style={{ color: colors.foreground }}>Close</SafeText>
              </Pressable>
              <Pressable onPress={() => openUrl(TERMS_URL)} style={[styles.modalBtnPrimary, { backgroundColor: colors.primary, marginLeft: 8 }]}>
                <SafeText style={{ color: colors.primaryForeground }}>Open full terms </SafeText>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ---------- styles ----------
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    padding: 12,
    borderBottomWidth: 1,
    borderRadius: 8,
  },
  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 12,
    overflow: "hidden",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginLeft: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  rowSmall: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    justifyContent: "space-between",
    marginBottom: 8,
  },
  linkBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  faqItem: {
    borderRadius: 10,
    marginBottom: 8,
    overflow: "hidden",
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
  },
  faqBody: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 4,
  },
  modalOverlay: { flex: 1, justifyContent: "center", padding: 16 },
  modalCard: { padding: 16, borderRadius: 12, borderWidth: 1 },
  modalBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1 },
  modalBtnPrimary: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
});
