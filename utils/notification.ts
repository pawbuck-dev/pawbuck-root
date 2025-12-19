import Constants from "expo-constants";
import { isDevice } from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export async function registerForPush() {
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default channel",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

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

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error("rrProject ID not found");
  }

  console.log("Project ID:", projectId);

  const token = (
    await Notifications.getExpoPushTokenAsync({
      projectId,
    })
  ).data;

  console.log("Expo Push Token:", token);
  return token;
}
