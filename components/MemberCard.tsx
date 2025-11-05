// components/MemberCard.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Avatar from "@/components/Avatar";
import { Ionicons } from "@expo/vector-icons";

type Member = {
  _id?: string;
  id?: string;
  name: string;
  username?: string;
  role?: string;
  avatar?: { url?: string };
  isOnline?: boolean;
  status?: string;
};

type Props = {
  member: Member;
  theme: any;
  onPress?: (member: Member) => void;
  onMessage?: (member: Member) => void;
  style?: any;
  showActions?: boolean;
};

export default function MemberCard({
  member,
  theme,
  onPress,
  onMessage,
  style,
  showActions = true,
}: Props) {
  const isOnline = !!member?.isOnline;
  const statusText =  (isOnline ? "online" : "offline");

  const statusColor =
    statusText.toLowerCase() === "active"
      ? theme.primary
      : statusText.toLowerCase() === "offline"
      ? theme.mutedForeground
      : isOnline
      ? "#22c55e"
      : theme.mutedForeground;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => onPress?.(member)}
      style={[
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        style,
      ]}
    >
      <View style={styles.left}>
        <View style={styles.avatarWrap}>
          <Avatar user={member as any} size={44} />
        </View>
      </View>

      <View style={styles.body}>
        <Text
          numberOfLines={1}
          style={[styles.name, { color: theme.cardForeground }]}
        >
          {member.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.meta, { color: theme.mutedForeground }]}
        >
          @{member.username ?? ""}
          {member.role ? ` • ${member.role}` : ""}
        </Text>
      </View>

      <View style={styles.right}>
        <View
          style={[
            styles.statusPill,
            {
              borderColor: theme.border,
              backgroundColor:
                statusColor === theme.primary
                  ? `${theme.primary}11`
                  : "transparent",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color:
                  statusColor === theme.primary
                    ? theme.primary
                    : theme.mutedForeground,
              },
            ]}
          >
            {statusText
              ? statusText[0].toUpperCase() + statusText.slice(1)
              : isOnline
              ? "Online"
              : "Offline"}
          </Text>
        </View>

        {showActions && (
          <>
            <TouchableOpacity
              onPress={() => onMessage?.(member)}
              style={styles.iconBtn}
              accessibilityLabel="Message member"
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color={theme.mutedForeground}
              />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onPress?.(member)}
              style={[styles.iconBtn, { marginLeft: 6 }]}
              accessibilityLabel="Open profile"
            >
              <Ionicons
                name="chevron-forward"
                size={18}
                color={theme.mutedForeground}
              />
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  left: { width: 56, alignItems: "center", justifyContent: "center" },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineDot: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  body: { flex: 1, paddingRight: 8, justifyContent: "center" },
  name: { fontSize: 15, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 4 },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    minWidth: 68,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  iconBtn: { padding: 8, borderRadius: 8, marginLeft: 8 },
});
