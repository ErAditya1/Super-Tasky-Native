// app/(auth)/Signup.tsx
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

const { width } = Dimensions.get("window");

export default function SignupScreen() {
  const router = useRouter();
  const { isDark } = useThemeToggle();
  const currentTheme = theme[isDark ? "dark" : "light"];

  const [name, setName] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [teamCode, setTeamCode] = React.useState("");

  // Animated logo
  const logoScale = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.spring(logoScale, {
      toValue: 1,
      friction: 5,
      tension: 50,
      useNativeDriver: true,
    }).start();
  }, []);

  const onSignup = () => {
    if (!name || !username || !email || !password) {
      Alert.alert("Error", "Please fill all required fields");
      return;
    }
    Alert.alert(
      "Sign Up",
      `Name: ${name}\nUsername: ${username}\nEmail: ${email}\nTeam Code: ${teamCode || "N/A"}`
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      

      <View style={[styles.card, { backgroundColor: currentTheme.card, shadowColor: currentTheme.primary }]}>
         <View style={{width:'100%', marginHorizontal: 'auto', alignItems:'center'}}>
            <Animated.Image
          source={require("../../assets/image/detailed_logo.jpg")}
          style={[styles.logo, { transform: [{ scale: logoScale }] }]}
          resizeMode="contain"
        />
        </View>
        <Text style={[styles.title, { color: currentTheme.foreground }]}>Sign Up</Text>

        <TextInput
          placeholder="Full Name"
          placeholderTextColor={currentTheme.mutedForeground}
          value={name}
          onChangeText={setName}
          style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.foreground }]}
        />
        <TextInput
          placeholder="Username"
          placeholderTextColor={currentTheme.mutedForeground}
          value={username}
          onChangeText={setUsername}
          style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.foreground }]}
        />
        <TextInput
          placeholder="Email"
          placeholderTextColor={currentTheme.mutedForeground}
          value={email}
          onChangeText={setEmail}
          style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.foreground }]}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor={currentTheme.mutedForeground}
          value={password}
          onChangeText={setPassword}
          style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.foreground }]}
          secureTextEntry
        />
        <TextInput
          placeholder="Team Code (optional)"
          placeholderTextColor={currentTheme.mutedForeground}
          value={teamCode}
          onChangeText={setTeamCode}
          style={[styles.input, { backgroundColor: currentTheme.background, color: currentTheme.foreground }]}
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: currentTheme.primary, shadowColor: currentTheme.primary }]}
          onPress={onSignup}
          activeOpacity={0.8}
        >
          <Text style={{ color: currentTheme.primaryForeground, fontWeight: "700", fontSize: 16 }}>
            Sign Up
          </Text>
        </TouchableOpacity>

        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 16 }}>
          <Text style={{ color: currentTheme.foreground }}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/Login")}>
            <Text style={{ color: currentTheme.primary, fontWeight: "700" }}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },
  logo: {
    width: width * 0.2,
    height: width * 0.2,
    marginBottom: 32,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  card: {
    width: "100%",
    borderRadius: 24,
    padding: 24,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  input: {
    width: "100%",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#ccc",
  },
  button: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 12,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
