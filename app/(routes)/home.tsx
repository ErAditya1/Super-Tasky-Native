import { View, Text, useColorScheme } from "react-native";
import React from "react";
import { Stack } from "expo-router";
import { theme } from "@/constants/Colors";
import HeaderLogo from "@/components/HeaderLogo";

const home = () => {
  const colorScheme = useColorScheme();
  const currentTheme = theme[colorScheme ?? "light"];
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: currentTheme.background,
      }}
    >
      <Stack.Screen
        options={{
          title: "External home",
          headerStyle: { backgroundColor: currentTheme.card },
          headerTintColor: currentTheme.cardForeground,
          headerTitleStyle: {
            fontWeight: "bold",
          },

          // headerTitle: (props) => (
          //   <Text {...props} style={{ color: currentTheme.foreground }}>
          //     <HeaderLogo/>
          //   </Text>
          // ),
        }}
      />
      <Text>Home Screen</Text>
    </View>
  );
};

export default home;
