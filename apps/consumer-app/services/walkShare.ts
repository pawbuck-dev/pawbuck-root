import {
  buildWalkShareCaption,
  WALK_SHARE_CAPTURE_PIXEL_RATIO,
  WALK_SHARE_CARD_HEIGHT,
  WALK_SHARE_CARD_WIDTH,
  type WalkSharePayload,
} from "@/utils/walkShareCard";
import type { RefObject } from "react";
import * as Sharing from "expo-sharing";
import { Alert, Platform, Share, View } from "react-native";
import { captureRef } from "react-native-view-shot";

export async function captureWalkShareCardFromRef(cardRef: RefObject<View | null>): Promise<string | null> {
  try {
    const uri = await captureRef(cardRef, {
      format: "png",
      quality: 1,
      result: "tmpfile",
      width: WALK_SHARE_CARD_WIDTH * WALK_SHARE_CAPTURE_PIXEL_RATIO,
      height: WALK_SHARE_CARD_HEIGHT * WALK_SHARE_CAPTURE_PIXEL_RATIO,
    });
    return uri;
  } catch (e) {
    console.warn("[walkShare] captureRef failed", e);
    return null;
  }
}

export async function shareWalkStoryFromRef(
  cardRef: RefObject<View | null>,
  payload: WalkSharePayload
): Promise<void> {
  const uri = await captureWalkShareCardFromRef(cardRef);
  if (!uri) {
    Alert.alert("Share", "Could not create your walk story. Try again.");
    return;
  }
  const caption = buildWalkShareCaption(payload);
  try {
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your Pawthon walk",
        UTI: "public.png",
      });
      return;
    }
  } catch (e) {
    console.warn("[walkShare] expo-sharing failed", e);
  }
  try {
    await Share.share(
      Platform.OS === "ios"
        ? { url: uri, message: caption }
        : { message: caption, url: uri, title: "Pawthon walk" }
    );
  } catch {
    /* dismissed */
  }
}
