import {
  isAutoStartRequested,
  parseAutoStartPetId,
  shouldAutoStartWalk,
} from "@/utils/pawthonWalkAutoStart";
import { formatStartWalkCta, formatWalkPetNames, toggleWalkPetId } from "@/utils/pawthonWalkPets";

describe("pawthonWalkAutoStart", () => {
  it("detects autoStart flag", () => {
    expect(isAutoStartRequested({ autoStart: "1" })).toBe(true);
    expect(isAutoStartRequested({ autoStart: "true" })).toBe(true);
    expect(isAutoStartRequested({ autoStart: "0" })).toBe(false);
    expect(isAutoStartRequested({})).toBe(false);
  });

  it("parses petId param", () => {
    expect(parseAutoStartPetId({ petId: "pet-1" })).toBe("pet-1");
    expect(parseAutoStartPetId({ petId: ["pet-2"] })).toBe("pet-2");
    expect(parseAutoStartPetId({})).toBeNull();
  });

  it("shouldAutoStartWalk when select phase with pets and flag", () => {
    expect(
      shouldAutoStartWalk({
        autoStart: { autoStart: "1" },
        phase: "select",
        walkPetIds: ["p1"],
        alreadyHandled: false,
        ownedPetCount: 1,
      })
    ).toBe(true);
    expect(
      shouldAutoStartWalk({
        autoStart: { autoStart: "1" },
        phase: "select",
        walkPetIds: ["p1"],
        alreadyHandled: false,
        ownedPetCount: 2,
      })
    ).toBe(false);
    expect(
      shouldAutoStartWalk({
        autoStart: { autoStart: "1" },
        phase: "warmup",
        walkPetIds: ["p1"],
        alreadyHandled: false,
        ownedPetCount: 1,
      })
    ).toBe(false);
    expect(
      shouldAutoStartWalk({
        autoStart: { autoStart: "1" },
        phase: "select",
        walkPetIds: ["p1"],
        alreadyHandled: true,
        ownedPetCount: 1,
      })
    ).toBe(false);
  });
});

describe("pawthonWalkPets", () => {
  it("toggleWalkPetId adds and removes pets", () => {
    expect(toggleWalkPetId(["a"], "b")).toEqual(["a", "b"]);
    expect(toggleWalkPetId(["a", "b"], "b")).toEqual(["a"]);
    expect(toggleWalkPetId(["a"], "a")).toEqual(["a"]);
  });

  it("formatWalkPetNames joins names", () => {
    expect(formatWalkPetNames([{ name: "Luna" }])).toBe("Luna");
    expect(formatWalkPetNames([{ name: "Luna" }, { name: "Max" }])).toBe("Luna & Max");
    expect(
      formatWalkPetNames([{ name: "Luna" }, { name: "Max" }, { name: "Buddy" }])
    ).toBe("Luna, Max & Buddy");
  });

  it("formatStartWalkCta uses plural label for multi-pet", () => {
    expect(formatStartWalkCta([{ name: "Luna" }])).toBe("Start a Walk");
    expect(formatStartWalkCta([{ name: "Luna" }, { name: "Max" }])).toBe(
      "Start walk with Luna & Max"
    );
  });
});
