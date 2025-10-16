import React, { useMemo, useRef } from "react";
import {
  View,
  Text,
  TouchableWithoutFeedback,
  Animated,
  StyleSheet,
} from "react-native";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome, Ionicons } from "@expo/vector-icons";

import { theme } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useThemeToggle } from "@/context/ThemeContext";

type TabBarProps = {
  state: any;
  descriptors: any;
  navigation: any;
};

function Icon({
  name,
  lib,
  color,
  size = 26,
}: {
  name: string;
  lib: string;
  color?: string;
  size?: number;
}) {
  if (lib === "fa")
    return <FontAwesome name={name as any} size={size} color={color} />;
  return <Ionicons name={name as any} size={size} color={color} />;
}

function CustomTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const animated = useRef(
    state.routes.map(() => new Animated.Value(0))
  ).current;

  useMemo(() => {
    state.routes.forEach((route: any, idx: number) => {
      const isFocused = state.index === idx;
      Animated.timing(animated[idx], {
        toValue: isFocused ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  }, [state.index]);

  const tabBarBackground = adjustAlpha(currentTheme.card, 1);

  return (
    <View
      style={[
        styles.container,
        {
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderTopColor: adjustAlpha(currentTheme.border, 1),
          backgroundColor: tabBarBackground,
          bottom: insets.bottom ,
          elevation: 8,
        },
      ]}
      pointerEvents="auto"
    >
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;

        // Map route names to icons
        let iconName = "";
        let lib: string = "io";
        switch ((route.name || "").toLowerCase()) {
          case "index":
          case "home":
            lib = "fa";
            iconName = "home";
            break;
          case "projects":
          case "folder":
            lib = "fa";
            iconName = "folder-open";
            break;
          case "inbox":
          case "messages":
            lib = "io";
            iconName = "chatbubble-ellipses";
            break;
          case "activity":
            lib = "io";
            iconName = "notifications-outline";
            break;
          case "settings":
            lib = "fa";
            iconName = "gear";
            break;
          default:
            lib = "fa";
            iconName = "circle";
        }

        // Animated scale for active tab
        const animatedStyle = {
          transform: [
            {
              scale: animated[index].interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.12],
              }),
            },
          ],
        } as any;

        // Label opacity
        const labelOpacity = animated[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0.7, 1],
        });

        // Icon & label color based on active state
        const color = isFocused
          ? currentTheme.primary
          : currentTheme.mutedForeground;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }

          Animated.sequence([
            Animated.timing(animated[index], {
              toValue: 1,
              duration: 120,
              useNativeDriver: true,
            }),
            Animated.timing(animated[index], {
              toValue: 0,
              duration: 180,
              useNativeDriver: true,
            }),
            Animated.timing(animated[index], {
              toValue: isFocused ? 1 : 0,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        };

        const onLongPress = () =>
          navigation.emit({ type: "tabLongPress", target: route.key });

        return (
          <TouchableWithoutFeedback
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
          >
            <Animated.View style={[styles.tabItem, { flex: 1 }, animatedStyle]}>
              <Icon name={iconName} lib={lib} color={color} />
              <Animated.Text
                style={[styles.label, { color, opacity: labelOpacity }]}
                numberOfLines={1}
              >
                {label}
              </Animated.Text>
            </Animated.View>
          </TouchableWithoutFeedback>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props: any) => <CustomTabBar {...props} />}
    >
      
      <Tabs.Screen name="index"  />
      <Tabs.Screen name="projects" />
      <Tabs.Screen name="inbox" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="activity" />
    </Tabs>
  );
}

// ---------- helpers & styles ----------
function adjustAlpha(hex: string, alpha: number) {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    height: 68,
    zIndex: 1000,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: "600",
  },
});
