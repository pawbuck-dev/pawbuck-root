import { registerForPush } from "@/utils/notification";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

function routePetTransferNotification(data: Record<string, unknown> | undefined): void {
  if (!data || data.type !== "pet_transfer") return;
  const code = data.transferCode;
  if (typeof code !== "string" || !code.trim()) return;
  router.push({
    pathname: "/transfer-pet/step2",
    params: { transferCode: code.trim().toUpperCase() },
  });
}

export function useNotificationHandlers() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  useEffect(() => {
    let isMounted = true;
    const registerForPushToken = async () => {
      const token = await registerForPush();
      if (isMounted) {
        setPushToken(token);
      }
    };

    registerForPushToken();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const getDeviceId = async () => {
      const deviceId =
        Platform.OS === "android"
          ? Application.getAndroidId()
          : await Application.getIosIdForVendorAsync();
      if (isMounted) {
        setDeviceId(deviceId);
      }
    };

    getDeviceId();
    
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("notification received:", notification);
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as Record<string, unknown> | undefined;
        routePetTransferNotification(data);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return { pushToken, deviceId };
}
