import { View, Text, StyleSheet } from "react-native";
import React from "react";
import { Image } from "expo-image";
import { theme } from "@/constants/Colors";
import { useThemeToggle } from "@/context/ThemeContext";

const Avatar = ({user}:any) => {
    const {isDark} =useThemeToggle()
    const currentTheme = theme[isDark ? "dark" : "light"];
  return (
    <View>
      {user?.avatar?.url ? (
        <>
          <Image
            source={{ uri: user?.avatar?.url }}
            style={{ width: 35, height: 35, borderRadius: 35 / 2 }}
          />

          {user?.isOnline && (
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: currentTheme.success },
              ]}
            />
          )}
        </>
      ) : (
        <View
          style={[
            styles.profileAvatar,
            { backgroundColor: currentTheme.sidebarPrimary },
          ]}
        >
          <Text
            style={{
              color: currentTheme.sidebarPrimaryForeground,
              fontWeight: "700",
            }}
          >
            {user?.name?.split(" ")[0][0]}
            {user?.name?.split(" ")[1][0]}
          </Text>
          {user?.isOnline && (
            <View
              style={[
                styles.onlineDot,
                { backgroundColor: currentTheme.success },
              ]}
            />
          )}
        </View>
      )}
    </View>
  );
};

export default Avatar;


const styles = StyleSheet.create({
    onlineDot: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
   profileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
})