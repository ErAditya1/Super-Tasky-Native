import React from "react";
import { View, Button, Alert } from "react-native";
import { showLocalNotification } from "@/services/notification";
import * as Notifications from "expo-notifications";

export default function NotificationTestScreen() {

  const handleTestPush = async () => {
    await showLocalNotification({
      title: "Test Local Notification",
      body: "If you see this → notifications are working ✅",
    });
  };

  // NEW : schedule after 5 seconds
  const handleSchedulePush = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Scheduled Notification",
        body: "This notification fired after 5 seconds ⏱",
      },
      trigger: { seconds: 5 }, // 5 seconds delay
    });

    Alert.alert("Scheduled!", "Notification will come after 5 seconds");
  };

  return (
    <View style={{ flex:1, justifyContent:"center", alignItems:"center", gap: 16 }}>
      <Button title="Run Notification Test (Instant)" onPress={handleTestPush} />
      <Button title="Run Scheduled Notification (5 sec) " onPress={handleSchedulePush} />
    </View>
  );
}
