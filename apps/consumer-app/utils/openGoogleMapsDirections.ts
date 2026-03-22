import { Linking } from "react-native";

/**
 * Opens Google Maps with driving directions to the destination.
 * Uses the universal Maps URL so it opens the Google Maps app when installed, otherwise the browser.
 * @see https://developers.google.com/maps/documentation/urls/get-started
 */
export async function openGoogleMapsDrivingDirections(
  latitude: number,
  longitude: number,
  _placeName?: string
): Promise<void> {
  const dest = `${latitude},${longitude}`;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
  const can = await Linking.canOpenURL(url);
  if (can) {
    await Linking.openURL(url);
    return;
  }
  // Rare fallback (e.g. unusual URL handlers)
  await Linking.openURL(
    `https://maps.google.com/?daddr=${encodeURIComponent(dest)}&dirflg=d`
  );
}
