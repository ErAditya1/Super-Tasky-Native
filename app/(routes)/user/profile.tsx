// app/screens/PublicProfileScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  Share,
  useWindowDimensions,
  Platform,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import ImageViewing from "react-native-image-viewing";
import * as Linking from "expo-linking";

import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

// ---------- SafeText helper (clamp font-size to avoid RN Fabric negative font crash) ----------
import { Text as RNText } from "react-native";
import { router, Stack } from "expo-router";
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

// ---------- Types ----------
type PublicProfile = {
  id: string;
  username: string;
  fullName?: string;
  avatarUri?: string | null;
  bio?: string;
  website?: string;
  tasksCompleted?: number;
  tasksPublic?: number;
  followers?: number;
  following?: number;
  recentPublicActivities?: Array<{
    id: string;
    title: string;
    createdAt: string;
  }>;
  publicImages?: string[]; // URIs
  isFollowing?: boolean;
};

type Props = {
  route?: { params?: { username?: string } };
  navigation?: any;
};

// ---------- ScreenHeader component ----------
function ScreenHeader({
  title,
  onBack,
  onShare,
  rightMenu,
  backgroundColor,
  tintColor,
}: {
  title?: string;
  onBack?: () => void;
  onShare?: () => void;
  rightMenu?: () => void;
  backgroundColor?: string;
  tintColor?: string;
}) {
  return (
    <View style={[styles.headerContainer, { backgroundColor }]}>
      <View style={styles.headerInner}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.headerButton}
          accessibilityLabel="Back"
        >
          <Icon name="arrow-left" size={22} color={tintColor} />
        </TouchableOpacity>

        <SafeText
          style={[styles.headerTitle, { color: tintColor }]}
          numberOfLines={1}
        >
          {title}
        </SafeText>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {onShare ? (
            <TouchableOpacity
              onPress={onShare}
              style={styles.headerButton}
              accessibilityLabel="Share"
            >
              <Icon name="share-variant" size={20} color={tintColor} />
            </TouchableOpacity>
          ) : null}
          {rightMenu ? (
            <TouchableOpacity
              onPress={rightMenu}
              style={styles.headerButton}
              accessibilityLabel="More"
            >
              <Icon name="dots-vertical" size={20} color={tintColor} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ---------- Main screen ----------
export default function PublicProfileScreen({ route, navigation }: Props) {
  const { isDark, toggleTheme } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const dims = useWindowDimensions();
  const usernameParam = route?.params?.username ?? "demo";

  // ---------- Static demo profile ----------
  const DEMO: PublicProfile = {
    id: "u_demo",
    username: usernameParam,
    fullName: "Sam Carter",
    avatarUri:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=6f3f4c8f1b7b2f1b84f8a7d8f3b0d2ee",
    bio: "Productivity nerd. Sharing public task lists and templates. Visit my website for templates and tips.",
    website: "https://supertasky.app",
    tasksCompleted: 187,
    tasksPublic: 14,
    followers: 342,
    following: 54,
    recentPublicActivities: [
      {
        id: "r1",
        title: "Published: Morning routine checklist",
        createdAt: new Date().toISOString(),
      },
      {
        id: "r2",
        title: "Completed: Quarterly review",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
      },
    ],
    publicImages: [
      "https://images.unsplash.com/photo-1508921912186-1d1a45ebb3c1?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=8b4a1d7d9e3d4e2d0f7d7f8e3b9d2f2a",
      "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=b767c5f3c2aa8e6a4d5b1f3a8c9e5b7f",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=800&auto=format&fit=crop&ixlib=rb-4.0.3&s=ecbac4ba6b9d9f1e9c3c8c3f0f3ad6ea",
    ],
    isFollowing: false,
  };

  const [profile] = useState<PublicProfile>(DEMO); // static; not editable here
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  // responsive avatar size & grid columns
  const avatarSize = Math.max(64, Math.round(Math.min(120, dims.width * 0.2))); // 20% of width, clamped
  const contentWidth = Math.min(900, dims.width - 32); // content area max-width
  const imageMinWidth = 120;
  const columns = Math.max(1, Math.floor(contentWidth / (imageMinWidth + 12)));
  const imageSize = Math.floor((contentWidth - (columns - 1) * 8) / columns);

  const initials = useMemo(() => {
    const parts = (profile.fullName || profile.username || "User").split(" ");
    return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase();
  }, [profile]);

  // URL opener
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  const openUrl = async (raw: string) => {
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = "http://" + url;
    try {
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert("Cannot open link", url);
    }
  };

  // viewer
  const images = (profile.publicImages ?? []).map((uri) => ({ uri }));
  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerVisible(true);
  };

  // follow toggle (static demo)
  const toggleFollow = async () => {
    setFollowLoading(true);
    // simulate delay
    setTimeout(() => setFollowLoading(false), 600);
    Alert.alert("Follow", `Toggled follow (demo).`);
  };

  const onMessage = () => {
    Alert.alert("Message", `Start a chat with @${profile.username} (demo).`);
  };

  const onShare = async () => {
    const url = `https://supertasky.app/u/${profile.username}`;
    try {
      await Share.share({
        message: `Check out ${
          profile.fullName ?? profile.username
        }'s profile on Super Tasky: ${url}`,
      });
    } catch (e) {
      console.warn("share error", e);
    }
  };

  const onReport = () => {
    Alert.alert(
      "Report profile",
      "Thanks — we'll review this profile. (Demo action)"
    );
  };

  // render bio with link detection
  const renderBio = (b?: string) => {
    if (!b) return null;
    const nodes: Array<{ type: "text" | "link"; text: string }> = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = urlRegex.exec(b)) !== null) {
      const match = m[0];
      const start = m.index;
      if (start > last)
        nodes.push({ type: "text", text: b.slice(last, start) });
      nodes.push({ type: "link", text: match });
      last = start + match.length;
    }
    if (last < b.length) nodes.push({ type: "text", text: b.slice(last) });
    return (
      <SafeText style={{ color: colors.foreground, fontSize: 14 }}>
        {nodes.map((n, i) =>
          n.type === "text" ? (
            <SafeText key={i} style={{ fontSize: 14 }}>
              {n.text}
            </SafeText>
          ) : (
            <SafeText
              key={i}
              style={{
                color: colors.primary,
                textDecorationLine: "underline",
                fontSize: 14,
              }}
              onPress={() => openUrl(n.text)}
            >
              {n.text}
            </SafeText>
          )
        )}
      </SafeText>
    );
  };

  // header handlers
  const onBack = () => {
    if (navigation?.goBack) navigation.goBack();
    else Alert.alert("Back", "Back pressed (demo).");
  };

  // Top status bar styles (match theme)
  const barStyle = isDark ? "light-content" : "dark-content";

  return (
    <SafeAreaView
      style={[
        styles.root,
        { backgroundColor: colors.background },
      ]}
    >
        <Stack.Screen options={{ headerShown: false }} />
      {/* Custom header */}
      <ScreenHeader
        title={profile.fullName ?? "Profile"}
        onBack={()=> router.back()}
        onShare={onShare}
        rightMenu={() => Alert.alert("Menu", "Open more actions (demo)")}
        tintColor={colors.foreground}
      />

      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center" }}>
        <View
          style={[styles.content, { width: Math.min(900, dims.width - 32) }]}
        >
          {/* Top row */}
          <View style={styles.topRow}>
            <View style={{ width: avatarSize, alignItems: "center" }}>
              {profile.avatarUri ? (
                <TouchableOpacity
                  onPress={() => setViewerVisible(true)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: profile.avatarUri }}
                    style={{
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                    }}
                  />
                </TouchableOpacity>
              ) : (
                <View
                  style={[
                    styles.avatarPlaceholder,
                    {
                      width: avatarSize,
                      height: avatarSize,
                      borderRadius: avatarSize / 2,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <SafeText
                    style={{
                      color: colors.primary,
                      fontWeight: "700",
                      fontSize: Math.max(16, Math.round(avatarSize / 3)),
                    }}
                  >
                    {initials}
                  </SafeText>
                </View>
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12 }}>
              <SafeText
                style={{
                  color: colors.foreground,
                  fontSize: Math.max(16, Math.round(avatarSize / 4)),
                  fontWeight: "700",
                }}
              >
                {profile.fullName ?? profile.username}
              </SafeText>
              <SafeText style={{ color: colors.mutedForeground, marginTop: 4 }}>
                @{profile.username}
              </SafeText>

              <View
                style={{
                  flexDirection: "row",
                  marginTop: 10,
                  flexWrap: "wrap",
                }}
              >
                <View style={{ marginRight: 18 }}>
                  <SafeText
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {profile.tasksPublic ?? 0}
                  </SafeText>
                  <SafeText style={{ color: colors.mutedForeground }}>
                    Public
                  </SafeText>
                </View>
                <View style={{ marginRight: 18 }}>
                  <SafeText
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {profile.tasksCompleted ?? 0}
                  </SafeText>
                  <SafeText style={{ color: colors.mutedForeground }}>
                    Completed
                  </SafeText>
                </View>
                <View>
                  <SafeText
                    style={{ color: colors.foreground, fontWeight: "700" }}
                  >
                    {profile.followers ?? 0}
                  </SafeText>
                  <SafeText style={{ color: colors.mutedForeground }}>
                    Followers
                  </SafeText>
                </View>
              </View>
            </View>

            <View style={{ marginLeft: 8, alignItems: "flex-end" }}>
              <TouchableOpacity
                onPress={toggleFollow}
                style={[
                  styles.followBtn,
                  {
                    backgroundColor: profile.isFollowing
                      ? colors.background
                      : colors.primary,
                    borderColor: colors.border,
                  },
                ]}
                disabled={followLoading}
              >
                <SafeText
                  style={{
                    color: profile.isFollowing
                      ? colors.foreground
                      : colors.primaryForeground,
                    fontWeight: "700",
                  }}
                >
                  {followLoading
                    ? "..."
                    : profile.isFollowing
                    ? "Following"
                    : "Follow"}
                </SafeText>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={onMessage}
                style={[
                  styles.messageBtn,
                  { marginTop: 10, borderColor: colors.border },
                ]}
              >
                <Icon
                  name="message-outline"
                  size={18}
                  color={colors.cardForeground}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bio */}
          <View style={{ marginTop: 14 }}>
            {renderBio(profile.bio)}
            {profile.website ? (
              <TouchableOpacity
                onPress={() => openUrl(profile.website || "")}
                style={{ marginTop: 8 }}
              >
                <SafeText
                  style={{
                    color: colors.primary,
                    textDecorationLine: "underline",
                  }}
                >
                  {profile.website}
                </SafeText>
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Images grid */}
          {images.length ? (
            <View style={{ marginTop: 18 }}>
              <SafeText
                style={{
                  color: colors.foreground,
                  fontWeight: "700",
                  marginBottom: 8,
                }}
              >
                Public photos
              </SafeText>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {/* We don't use 'gap' in RN; emulate grid spacing via margins */}
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    marginHorizontal: -4,
                  }}
                >
                  {images.map((img, idx) => (
                    <TouchableOpacity
                      key={img.uri + idx}
                      onPress={() => openViewer(idx)}
                      style={{
                        width: imageSize,
                        height: Math.round((imageSize * 2) / 3),
                        margin: 4,
                        borderRadius: 8,
                        overflow: "hidden",
                      }}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: img.uri }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ) : null}

          {/* Recent public activity */}
          <View style={{ marginTop: 18 }}>
            <SafeText style={{ color: colors.foreground, fontWeight: "700" }}>
              Recent public activity
            </SafeText>
            {profile.recentPublicActivities?.length ?? 0 ? (
              profile.recentPublicActivities!.map((a) => (
                <View
                  key={a.id}
                  style={[styles.activityRow, { backgroundColor: colors.card }]}
                >
                  <SafeText style={{ color: colors.foreground }}>
                    {a.title}
                  </SafeText>
                  <SafeText
                    style={{ color: colors.mutedForeground, marginTop: 6 }}
                  >
                    {new Date(a.createdAt).toLocaleString()}
                  </SafeText>
                </View>
              ))
            ) : (
              <SafeText style={{ color: colors.mutedForeground, marginTop: 8 }}>
                No public activity yet.
              </SafeText>
            )}
          </View>

          {/* Report */}
          <View style={{ marginTop: 20 }}>
            <TouchableOpacity
              onPress={onReport}
              style={[styles.reportBtn, { borderColor: colors.border }]}
            >
              <SafeText style={{ color: colors.destructive ?? "#d00" }}>
                Report profile{" "}
              </SafeText>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Image viewer */}
      <ImageViewing
        images={images}
        imageIndex={viewerIndex}
        visible={viewerVisible}
        onRequestClose={() => setViewerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerContainer: {
    width: "100%",
    borderBottomWidth: 1,
  },
  headerInner: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "space-between",
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: "700",
    fontSize: 16,
    marginHorizontal: 8,
  },

  content: { width: "100%" },

  topRow: { flexDirection: "row", alignItems: "center" },

  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  followBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  messageBtn: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  activityRow: { marginTop: 12, padding: 12, borderRadius: 10 },

  reportBtn: {
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
  },
});
