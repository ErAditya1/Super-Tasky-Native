// components/InviteMemberDialog.tsx
import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InviteMemberForm from "./forms/InviteMemberForm";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

// adjust path if needed

type Props = {
  children: React.ReactNode;
  /**
   * Optional: allow controlling modal externally.
   */
  initiallyOpen?: boolean;
};

export default function InviteMemberDialog({ children, initiallyOpen = false }: Props) {
  const [open, setOpen] = useState<boolean>(initiallyOpen);
    const { isDark } = useThemeToggle();
    const colors = theme[isDark ? "dark" : "light"];

  return (
    <>
      {/* Trigger */}
      <TouchableOpacity onPress={() => setOpen(true)} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>

      {/* Modal */}
      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.wrapper}
          >
            <View style={[styles.sheet,{backgroundColor: colors.background}]}>
              {/* Header */}
              <View style={styles.header}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.title,{color:colors.foreground}]}>Invite Members</Text>
                  <Text style={[styles.description, {color:colors.foreground}]}>Invite members into your team</Text>
                </View>

                <TouchableOpacity
                  onPress={() => setOpen(false)}
                  accessibilityLabel="Close"
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={colors.foreground} />
                </TouchableOpacity>
              </View>

              {/* Body: make it scrollable in case the form is tall */}
              <ScrollView contentContainerStyle={styles.content}>
                {/* The form receives setOpen so it can close modal after successful invite */}
                <InviteMemberForm setOpen={setOpen} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  wrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 20,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    minHeight: 240,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    color: "#6b7280",
    fontSize: 13,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    marginLeft: 12,
  },
  content: {
    paddingBottom: 12,
  },
});
