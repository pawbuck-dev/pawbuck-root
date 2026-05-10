import { PAWTHON_WALK_LOCATION_TASK } from "@/constants/pawthonLocation";
import * as Location from "expo-location";

export async function isPawthonWalkLocationTaskRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
}

export async function startPawthonWalkBackgroundTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,
    distanceInterval: 5,
    timeInterval: 1000,
    activityType: Location.ActivityType.Fitness,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: "PawBuck walk",
      notificationBody: "Tracking your walk in the background.",
    },
  });
}

export async function stopPawthonWalkBackgroundTracking(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
  }
}
