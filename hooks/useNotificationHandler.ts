import { registerForPush } from "@/utils/notification";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";

export function useNotificationHandlers() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  useEffect(() => {
    const registerForPushToken = async () => {
      const token = await registerForPush();
      console.log("Push token:", token);
      setPushToken(token);
    };

    registerForPushToken();
  }, []);

  useEffect(() => {
    const getDeviceId = async () => {
      const deviceId =
        Application.getAndroidId() ||
        (await Application.getIosIdForVendorAsync());
      setDeviceId(deviceId);
    };

    getDeviceId();
  }, []);

  useEffect(() => {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("notification received:", notification);
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("notification response received:", response);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, []);

  return { pushToken, deviceId };
}
