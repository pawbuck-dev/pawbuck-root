import { PAWTHON_WALK_LOCATION_TASK } from "@/constants/pawthonLocation";
import { ingestWalkLocationWithGapChain } from "@/services/pawthonWalkGapFill";
import * as Location from "expo-location";

export type PawthonWalkTrackingMode = "background" | "foreground";

let foregroundSub: Location.LocationSubscription | null = null;

export async function isPawthonWalkLocationTaskRunning(): Promise<boolean> {
  return Location.hasStartedLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
}

async function stopBackgroundUpdates(): Promise<void> {
  const started = await Location.hasStartedLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
  if (started) {
    await Location.stopLocationUpdatesAsync(PAWTHON_WALK_LOCATION_TASK);
  }
}

async function startBackgroundUpdates(): Promise<void> {
  await stopBackgroundUpdates();
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

async function startForegroundUpdates(): Promise<void> {
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
  foregroundSub = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1000,
      distanceInterval: 5,
    },
    (loc) => {
      void ingestWalkLocationWithGapChain({
        coords: {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy ?? null,
        },
        timestamp: loc.timestamp,
      });
    }
  );
}

export async function startPawthonWalkTracking(mode: PawthonWalkTrackingMode): Promise<void> {
  await stopPawthonWalkTracking();
  if (mode === "background") {
    await startBackgroundUpdates();
  } else {
    await startForegroundUpdates();
  }
}

export async function stopPawthonWalkTracking(): Promise<void> {
  if (foregroundSub) {
    foregroundSub.remove();
    foregroundSub = null;
  }
  await stopBackgroundUpdates();
}

/** @deprecated Use startPawthonWalkTracking("background") */
export async function startPawthonWalkBackgroundTracking(): Promise<void> {
  await startPawthonWalkTracking("background");
}

/** @deprecated Use stopPawthonWalkTracking() */
export async function stopPawthonWalkBackgroundTracking(): Promise<void> {
  await stopPawthonWalkTracking();
}
