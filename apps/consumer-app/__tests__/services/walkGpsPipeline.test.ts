import {
  createWalkGpsPipelineState,
  processWalkGpsSample,
  WALK_GPS_MAX_HORIZONTAL_ACCURACY_M,
  WALK_GPS_MAX_SPEED_KMH,
  WALK_GPS_MAX_STALE_MS,
} from "@/services/walkGpsPipeline";

describe("walkGpsPipeline", () => {
  const t0 = 1_700_000_000_000;

  it("rejects poor accuracy", () => {
    const s0 = createWalkGpsPipelineState();
    const r = processWalkGpsSample(
      s0,
      { latitude: 1, longitude: 1, timestampMs: t0, accuracy: WALK_GPS_MAX_HORIZONTAL_ACCURACY_M + 5 },
      t0
    );
    expect(r.accepted).toBe(false);
    if (!r.accepted) expect(r.reason).toBe("accuracy");
  });

  it("rejects stale timestamps", () => {
    const s0 = createWalkGpsPipelineState();
    const r = processWalkGpsSample(
      s0,
      { latitude: 1, longitude: 1, timestampMs: t0 - WALK_GPS_MAX_STALE_MS - 1000, accuracy: 8 },
      t0
    );
    expect(r.accepted).toBe(false);
    if (!r.accepted) expect(r.reason).toBe("stale");
  });

  it("rejects impossible speed vs last accepted raw", () => {
    let state = createWalkGpsPipelineState();
    const a = processWalkGpsSample(
      state,
      { latitude: 37.0, longitude: -122.0, timestampMs: t0, accuracy: 5 },
      t0
    );
    expect(a.accepted).toBe(true);
    if (!a.accepted) return;
    state = a.state;

    const dtMs = 1000;
    const latJump = 37.05;
    const b = processWalkGpsSample(
      state,
      { latitude: latJump, longitude: -122.0, timestampMs: t0 + dtMs, accuracy: 5 },
      t0 + dtMs
    );
    expect(b.accepted).toBe(false);
    if (!b.accepted) expect(b.reason).toBe("speed");
  });

  it("accepts a plausible walk segment and advances state", () => {
    let state = createWalkGpsPipelineState();
    const a = processWalkGpsSample(
      state,
      { latitude: 37.0, longitude: -122.0, timestampMs: t0, accuracy: 5 },
      t0
    );
    expect(a.accepted).toBe(true);
    if (!a.accepted) return;
    state = a.state;

    const b = processWalkGpsSample(
      state,
      {
        latitude: 37.00005,
        longitude: -122.00005,
        timestampMs: t0 + 5000,
        accuracy: 5,
      },
      t0 + 5000
    );
    expect(b.accepted).toBe(true);
    if (!b.accepted) return;
    const vKmh =
      (b.segmentMetersFromPrevious / 1000 / ((5000 / 1000) / 3600));
    expect(vKmh).toBeLessThan(WALK_GPS_MAX_SPEED_KMH);
  });
});
