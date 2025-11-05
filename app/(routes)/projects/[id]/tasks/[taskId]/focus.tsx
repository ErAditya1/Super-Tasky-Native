// app/focus/index.tsx
import React, { JSX, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
  Vibration,
  AccessibilityInfo,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Switch } from "react-native";
import { Audio } from "expo-av";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";

// Replace these with your project API helpers
import { startFocus, endFocus, getFocusStatus } from "@/lib/api/focus";
import { getTaskById } from "@/lib/api/task";
import { useThemeToggle } from "@/context/ThemeContext";
import { theme } from "@/constants/Colors";

/* ---------- Keys & types ---------- */
const LS_KEYS = {
  SETTINGS: "zen:settings",
  STATE: "zen:state",
  HISTORY: "zen:history",
  SERVER_STATE: "zen:serverstate",
  MARK_COMPLETE: "zen:markComplete",
};

type SettingsType = {
  workMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  sessionsBeforeLong: number;
  soundEnabled: boolean;
  autoStartNext: boolean;
  markTaskCompleteOnFinish?: boolean;
};

type Mode = "work" | "shortBreak" | "longBreak";

type StateType = {
  timeLeft: number; // seconds
  isRunning: boolean;
  isBreak: boolean;
  currentCycleCount: number;
  mode: Mode;
  lastTickAt?: number;
};

const DEFAULT_SETTINGS: SettingsType = {
  workMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  sessionsBeforeLong: 4,
  soundEnabled: true,
  autoStartNext: false,
  markTaskCompleteOnFinish: false,
};

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/* ---------- Notifications channel setup (Android) ---------- */
async function ensureNotificationChannel() {
  if (Platform.OS === "android") {
    try {
      await Notifications.setNotificationChannelAsync("zen-focus", {
        name: "Zen Focus",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
      });
    } catch (e) {
      // ignore
    }
  }
}

/* Make sure Expo Notifications is configured in app.json/app.config.js:
   - permissions for iOS etc.
   - see expo-notifications docs
*/

