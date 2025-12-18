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

  // const projectId =
  //   Constants.expoConfig?.extra?.eas?.projectId ??
  //   Constants.easConfig?.projectId;

  // if (!projectId) {
  //   console.error("Project ID not found");
  //   return null;
  // }

  // console.log("Project ID:", projectId);

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId: "9f01360a-9174-4a74-9f8c-87ce6293b8c5",
    })
  ).data;

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
