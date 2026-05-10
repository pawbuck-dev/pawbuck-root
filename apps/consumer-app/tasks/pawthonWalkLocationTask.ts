/**
 * Registers background location task at module load (required by Expo).
 * @see https://docs.expo.dev/versions/latest/sdk/task-manager/
 */
import { PAWTHON_WALK_LOCATION_TASK } from "@/constants/pawthonLocation";
import { ingestWalkLocationWithGapChain } from "@/services/pawthonWalkGapFill";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";

TaskManager.defineTask(PAWTHON_WALK_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    return;
  }
  const locations = (data as { locations?: Location.LocationObject[] })?.locations;
  if (!locations?.length) return;
  for (const loc of locations) {
    await ingestWalkLocationWithGapChain({
      coords: {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        accuracy: loc.coords.accuracy ?? null,
      },
      timestamp: loc.timestamp,
    });
  }
});