export default function FocusScreen(): JSX.Element {
  const params = useLocalSearchParams();
  const taskId = (params as any).taskId as string | undefined;
    const { isDark } = useThemeToggle();
    const colors = theme[isDark ? "dark" : "light"];

  // settings & local state
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [state, setState] = useState<StateType>({
    timeLeft: DEFAULT_SETTINGS.workMin * 60,
    isRunning: false,
    isBreak: false,
    currentCycleCount: 0,
    mode: "work",
  });

  const [history, setHistory] = useState<string[]>([]);
  const [serverSession, setServerSession] = useState<any | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [markComplete, setMarkComplete] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [zenMode, setZenMode] = useState(false);

  // audio / notification refs
  const soundRef = useRef<Audio.Sound | null>(null);
  const intervalRef = useRef<number | null>(null);
  const scheduledNotifIdRef = useRef<string | null>(null);

  /* ---------- persist/load ---------- */
  useEffect(() => {
    // DO NOT return a Promise directly - use inner async
    (async () => {
      await ensureNotificationChannel();
      try {
        const rawSettings = await AsyncStorage.getItem(LS_KEYS.SETTINGS);
        if (rawSettings) {
          const parsed = JSON.parse(rawSettings);
          setSettings((s) => ({ ...s, ...parsed }));
        }
        const rawState = await AsyncStorage.getItem(LS_KEYS.STATE);
        if (rawState) {
          const parsed: StateType = JSON.parse(rawState);
          if (typeof parsed.timeLeft !== "number")
            parsed.timeLeft = (rawSettings ? JSON.parse(rawSettings).workMin : DEFAULT_SETTINGS.workMin) * 60;
          setState(parsed);
        } else {
          // ensure timeLeft matches settings
          setState((s) => ({ ...s, timeLeft: (rawSettings ? JSON.parse(rawSettings).workMin : DEFAULT_SETTINGS.workMin) * 60 }));
        }
        const rawHist = await AsyncStorage.getItem(LS_KEYS.HISTORY);
        if (rawHist) setHistory(JSON.parse(rawHist));
        const rawMark = await AsyncStorage.getItem(LS_KEYS.MARK_COMPLETE);
        if (rawMark) setMarkComplete(JSON.parse(rawMark));
      } catch (e) {
        console.warn("load error", e);
      } finally {
        setLoading(false);
      }
    })();
    // run once on mount
  }, []);

  useEffect(() => {
    // persisters (fire-and-forget)
    AsyncStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  useEffect(() => {
    AsyncStorage.setItem(LS_KEYS.STATE, JSON.stringify(state)).catch(() => {});
  }, [state]);

  useEffect(() => {
    AsyncStorage.setItem(LS_KEYS.HISTORY, JSON.stringify(history)).catch(() => {});
  }, [history]);

  useEffect(() => {
    AsyncStorage.setItem(LS_KEYS.MARK_COMPLETE, JSON.stringify(markComplete)).catch(() => {});
  }, [markComplete]);

  /* ---------- preload sound ---------- */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // put a small beep in assets and require it
        const { sound } = await Audio.Sound.createAsync(require("../../assets/sounds/beep.mp3"));
        if (!mounted) {
          await sound.unloadAsync().catch(() => {});
          return;
        }
        soundRef.current = sound;
      } catch (e) {
        // ignore
      }
    })();

    return () => {
      mounted = false;
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  /* ---------- load task (if taskId) ---------- */
  useEffect(() => {
    let mounted = true;
    if (!taskId) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const res = await getTaskById(taskId);
        if (mounted && res?.success) setSelectedTask(res.data?.data ?? res.data);
      } catch (e) {
        console.warn("getTaskById", e);
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [taskId]);

  /* ---------- server sync ---------- */
  async function syncServerStats() {
    try {
      const res = await getFocusStatus();
      const payload = res?.data?.data ?? res?.data ?? res;
      const running = payload?.runningSession ?? payload?.running ?? null;
      if (running) {
        setSessionId(running._id ?? running.id ?? null);
        setServerSession(running);
        await AsyncStorage.setItem(LS_KEYS.SERVER_STATE, JSON.stringify({ sessionId: running._id ?? running.id, serverSession: running })).catch(() => {});
      }
      const hist = payload?.recent ?? payload?.history ?? [];
      if (Array.isArray(hist) && hist.length) {
        const normalized = hist.map((h: any) => (typeof h === "string" ? h : h?.startTime ? new Date(h.startTime).toISOString() : JSON.stringify(h)));
        setHistory((prev) => Array.from(new Set([...prev, ...normalized])).sort());
      }
    } catch (e) {
      console.warn("syncServerStats", e);
    }
  }
  useEffect(() => {
    syncServerStats().catch(() => {});
  }, []);

  /* ---------- timer tick ---------- */
  useEffect(() => {
    if (state.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      intervalRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.timeLeft <= 1) {
            // finished
            void handleSessionComplete(prev); // call and ignore promise
            return { ...prev, timeLeft: 0, isRunning: false };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1, lastTickAt: Date.now() };
        });
      }, 1000) as unknown as number;
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isRunning]);

  /* ---------- Notifications (schedule/cancel) ---------- */
  async function scheduleEndNotification(secondsFromNow: number) {
    try {
      if (scheduledNotifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotifIdRef.current);
        scheduledNotifIdRef.current = null;
      }

      // Use the TimeInterval trigger with explicit 'type' to satisfy TS types
      const trigger:any = {
        seconds: Math.max(1, Math.floor(secondsFromNow)),
        repeats: false,
        // Type property is implicitly present in the interface; we ensure typing by using the interface type
      };

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Focus session complete",
          body: "Your session finished — open the app to continue.",
          sound: settings.soundEnabled ? "default" : undefined,
        },
        trigger,
      });
      scheduledNotifIdRef.current = id;
    } catch (e) {
      console.warn("scheduleNotification:", e);
    }
  }

  async function cancelScheduledNotification() {
    try {
      if (scheduledNotifIdRef.current) {
        await Notifications.cancelScheduledNotificationAsync(scheduledNotifIdRef.current);
        scheduledNotifIdRef.current = null;
      }
    } catch (e) {
      // ignore
    }
  }

  /* ---------- when session completes ---------- */
  async function handleSessionComplete(prevState: StateType) {
    // sound & vibration
    try {
      if (settings.soundEnabled && soundRef.current) {
        await soundRef.current.replayAsync();
      } else {
        Vibration.vibrate(500);
      }
    } catch {
      Vibration.vibrate(500);
    }

    try {
      Vibration.vibrate([0, 300, 100, 300]);
    } catch {}

    // add history
    if (prevState.mode === "work") {
      const iso = new Date().toISOString();
      setHistory((h) => [...h, iso]);
    }

    // end server session if exists
    if (sessionId) {
      try {
        const duration =
          prevState.mode === "work"
            ? settings.workMin * 60
            : prevState.mode === "shortBreak"
            ? settings.shortBreakMin * 60
            : settings.longBreakMin * 60;
        await onEndServer(sessionId, duration);
      } catch (e) {
        console.warn("end server error", e);
      }
    } else {
      // best-effort: create a session and end it
      try {
        const startRes = await startFocus({
          taskId: selectedTask?._id ?? taskId,
          mode: prevState.mode === "work" ? "work" : prevState.mode,
          durationSeconds:
            prevState.mode === "work"
              ? settings.workMin * 60
              : prevState.mode === "shortBreak"
              ? settings.shortBreakMin * 60
              : settings.longBreakMin * 60,
        });
        const payload = startRes?.data?.data ?? startRes?.data ?? startRes;
        const sObj = payload?.session ?? payload;
        if (sObj?._id) {
          await endFocus({
            sessionId: sObj._id,
            endedAt: new Date().toISOString(),
            durationSeconds:
              prevState.mode === "work"
                ? settings.workMin * 60
                : prevState.mode === "shortBreak"
                ? settings.shortBreakMin * 60
                : settings.longBreakMin * 60,
            status: "completed",
          });
        }
      } catch (e) {
        // ignore
      }
    }

    // optionally mark complete (best-effort)
    if (markComplete && selectedTask) {
      try {
        // await completeTaskApi(selectedTask._id) // implement if available
      } catch (e) {
        console.warn("mark complete failed", e);
      }
    }

    // auto-transition
    if (prevState.mode === "work") {
      const nextCycleCount = prevState.currentCycleCount + 1;
      if (nextCycleCount >= settings.sessionsBeforeLong) {
        const next: StateType = {
          ...prevState,
          isBreak: true,
          currentCycleCount: 0,
          mode: "longBreak",
          timeLeft: settings.longBreakMin * 60,
        };
        setState(next);
        if (settings.autoStartNext) setState((s) => ({ ...s, isRunning: true }));
        else await cancelScheduledNotification();
        return;
      } else {
        const next: StateType = {
          ...prevState,
          isBreak: true,
          currentCycleCount: nextCycleCount,
          mode: "shortBreak",
          timeLeft: settings.shortBreakMin * 60,
        };
        setState(next);
        if (settings.autoStartNext) setState((s) => ({ ...s, isRunning: true }));
        else await cancelScheduledNotification();
        return;
      }
    } else {
      const next: StateType = {
        ...prevState,
        isBreak: false,
        mode: "work",
        timeLeft: settings.workMin * 60,
      };
      setState(next);
      if (settings.autoStartNext) setState((s) => ({ ...s, isRunning: true }));
      else await cancelScheduledNotification();
      return;
    }
  }

  /* ---------- server wrappers ---------- */
  async function onStartServer() {
    setIsStarting(true);
    try {
      const durationSeconds = state.timeLeft;
      const res = await startFocus({
        taskId: selectedTask?._id ?? taskId,
        mode: state.mode === "work" ? "work" : state.mode,
        durationSeconds,
      });
      const payload = res?.data?.data ?? res?.data ?? res;
      const session = payload?.session ?? payload;
      const id = session?._id ?? session?.id ?? null;
      if (id) {
        setSessionId(id);
        setServerSession(session);
        await AsyncStorage.setItem(LS_KEYS.SERVER_STATE, JSON.stringify({ sessionId: id, serverSession: session })).catch(() => {});
      }
    } catch (e) {
      console.warn("start server error", e);
    } finally {
      setIsStarting(false);
    }
  }

  async function onEndServer(forceSessionId?: string | null, durationSeconds?: number) {
    setIsEnding(true);
    try {
      const id = forceSessionId ?? sessionId;
      if (!id) return;
      await endFocus({
        sessionId: id,
        endedAt: new Date().toISOString(),
        durationSeconds: durationSeconds ?? 0,
        status: "completed",
      });
      await AsyncStorage.removeItem(LS_KEYS.SERVER_STATE).catch(() => {});
      setSessionId(null);
      setServerSession(null);
      await syncServerStats();
    } catch (e) {
      console.warn("onEndServer", e);
    } finally {
      setIsEnding(false);
    }
  }

  /* ---------- controls ---------- */
  async function toggleStartPause() {
    if (!state.isRunning) {
      setState((p) => ({ ...p, isRunning: true }));
      try {
        await onStartServer();
      } catch {}
      await scheduleEndNotification(state.timeLeft);
      AccessibilityInfo.announceForAccessibility("Timer started");
    } else {
      setState((p) => ({ ...p, isRunning: false }));
      await cancelScheduledNotification();
      AccessibilityInfo.announceForAccessibility("Timer paused");
    }
  }

  function reset(mode: Mode = "work") {
    const time = mode === "work" ? settings.workMin * 60 : mode === "shortBreak" ? settings.shortBreakMin * 60 : settings.longBreakMin * 60;
    setState((prev) => ({ ...prev, isRunning: false, isBreak: mode !== "work", mode, timeLeft: time }));
    cancelScheduledNotification().catch(() => {});
  }

  async function skip() {
    const prev = { ...state };
    if (sessionId) {
      await onEndServer(sessionId, prev.mode === "work" ? settings.workMin * 60 : prev.mode === "shortBreak" ? settings.shortBreakMin * 60 : settings.longBreakMin * 60);
    }
    await handleSessionComplete(prev);
    setState((prev) => ({ ...prev, isRunning: false }));
    cancelScheduledNotification().catch(() => {});
  }

  /* reschedule notification when timeLeft changes while running */
  useEffect(() => {
    (async () => {
      if (state.isRunning) {
        await scheduleEndNotification(state.timeLeft);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.timeLeft, state.isRunning]);

  /* ---------- derived values ---------- */
  const modeDuration = state.mode === "work" ? settings.workMin * 60 : state.mode === "shortBreak" ? settings.shortBreakMin * 60 : settings.longBreakMin * 60;
  const progressPct = Math.max(0, Math.min(100, Math.round((1 - state.timeLeft / (modeDuration || 1)) * 100)));
  const totalSessions = history.length;
  const todayISO = new Date();
  todayISO.setHours(0, 0, 0, 0);
  const todayCount = history.filter((h) => {
    const d = new Date(h);
    d.setHours(0, 0, 0, 0);
    return d.getTime() === todayISO.getTime();
  }).length;

  /* ---------- UI ---------- */
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12 }}>Loading...{" "}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor:colors.background }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons name="moon-outline" size={20} />
          <Text style={styles.title}>Zen Focus{" "}</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity onPress={() => setSettingsOpen(true)} style={styles.iconBtn}>
            <Ionicons name="settings-outline" size={20} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setZenMode((z) => !z)} style={styles.iconBtn}>
            <Ionicons name="expand-outline" size={20} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.timerCard, {backgroundColor: colors.card}]}>
        <View style={styles.timerCircle}>
          <Text style={[styles.timeText, zenMode && { color: "#fff" }]}>{formatTime(state.timeLeft)}{" "}</Text>
          <Text style={[styles.modeText, zenMode && { color: "#ddd" }]}>{state.mode === "work" ? "Work" : state.mode === "shortBreak" ? "Break" : "Long Break"}{" "}</Text>
        </View>

        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
        </View>

        <View style={styles.controls}>
          <TouchableOpacity onPress={toggleStartPause} style={styles.controlBtn}>
            <Ionicons name={state.isRunning ? "pause" : "play"} size={18} color="#fff" />
            <Text style={styles.controlText}>{state.isRunning ? "Pause" : isStarting ? "Starting..." : "Start"}{" "}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => reset(state.mode)} style={[styles.controlBtn, styles.outlineBtn]}>
            <Ionicons name="reload" size={18} />
            <Text style={styles.controlTextOutline}>Reset{" "}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skip} style={[styles.controlBtn, styles.ghostBtn]}>
            {/* Ionicons typing can be strict, cast to any to avoid TS icon-name union errors */}
            <Ionicons name={"fastforward" as any} size={18} />
            <Text style={styles.controlText}>Skip{" "}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.smallRow}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{color: colors.cardForeground}}>Sound{" "}</Text>
            <Switch value={settings.soundEnabled} onValueChange={(v) => setSettings((s) => ({ ...s, soundEnabled: v }))} />
            <TouchableOpacity onPress={async () => soundRef.current?.replayAsync().catch(() => {})} style={styles.testBtn}>
              <Text style={{color: colors.cardForeground}}>Test{" "}</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ color: "#666" }}>{state.isRunning ? "Running" : "Stopped"}{" "}</Text>
            <Text style={{ color: "#666", marginLeft: 8 }}>{progressPct}%{" "}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.side}>
        <View style={[styles.taskCard , {backgroundColor: colors.card}]}>
          <Text style={[styles.smallTitle, {color: colors.cardForeground}]}>Attached Task{" "}</Text>
          {selectedTask ? (
            <>
              <Text style={[styles.taskTitle, {color: colors.cardForeground}]}>{selectedTask.title ?? selectedTask.name}{" "}</Text>
              <Text style={[styles.taskDesc, {color: colors.cardForeground}]}>{selectedTask.description ?? selectedTask.desc ?? ""}{" "}</Text>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <TouchableOpacity onPress={() => Alert.alert("Open Task", "Implement navigation to open task")}>
                  <Text style={{ color: colors.accent }}>Open Task{" "}</Text>
                </TouchableOpacity>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: colors.cardForeground, fontSize: 12 }}>{selectedTask.project?.name ?? "No project"}{" "}</Text>
                  {selectedTask.dueDate && <Text style={{ color: colors.cardForeground, fontSize: 12 }}>Due: {new Date(selectedTask.dueDate).toLocaleString()}{" "}</Text>}
                </View>
              </View>
            </>
          ) : (
            <Text style={{ color: colors.cardForeground }}>No task attached. Open a task and hit Focus or pass taskId in route.{" "}</Text>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{color: colors.cardForeground}}>Auto mark complete{" "}</Text>
              <Switch value={markComplete} onValueChange={setMarkComplete} />
            </View>

            <View style={{ flexDirection: "row", gap: 8 }}>
              <TouchableOpacity onPress={() => Alert.alert("Attach", "Implement attach flow")} style={styles.presetBtn}>
                <Text style={{color: colors.cardForeground}}>Attach{" "}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <Text style={[styles.smallTitle, {color: colors.cardForeground}]}>Today{" "}</Text>
            <Text style={[styles.statNum, {color: colors.cardForeground}]}>{todayCount}{" "}</Text>
            <Text style={[styles.smallNote, {color: colors.cardForeground}]}>sessions{" "}</Text>
          </View>
          <View style={[styles.statCard, {backgroundColor: colors.card}]}>
            <Text style={[styles.smallTitle, {color: colors.cardForeground}]}>Total{" "}</Text>
            <Text style={[styles.statNum, {color: colors.cardForeground}]}>{totalSessions}{" "}</Text>
            <Text style={[styles.smallNote, {color: colors.cardForeground}]}>completed{" "}</Text>
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Text style={[styles.smallTitle, {color: colors.cardForeground}]}>Recent sessions{" "}</Text>
          {history.slice(-8).reverse().map((h, idx) => (
            <View key={idx} style={styles.historyRow}>
              <Text style={{ flex: 1 ,color: colors.cardForeground}}>{new Date(h).toLocaleString()}{" "}</Text>
              <Text style={{ color: colors.cardForeground }}>✓{" "}</Text>
            </View>
          ))}
          {history.length === 0 && <Text style={{ color:colors.cardForeground, marginTop: 8 }}>No sessions yet — start one!{" "}</Text>}
        </View>
      </ScrollView>

      <Modal visible={settingsOpen} animationType="slide" onRequestClose={() => setSettingsOpen(false)}>
        <View style={[styles.modalContent, {backgroundColor: colors.background}]}>
          <Text style={[styles.modalTitle, {color: colors.cardForeground}]}>Focus settings{" "}</Text>
          <ScrollView>
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, {color: colors.cardForeground}]}>Work duration (min){" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, workMin: Math.max(1, s.workMin - 1) }))} style={styles.stepBtn}>
                <Text >-{" "}</Text>
              </TouchableOpacity>
              <Text style={[styles.settingValue, {color: colors.cardForeground}]}>{settings.workMin}{" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, workMin: s.workMin + 1 }))} style={styles.stepBtn}>
                <Text >+{" "}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, {color: colors.cardForeground}]}>Short break (min){" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, shortBreakMin: Math.max(1, s.shortBreakMin - 1) }))} style={styles.stepBtn}>
                <Text >-{" "}</Text>
              </TouchableOpacity>
              <Text style={[styles.settingValue, {color: colors.cardForeground}]}>{settings.shortBreakMin}{" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, shortBreakMin: s.shortBreakMin + 1 }))} style={styles.stepBtn}>
                <Text >+{" "}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, {color: colors.cardForeground}]}>Long break (min){" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, longBreakMin: Math.max(1, s.longBreakMin - 1) }))} style={styles.stepBtn}>
                <Text >-{" "}</Text>
              </TouchableOpacity>
              <Text style={[styles.settingValue, {color: colors.cardForeground}]}>{settings.longBreakMin}{" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, longBreakMin: s.longBreakMin + 1 }))} style={styles.stepBtn}>
                <Text >+{" "}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, {color: colors.cardForeground}]}>Sessions before long break{" "}</Text>
              <TouchableOpacity onPress={() => setSettings((s) => ({ ...s, sessionsBeforeLong: Math.max(1, s.sessionsBeforeLong - 1) }))} style={styles.stepBtn}>
                <Text >-{" "}</Text>
              </TouchableOpacity>
              <Text style={[styles.settingValue, {color: colors.cardForeground}]}>{settings.sessionsBeforeLong}{" "}</Text>
              <TouchableOpacity  onPress={() => setSettings((s) => ({ ...s, sessionsBeforeLong: s.sessionsBeforeLong + 1 }))} style={styles.stepBtn}>
                <Text>+{" "}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <Text style={{color: colors.cardForeground}}>Sound{" "}</Text>
              <Switch value={settings.soundEnabled} onValueChange={(v) => setSettings((s) => ({ ...s, soundEnabled: v }))} />
            </View>

            <View style={styles.toggleRow}>
              <Text style={{color: colors.cardForeground}}>Auto-start next{" "}</Text>
              <Switch value={settings.autoStartNext} onValueChange={(v) => setSettings((s) => ({ ...s, autoStartNext: v }))} />
            </View>

            <View style={styles.toggleRow}>
              <Text style={{color: colors.cardForeground}}>Mark attached task complete{" "}</Text>
              <Switch value={markComplete} onValueChange={setMarkComplete} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setSettings(DEFAULT_SETTINGS)} style={[styles.presetBtn]}>
                <Text style={{color: colors.cardForeground}}>Reset{" "}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setSettingsOpen(false)} style={[styles.primaryBtn]}>
                <Text style={{ color: "#fff" }}>Done{" "}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ---------- styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, padding: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  title: { fontSize: 18, fontWeight: "700", marginLeft: 8 },

  timerCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  timerCircle: { alignItems: "center", justifyContent: "center", marginBottom: 12 },
  timeText: { fontSize: 48, fontWeight: "800" },
  modeText: { fontSize: 14, color: "#666", marginTop: 4 },

  progressBarContainer: { height: 8, backgroundColor: "#eee", borderRadius: 6, overflow: "hidden", marginVertical: 8 },
  progressBar: { height: "100%", backgroundColor: "#6366f1" },

  controls: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  controlBtn: { flex: 1, backgroundColor: "#6366f1", padding: 10, borderRadius: 10, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginRight: 8 },
  controlText: { color: "#fff", marginLeft: 8 },
  outlineBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ddd", marginRight: 8 },
  controlTextOutline: { color: "#333" },
  ghostBtn: { backgroundColor: "transparent", borderWidth: 1, borderColor: "#eee" },

  smallRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 12, alignItems: "center" },
  testBtn: { padding: 6, backgroundColor: "#eee", borderRadius: 8 },

  side: { flex: 1 },
  taskCard: { backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 12 },
  smallTitle: { fontSize: 12, color: "#666", marginBottom: 8 },
  taskTitle: { fontSize: 16, fontWeight: "700" },
  taskDesc: { color: "#666", marginTop: 6 },

  statsRow: { flexDirection: "row", gap: 8 },
  statCard: { flex: 1, backgroundColor: "#fff", padding: 12, borderRadius: 10 },
  statNum: { fontSize: 20, fontWeight: "800" },
  smallNote: { color: "#666", fontSize: 12 },

  historyRow: { flexDirection: "row", paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f0f0f0" },

  modalContent: { flex: 1, padding: 16, backgroundColor: "#fff" },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },

  settingRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  settingLabel: { flex: 1 },
  stepBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: "#eee", alignItems: "center", justifyContent: "center", marginHorizontal: 8 },
  settingValue: { width: 40, textAlign: "center" },

  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8 },
  presetBtn: { padding: 10, borderRadius: 8, backgroundColor: "#f0f0f0" },
  primaryBtn: { padding: 10, borderRadius: 8, backgroundColor: "#6366f1", alignItems: "center", justifyContent: "center" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconBtn: { padding: 8 },
});
