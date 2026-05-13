import * as Calendar from "expo-calendar";
import { Alert, Platform } from "react-native";

async function resolveWritableCalendarId(): Promise<string | null> {
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  if (Platform.OS === "ios") {
    const def = await Calendar.getDefaultCalendarAsync();
    if (def?.id) return def.id;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const primary = calendars.find((c) => c.allowsModifications && c.isPrimary) ?? calendars.find((c) => c.allowsModifications);
  return primary?.id ?? null;
}

export type DeviceCalendarEventInput = {
  title: string;
  startDate: Date;
  endDate: Date;
  location?: string | null;
  notes?: string | null;
};

/**
 * User-initiated write to the OS calendar (requires permission).
 * @returns true when an event was created
 */
export async function addEventToDeviceCalendar(input: DeviceCalendarEventInput): Promise<boolean> {
  if (Platform.OS === "web") {
    Alert.alert("Calendar", "Adding to your device calendar is not available on web.");
    return false;
  }

  const calendarId = await resolveWritableCalendarId();
  if (!calendarId) {
    Alert.alert("Calendar", "Calendar access was not granted. You can enable it in Settings.");
    return false;
  }

  try {
    await Calendar.createEventAsync(calendarId, {
      title: input.title,
      startDate: input.startDate,
      endDate: input.endDate,
      location: input.location ?? undefined,
      notes: input.notes ?? undefined,
    });
    return true;
  } catch (e) {
    console.warn("[deviceCalendar] createEventAsync failed", e);
    Alert.alert("Calendar", "Could not add the event to your calendar.");
    return false;
  }
}
