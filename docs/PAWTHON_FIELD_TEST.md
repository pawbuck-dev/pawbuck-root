# Pawthon walk tracking — field test matrix

Use a **development or production build** with native location (not Expo Go). Background walks require the configured iOS background location mode and Android foreground service / permissions from `apps/consumer-app/app.json`.

## Matrix (3×3)

**Phone modes**

1. Hand, screen on  
2. Pocket, screen off  
3. Backpack / bag, screen off  

**Environments**

1. Downtown / urban canyon  
2. Residential, open sky  
3. Heavy tree cover  

For each combination, walk the **same ~2 km loop** once, export or screenshot the map trace if possible.

## Pass criteria

- Three comparable traces (same loop) overlay within roughly **10 m** where GPS is good.  
- No long **zero-update** gaps while moving in pocket mode unless the OS killed the app (note device model + OS version if that happens).

## Pedometer / gap-fill expectations

- **`Pedometer.watchStepCount`** does **not** deliver updates while the app is in the background (Expo). The UI shows foreground step deltas only.  
- **Gap-fill** between sparse GPS fixes uses **`getStepCountAsync`** when the task runs again with new locations (best on iOS). Android may not expose the same history; gap-fill then no-ops.

## After the matrix

If traces still diverge badly in pocket / screen-off on iOS, or Expo cannot tune `CLLocationManager` behavior enough, re-evaluate **Transistor `react-native-background-geolocation`** (paid license) vs staying on Expo, per product decision.
