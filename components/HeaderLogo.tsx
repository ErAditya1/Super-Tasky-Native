import { View, Text, useColorScheme } from "react-native";
import React from "react";
import { Image } from "expo-image";
import { theme } from "@/constants/Colors";

const HeaderLogo = () => {
      const colorScheme = useColorScheme();
      const currentTheme = theme[colorScheme ?? "light"];
  return (
    <View
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        marginVertical: 20,
      }}
    >
      <Image
        source={require("@/assets/image/icon.png")}
        style={{
          width: 50,
          height: 50,
          borderRadius: 40,
        }}
      />
      <Text style={{ fontSize: 20, fontWeight: 900, color:currentTheme.cardForeground }}>Super Tasky </Text>
    </View>
  );
};

export default HeaderLogo;
