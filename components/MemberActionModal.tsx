// components/MemberActionsModal.tsx
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";
import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";

type Action = {
  id: string;
  label: string;
  destructive?: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  memberName?: string;
  actions: Action[];
  onSelect: (actionId: string) => void;
};

export default function MemberActionsModal({
  visible,
  onClose,
  memberName,
  actions,
  onSelect,
}: Props) {

    const {isDark} = useThemeToggle()
    const colors = theme[isDark ? "dark" : "light"];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={[styles.overlay]} onPress={onClose}>
        <View style={[styles.container, Platform.OS === "ios" ? styles.iosContainer : undefined,{backgroundColor: colors.background} ]}>
          <Text style={[styles.title, {color:colors.foreground}]}>{memberName ?? "Member"}</Text>

          {actions.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => {
                onSelect(a.id);
                onClose();
              }}
              style={[styles.actionRow]}
              accessibilityRole="button"
            >
              <Text style={[styles.actionText, a.destructive && styles.destructiveText,{color:colors.foreground}]}>
                {a.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} accessibilityRole="button">
            <Text style={[styles.cancelText, {color:colors.destructive}]}>Cancel </Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1,  justifyContent: "flex-end" },
  container: {
    backgroundColor: "#fff",
    padding: 12,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  iosContainer: {
    // subtle shadow on iOS
  },
  title: { fontWeight: "700", fontSize: 16, marginBottom: 8 },
  actionRow: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#eee" },
  actionText: { fontSize: 16 },
  destructiveText: { color: "#dc2626", fontWeight: "700" },
  cancelBtn: { paddingVertical: 14, alignItems: "center" },
  cancelText: { color: "#6b7280", fontWeight: "700" },
});
