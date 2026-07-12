import { registerForPush } from "@/utils/notification";
import * as Application from "expo-application";
import * as Notifications from "expo-notifications";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

function invalidateTransferRelatedCaches(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ queryKey: ["pets"] });
  void queryClient.invalidateQueries({ queryKey: ["pet_transfers"] });
}

function routePetTransferNotification(data: Record<string, unknown> | undefined): void {
  if (!data || data.type !== "pet_transfer") return;
  const action = typeof data.action === "string" ? data.action : "";

  // Sender / revoked household: land on transfer hub or home — not recipient accept step.
  if (action === "accepted" || action === "declined" || action === "expired") {
    router.push("/(home)/transfer-pet");
    return;
  }
  if (action === "access_revoked") {
    router.push("/(home)/home");
    return;
  }

  const code = data.transferCode;
  if (typeof code !== "string" || !code.trim()) return;
  router.push({
    pathname: "/transfer-pet/step2",
    params: { transferCode: code.trim().toUpperCase() },
  });
}

function routeFromPawbuckNotificationData(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  if (data.type === "pet_transfer") {
    routePetTransferNotification(data);
    return;
  }

  const kind = typeof data.notificationKind === "string" ? data.notificationKind : "";
  const petId = typeof data.petId === "string" ? data.petId : undefined;
  const url = typeof data.url === "string" ? data.url : "";

  if ((kind === "journal_prompt" || url === "/(home)/pet-journal") && petId) {
    router.push({ pathname: "/(home)/pet-journal", params: { petId } });
    return;
  }

  if (url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Expo Router accepts dynamic health/home paths from notification payloads.
    router.push(url as any);
  }
}

export function useNotificationHandlers() {
  const queryClient = useQueryClient();
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
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        if (data?.type === "pet_transfer") {
          const action = typeof data.action === "string" ? data.action : "";
          if (action === "accepted" || action === "declined" || action === "access_revoked") {
            invalidateTransferRelatedCaches(queryClient);
          }
        }
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content
          .data as Record<string, unknown> | undefined;
        if (data?.type === "pet_transfer") {
          const action = typeof data.action === "string" ? data.action : "";
          if (action === "accepted" || action === "declined" || action === "access_revoked") {
            invalidateTransferRelatedCaches(queryClient);
          }
        }
        routeFromPawbuckNotificationData(data);
      });

    return () => {
      notificationListener.remove();
      responseListener.remove();
    };
  }, [queryClient]);

  return { pushToken, deviceId };
}
