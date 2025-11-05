import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import * as Clipboard from "expo-clipboard";

import {
  registerForPushNotificationsAsync,
  showLocalNotification,
  sendExpoPushNotification,
} from "@/services/notification";

type LogItem =
  | { id: string; type: "received"; title?: string | null; body?: string | null; date: number; data?: any }
  | { id: string; type: "response"; action?: string; input?: string | null; title?: string; body?: string; date: number; data?: any };

export default function NotificationCenter() {
  const [permission, setPermission] = useState<Notifications.PermissionStatus>("undetermined");
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [title, setTitle] = useState("Hello from Expo");
  const [body, setBody] = useState("This is a test message");
  const [useSound, setUseSound] = useState(true);
  const [useBadge, setUseBadge] = useState(true);

  const receivedSub = useRef<Notifications.Subscription | null>(null);
  const responseSub = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      // get current permission
      const perm = await Notifications.getPermissionsAsync();
      if (!mounted) return;
      setPermission(perm.status);

      // If granted and device, fetch token
      if (perm.status === "granted" && Device.isDevice) {
        const token = await registerForPushNotificationsAsync();
        if (mounted) setExpoPushToken(token);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    receivedSub.current?.remove();
    responseSub.current?.remove();

    receivedSub.current = Notifications.addNotificationReceivedListener((notification) => {
      const c = notification.request.content;
      setLogs((p) => [
        {
          id: `${Date.now()}-r`,
          type: "received",
          title: c.title ?? null,
          body: c.body ?? null,
          date: Date.now(),
          data: c.data,
        },
        ...p,
      ]);
    });

    responseSub.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const c = response.notification.request.content;
      setLogs((p) => [
        {
          id: `${Date.now()}-resp`,
          type: "response",
          action: response.actionIdentifier,
          input: (response as any).userText ?? null,
          title: c.title ?? undefined,
          body: c.body ?? undefined,
          date: Date.now(),
          data: c.data,
        },
        ...p,
      ]);
    });

    return () => {
      receivedSub.current?.remove();
      responseSub.current?.remove();
    };
  }, []);

  const canSend = useMemo(() => permission === "granted", [permission]);

  const handleRequestPerm = useCallback(async () => {
    const token = await registerForPushNotificationsAsync();
    const perm = await Notifications.getPermissionsAsync();
    setPermission(perm.status);
    if (token) setExpoPushToken(token);
  }, []);

  const handleCopyToken = useCallback(async () => {
    if (!expoPushToken) {
      Alert.alert("No token", "Grant permission on a real device first.");
      return;
    }
    await Clipboard.setStringAsync(expoPushToken);
    Alert.alert("Copied", "Expo push token copied to clipboard.");
  }, [expoPushToken]);

  const handleLocalNow = useCallback(async () => {
    await showLocalNotification({ title, body, data: { test: true } });
  }, [title, body]);

  const handleSchedule5 = useCallback(async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { scheduled: true },
        sound: useSound ? "default" : undefined,
        badge: useBadge ? 1 : undefined,
      },
      trigger: { seconds: 5 },
    });
    Alert.alert("Scheduled", "Notification will fire in ~5 seconds");
  }, [title, body, useSound, useBadge]);

  const handleSendRemote = useCallback(async () => {
    if (!expoPushToken) {
      Alert.alert("No token", "Grant permission on a real device first.");
      return;
    }
    try {
      const json = await sendExpoPushNotification(expoPushToken, title, body, { from: "client-test" });
      Alert.alert("Push sent", JSON.stringify(json));
    } catch (err: any) {
      Alert.alert("Error sending remote push", String(err.message ?? err));
    }
  }, [expoPushToken, title, body]);

  const handleClearLogs = useCallback(() => setLogs([]), []);

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Notification Tester</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Permission: {permission}</Text>
        <Pressable style={styles.btn} onPress={handleRequestPerm}>
          <Text style={styles.btnText}>Request Permission</Text>
        </Pressable>

        <Text style={styles.label}>Expo Push Token (device):</Text>
        <Text style={styles.token}>{expoPushToken ?? "No token yet"}</Text>
        <View style={styles.row}>
          <Pressable style={styles.smallBtn} onPress={handleCopyToken}>
            <Text style={styles.btnText}>Copy token</Text>
          </Pressable>
          <Pressable style={styles.smallBtn} onPress={() => Alert.alert("Info", "Open https://expo.dev/notifications and paste token to test remote push")}>
            <Text style={styles.btnText}>How to test remote</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Notification title" />
        <TextInput style={[styles.input, { height: 80 }]} value={body} onChangeText={setBody} placeholder="Notification body" multiline />

        <View style={styles.row}>
          <View style={styles.switchRow}>
            <Text>Sound</Text>
            <Switch value={useSound} onValueChange={setUseSound} />
          </View>
          <View style={styles.switchRow}>
            <Text>Badge</Text>
            <Switch value={useBadge} onValueChange={setUseBadge} />
          </View>
        </View>

        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={handleLocalNow}>
            <Text style={styles.btnText}>Show Local Now</Text>
          </Pressable>

          <Pressable style={styles.btn} onPress={handleSchedule5}>
            <Text style={styles.btnText}>Schedule +5s</Text>
          </Pressable>
        </View>

        <Pressable style={[styles.btn, { marginTop: 8 }]} onPress={handleSendRemote}>
          <Text style={styles.btnText}>Send Remote Push (via Expo API)</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Event Log</Text>
          <Pressable onPress={handleClearLogs}>
            <Text style={{ color: "#7ea1ff" }}>Clear</Text>
          </Pressable>
        </View>

        <FlatList
          data={logs}
          keyExtractor={(i) => i.id}
          style={{ maxHeight: 260 }}
          renderItem={({ item }) => (
            <View style={styles.log}>
              <Text style={{ fontWeight: "700" }}>{item.type.toUpperCase()}</Text>
              <Text>{item.title}</Text>
              <Text style={{ color: "#aaa" }}>{item.body}</Text>
              <Text style={{ color: "#999", fontSize: 12 }}>{new Date(item.date).toLocaleTimeString()}</Text>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 48, backgroundColor: "#fff" },
  h1: { fontSize: 20, fontWeight: "700", marginBottom: 12 },
  card: { backgroundColor: "#f7f7f7", padding: 12, borderRadius: 10, marginBottom: 12 },
  label: { marginBottom: 6, fontWeight: "600" },
  token: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace" }), color: "#333" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  smallBtn: { backgroundColor: "#2f6bff", padding: 8, borderRadius: 8 },
  btn: { backgroundColor: "#2f6bff", padding: 12, borderRadius: 10, marginTop: 8 },
  btnText: { color: "#fff", fontWeight: "700" },
  input: { backgroundColor: "white", borderWidth: 1, borderColor: "#ddd", padding: 8, borderRadius: 8, marginBottom: 8 },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  log: { padding: 8, borderRadius: 8, backgroundColor: "#fff", borderWidth: 1, borderColor: "#eee", marginBottom: 8 },
});
