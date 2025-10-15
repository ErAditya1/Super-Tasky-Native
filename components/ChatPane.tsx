// app/components/ChatPane.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Image,
  Alert,
  Modal,
  LayoutAnimation,
  UIManager,
  SafeAreaView,
  Dimensions,
  Linking,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";

import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import ImageViewing from "react-native-image-viewing";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type Message = {
  id: string;
  text?: string;
  senderId: string;
  senderName?: string;
  createdAt: string; // ISO string
  imageUri?: string | null;
  fileUri?: string | null;
  fileName?: string | null;
  reactions?: Record<string, string[]>; // emoji -> userIds
  readBy?: string[]; // user ids
};

type ChatPaneProps = {
  chatId?: string;
  chatName?: string;
  chatSubtitle?: string; // e.g., "online" or "last seen"
  initialMessages?: Message[];
  onBack?: () => void;
  onOpenContact?: () => void;
};

const WINDOW_HEIGHT = Dimensions.get("window").height;

const SAMPLE_MESSAGES: Message[] = [
  {
    id: "m1",
    text: "Hey everyone! I've updated the mockups for the new feature https://example.com/mockups",
    senderId: "u2",
    senderName: "Sarah Chen",
    createdAt: new Date().toISOString(),
    reactions: { "👍": ["me"] },
    readBy: ["me", "u2"],
  },
  {
    id: "m2",
    text: "Looks great! I'll review them this afternoon",
    senderId: "me",
    senderName: "You",
    createdAt: new Date().toISOString(),
    reactions: {},
    readBy: ["me"],
  },
];

