import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Alert, Platform, Share } from "react-native";
import { getCachedSignedUrl } from "./image";

/**
 * Share a pets-bucket storage path: downloads to cache then opens share sheet (or falls back to Share API).
 */
export async function shareStorageDocument(
  storagePath: string,
  suggestedFileName: string
): Promise<void> {
  try {
    const url = await getCachedSignedUrl(storagePath);
    const safeName = suggestedFileName.replace(/[^a-zA-Z0-9._-]/g, "_") || "document";
    const ext = storagePath.toLowerCase().endsWith(".pdf") ? ".pdf" : "";
    const name = safeName.includes(".") ? safeName : `${safeName}${ext}`;
    const base =
      FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
    if (!base) {
      Alert.alert("Share", "File storage is not available on this device.");
      return;
    }
    const dest = `${base}${name}`;

    const { uri } = await FileSystem.downloadAsync(url, dest);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri);
    } else {
      await Share.share(
        Platform.OS === "ios"
          ? { url: uri, title: name }
          : { message: url, title: name }
      );
    }
  } catch (e) {
    console.error("shareStorageDocument", e);
    Alert.alert("Share", "Could not prepare this document for sharing.");
  }
}

export async function shareTextSummary(title: string, body: string): Promise<void> {
  try {
    await Share.share({ title, message: `${title}\n\n${body}` });
  } catch (e) {
    console.error("shareTextSummary", e);
  }
}
