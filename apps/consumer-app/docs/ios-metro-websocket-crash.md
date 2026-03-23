# iOS crash: `RCTWebSocketModule` → `RCTEventEmitter sendEventWithName`

## What you saw

- **Stack:** `-[RCTWebSocketModule webSocket:didReceiveMessage:]` → `-[RCTEventEmitter sendEventWithName:body:]` → **SIGABRT**
- **Underlying assert (RN):** `_callableJSModules != nil` — *“RCTCallableJSModules is not set…”*

## Cause

While the **Metro** dev server is connected, SocketRocket delivers WebSocket frames on the main queue. If that happens during a **JS reload / Fast Refresh / bridge teardown**, the native WebSocket module can still try to emit `websocketMessage` (or open/close/failed) **before** the bridge has wired `callableJSModules` again. React Native then hits a hard `RCTAssert` and aborts.

This is a **development + Metro** issue; **release builds** that don’t hold a packager WebSocket won’t hit this path.

Related discussion: [facebook/react-native#34105](https://github.com/facebook/react-native/issues/34105).

## Fix in this repo

A **pnpm patch** on `react-native@0.81.5` guards all WebSocket delegate callbacks: if `self.callableJSModules == nil`, the event is skipped instead of asserting. The patch also bails out if `message` / `type` would be nil before building the event body (avoids `NSDictionary` literal crashes).

Files:

- `patches/react-native@0.81.5.patch`
- `pnpm-workspace.yaml` → `patchedDependencies`

After `pnpm install`, rebuild the iOS app (`pnpm ios` / Xcode) so `RCTWebSocketModule.mm` recompiles.

## If it still crashes

1. `pnpm install` at repo root (patch must apply).
2. Clean iOS build: `cd apps/consumer-app && pnpm prebuild:clean && pnpm ios`.
3. Restart Metro: `pnpm start:clear` (from `apps/consumer-app`).
4. Temporarily turn off **Fast Refresh** in the dev menu while debugging.
5. Confirm **production** (`Release` / EAS) runs without Metro — that path should be stable regardless.
