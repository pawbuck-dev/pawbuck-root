import { isDevice } from "expo-device";
import * as Notifications from "expo-notifications";
import { NotificationBehavior } from "expo-notifications";

export async function registerForPush() {
  if (!isDevice) {
    console.log("Not a device");
    return null;
  }

  console.log("Device is device");

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  console.log("Existing status:", existingStatus);

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  console.log("Final status:", finalStatus);

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  console.log("Expo Push Token:", token);
  return token;
}

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});