export default function ChatPane({
  chatId,
  chatName,
  chatSubtitle,
  initialMessages,
  onBack,
  onOpenContact,
}: ChatPaneProps) {
  const { isDark } = useThemeToggle() as any;
  const colors = theme[isDark ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<Message[]>(
    initialMessages ?? SAMPLE_MESSAGES
  );
  const [text, setText] = useState<string>("");
  const [composerH, setComposerH] = useState<number>(44);
  const [emojiModal, setEmojiModal] = useState<boolean>(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  const flatRef = useRef<FlatList<Message> | null>(null);
  const composerRef = useRef<TextInput | null>(null);

  const currentUserId = "me";

  // mark messages read locally on open
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => {
        if (!m.readBy?.includes(currentUserId)) {
          return { ...m, readBy: [...(m.readBy ?? []), currentUserId] };
        }
        return m;
      })
    );
  }, [chatId]);

  // keyboard listeners to adjust padding / avoid overlap on Android and iOS
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(e.endCoordinates.height);
      // scroll to bottom
      setTimeout(() => scrollToBottom(), 120);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setKeyboardHeight(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // auto scroll on messages change
  useEffect(() => {
    const t = setTimeout(() => scrollToBottom(), 140);
    return () => clearTimeout(t);
  }, [messages]);

  const scrollToBottom = () => {
    try {
      flatRef.current?.scrollToEnd?.({ animated: true });
    } catch {
      // fallback
      try {
        flatRef.current?.scrollToOffset?.({ offset: 99999, animated: true });
      } catch {}
    }
  };

  const keyboardDismissAndScroll = () => {
    Keyboard.dismiss();
    setTimeout(() => scrollToBottom(), 140);
  };

  // send text locally
  const sendText = useCallback(() => {
    if (!text.trim()) return;
    const newMsg: Message = {
      id: `local-${Date.now()}`,
      text: text.trim(),
      senderId: currentUserId,
      senderName: "You",
      createdAt: new Date().toISOString(),
      reactions: {},
      readBy: [currentUserId],
    };
    setMessages((prev) => [...prev, newMsg]);
    setText("");
    keyboardDismissAndScroll();
  }, [text]);

  // pick a document (fixed handling)
  const pickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: false,
      });
      // res = { type: 'success', uri, name, size, mimeType } OR { type: 'cancel' }
      if (res.type !== "success") {
        // user cancelled or different shape
        return;
      }
      // ensure uri exists
      if (!res.uri) {
        Alert.alert("Document error", "No file URI returned.");
        return;
      }
      const newMsg: Message = {
        id: `local-doc-${Date.now()}`,
        senderId: currentUserId,
        senderName: "You",
        createdAt: new Date().toISOString(),
        fileUri: res.uri,
        fileName: res.name ?? "Document",
        reactions: {},
        readBy: [currentUserId],
      };
      setMessages((prev) => [...prev, newMsg]);
      keyboardDismissAndScroll();
    } catch (e) {
      console.warn("pickDocument error", e);
      Alert.alert("Error", "Unable to pick document.");
    }
  };

  // toggle reaction locally (simple)
  const toggleReaction = (emoji: string, msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== msgId) return m;
        const reactions = { ...(m.reactions ?? {}) };
        const list = reactions[emoji] ?? [];
        const has = list.includes(currentUserId);
        if (has) {
          const newList = list.filter((u) => u !== currentUserId);
          if (newList.length) reactions[emoji] = newList;
          else delete reactions[emoji];
        } else {
          reactions[emoji] = [...list, currentUserId];
        }
        return { ...m, reactions };
      })
    );
  };

  // small emoji set — no gifs, only unicode emoji (keeps keyboard GIFs out of picker)
  const EMOJIS = useMemo(
    () => [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😙",
      "😚",
      "🤗",
      "🤔",
      "🤨",
      "😐",
      "😑",
      "😶",
      "🙏",
      "👍",
      "👎",
      "👏",
      "🙌",
      "🤝",
      "✌️",
      "🤞",
      "🔥",
      "✨",
      "🚀",
      "🎉",
      "✅",
      "❗️",
      "💡",
      "🧠",
      "❤️",
      "😢",
      "🤯",
      "😴",
      "😎",
      "😜",
    ],
    []
  );

  // insert emoji at cursor / end
  const insertEmoji = (e: string) => {
    setText((s) => s + e);
    setEmojiModal(false);
    setTimeout(() => composerRef.current?.focus(), 100);
  };

  // open file (document) uri in system
  const openFile = async (uri?: string | null) => {
    if (!uri) return;
    try {
      const ok = await Linking.canOpenURL(uri);
      if (ok) await Linking.openURL(uri);
      else
        Alert.alert(
          "Cannot open file",
          "This file cannot be opened on this device."
        );
    } catch (err) {
      console.warn("openFile error", err);
      Alert.alert("Cannot open file", "Error opening file.");
    }
  };

  // basic link detection for text bubble
  const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
  const openUrl = async (raw: string) => {
    let url = raw;
    if (!/^https?:\/\//i.test(url)) url = "http://" + url;
    try {
      const can = await Linking.canOpenURL(url);
      if (can) await Linking.openURL(url);
      else Alert.alert("Cannot open link", url);
    } catch (e) {
      console.warn("openUrl error", e);
      Alert.alert("Cannot open link", url);
    }
  };

  const renderTextWithLinks = (textStr?: string) => {
    if (!textStr) return null;
    const nodes: Array<{ type: "text" | "link"; text: string }> = [];
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = urlRegex.exec(textStr)) !== null) {
      const match = m[0];
      const start = m.index;
      if (start > lastIndex) {
        nodes.push({ type: "text", text: textStr.slice(lastIndex, start) });
      }
      nodes.push({ type: "link", text: match });
      lastIndex = start + match.length;
    }
    if (lastIndex < textStr.length) {
      nodes.push({ type: "text", text: textStr.slice(lastIndex) });
    }

    return (
      <Text style={{ color: colors.cardForeground }}>
        {nodes.map((n, i) => {
          if (n.type === "text") return <Text key={i}>{n.text}</Text>;
          return (
            <Text
              key={i}
              onPress={() => openUrl(n.text)}
              style={{ color: colors.primary, textDecorationLine: "underline" }}
            >
              {n.text}
            </Text>
          );
        })}
      </Text>
    );
  };
  // 🖼️ Pick image from gallery
  const pickImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please allow access to your photos."
        );
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (res.canceled || !res.assets?.[0]) return;
      const image = res.assets[0];
      const newMsg: Message = {
        id: `img-${Date.now()}`,
        senderId: currentUserId,
        senderName: "You",
        createdAt: new Date().toISOString(),
        imageUri: image.uri,
        reactions: {},
        readBy: [currentUserId],
      };
      setMessages((prev) => [...prev, newMsg]);
      Keyboard.dismiss();
    } catch (e) {
      console.warn("pickImage error", e);
      Alert.alert("Error", "Unable to pick image.");
    }
  };

  // ---------------------------
  // 🔹 Open image viewer
  // ---------------------------
  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerVisible(true);
  };

  const images = messages
    .filter((m) => m.imageUri)
    .map((m) => ({ uri: m.imageUri! }));

  // render message
  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUserId;
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onLongPress={() => setEmojiModal(true)}
      >
        <View
          style={[
            styles.msgRow,
            isMe
              ? { justifyContent: "flex-end" }
              : { justifyContent: "flex-start" },
          ]}
        >
          {!isMe && (
            <View
              style={[styles.msgAvatar, { backgroundColor: colors.accent }]}
            >
              <Text
                style={{ color: colors.accentForeground, fontWeight: "700" }}
              >
                {item.senderName?.charAt(0) ?? "U"}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.msgBubble,
              isMe
                ? { backgroundColor: colors.primary }
                : {
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                  },
            ]}
          >
            {item.imageUri && (
              <TouchableOpacity
                onPress={() =>
                  openViewer(images.findIndex((i) => i.uri === item.imageUri))
                }
              >
                <Image
                  source={{ uri: item.imageUri }}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 12,
                    marginTop: 6,
                  }}
                />
              </TouchableOpacity>
            )}

            {item.fileName ? (
              <TouchableOpacity
                onPress={() => openFile(item.fileUri)}
                style={{ marginBottom: 6 }}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon
                    name="file-outline"
                    size={18}
                    color={
                      isMe ? colors.primaryForeground : colors.cardForeground
                    }
                  />
                  <Text
                    style={{
                      color: isMe
                        ? colors.primaryForeground
                        : colors.cardForeground,
                    }}
                  >
                    {item.fileName}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {item.text ? renderTextWithLinks(item.text) : null}

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                marginTop: 6,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.mutedForeground, fontSize: 11 }}>
                {new Date(item.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>

            {item.reactions && Object.keys(item.reactions).length ? (
              <View
                style={[
                  styles.reactionsRow,
                  {
                    backgroundColor: isMe
                      ? `${colors.primary}12`
                      : colors.background,
                  },
                ]}
              >
                {Object.entries(item.reactions).map(([emoji, list]) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => toggleReaction(emoji, item.id)}
                    style={styles.reactionPill}
                  >
                    <Text>
                      {emoji} {list.length}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const composerTotalHeight = Math.max(56, composerH) + 16;
  const listBottomPadding =
    composerTotalHeight + insets.bottom + (keyboardHeight || 0) + 12;

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingBottom: insets.bottom },
      ]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <TouchableOpacity onPress={onBack} style={{ padding: 8 }}>
              <Icon name="arrow-left" size={22} color={colors.cardForeground} />
            </TouchableOpacity>

            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: colors.cardForeground,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {chatName ?? "Chat"}
              </Text>
              <Text
                numberOfLines={1}
                style={{ color: colors.mutedForeground, fontSize: 12 }}
              >
                {chatSubtitle ?? "last seen recently"}
              </Text>
            </View>
          </View>

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginLeft: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => Alert.alert("Voice call")}
              style={{ padding: 8 }}
            >
              <Icon name="phone" size={20} color={colors.cardForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert("Video call")}
              style={{ padding: 8 }}
            >
              <Icon name="video" size={20} color={colors.cardForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => Alert.alert("More")}
              style={{ padding: 8 }}
            >
              <Icon
                name="dots-vertical"
                size={20}
                color={colors.cardForeground}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(i) => i.id}
          contentContainerStyle={{
            padding: 12,
            paddingBottom: listBottomPadding,
          }}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        />

        {/* Composer */}
        <View
          style={[
            styles.composer,
            {
              backgroundColor: colors.card,
              borderTopColor: colors.border,
              paddingBottom: Platform.OS === "ios" ? insets.bottom : 12,
              marginBottom: Platform.OS === "android" ? keyboardHeight : 0,
            },
          ]}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              paddingHorizontal: 12,
              gap: 8,
            }}
          >
            <TouchableOpacity
              onPress={() => setEmojiModal(true)}
              style={{ padding: 8 }}
            >
              <Icon
                name="emoticon-outline"
                size={22}
                color={colors.cardForeground}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={pickDocument} style={{ padding: 8 }}>
              <Icon name="paperclip" size={22} color={colors.cardForeground} />
            </TouchableOpacity>
            {/* 🖼️ New image picker */}
            <TouchableOpacity onPress={pickImage} style={{ padding: 8 }}>
              <Icon
                name="image-outline"
                size={22}
                color={colors.cardForeground}
              />
            </TouchableOpacity>

            <TextInput
              ref={composerRef}
              placeholder="Type a message"
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              autoCorrect={false}
              textContentType="none" // reduces keyboard suggestions; cannot disable GIF keyboard
              onContentSizeChange={(e) => {
                const h = Math.min(
                  120,
                  Math.max(44, e.nativeEvent.contentSize.height + 8)
                );
                setComposerH(h);
              }}
              style={[
                styles.input,
                {
                  height: composerH,
                  color: colors.cardForeground,
                  backgroundColor: colors.background,
                },
              ]}
              accessibilityLabel="Message input"
            />

            <TouchableOpacity
              onPress={sendText}
              style={[
                styles.send,
                {
                  backgroundColor: text.trim() ? colors.primary : colors.border,
                },
              ]}
            >
              <Icon
                name="send"
                size={18}
                color={
                  text.trim() ? colors.primaryForeground : colors.cardForeground
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Emoji modal: custom simple picker (no gifs) */}
        <Modal visible={emojiModal} animationType="slide" transparent>
          <View style={{ flex: 1, justifyContent: "flex-end" }}>
            <View
              style={[
                styles.emojiModal,
                {
                  backgroundColor: colors.card,
                  borderTopColor: colors.border,
                  paddingBottom: Math.max(insets.bottom, 12),
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <Text
                  style={{
                    color: colors.cardForeground,
                    fontWeight: "700",
                    flex: 1,
                  }}
                >
                  Emoji
                </Text>
                <TouchableOpacity onPress={() => setEmojiModal(false)}>
                  <Text style={{ color: colors.primary }}>Close</Text>
                </TouchableOpacity>
              </View>

              <View
                style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 8 }}
              >
                {EMOJIS.map((e) => (
                  <TouchableOpacity
                    key={e}
                    onPress={() => insertEmoji(e)}
                    style={{ padding: 10 }}
                  >
                    <Text style={{ fontSize: 22 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>
        {/* Image Viewer */}
        <ImageViewing
          images={images}
          imageIndex={viewerIndex}
          visible={viewerVisible}
          onRequestClose={() => setViewerVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // header
  header: {
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 8,
  },

  // messages
  msgRow: { flexDirection: "row", marginBottom: 10, alignItems: "flex-end" },
  msgAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  msgBubble: {
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    maxWidth: "78%",
  },
  msgImage: { width: 220, height: 140, borderRadius: 8, marginBottom: 8 },
  reactionsRow: {
    flexDirection: "row",
    marginTop: 8,
    padding: 6,
    borderRadius: 12,
  },
  reactionPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
  },

  // composer
  composer: { borderTopWidth: 1 },
  input: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    marginRight: 8,
    minHeight: 44,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },

  // emoji modal
  emojiModal: {
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
});
