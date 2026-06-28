import {
  buildInboxNotificationCounts,
  mergePetNotificationCounts,
} from "@/utils/petNotificationCounts";

describe("buildInboxNotificationCounts", () => {
  it("sums pending approvals and unread threads per pet", () => {
    const counts = buildInboxNotificationCounts(
      [{ pet_id: "pet-a" }, { pet_id: "pet-b" }],
      [
        { pet_id: "pet-a", unread_count: 2 },
        { pet_id: "pet-b", unread_count: 0 },
        { pet_id: "pet-a", unread_count: 1 },
      ],
    );
    expect(counts).toEqual({ "pet-a": 4, "pet-b": 1 });
  });

  it("ignores threads without pet_id or zero unread", () => {
    expect(
      buildInboxNotificationCounts([], [{ pet_id: null, unread_count: 3 }]),
    ).toEqual({});
  });
});

describe("mergePetNotificationCounts", () => {
  it("adds inbox and health counts for each pet", () => {
    const merged = mergePetNotificationCounts(
      ["milo", "awesome"],
      { milo: 1 },
      { milo: 2, awesome: 3 },
    );
    expect(merged).toEqual({ milo: 3, awesome: 3 });
  });

  it("omits pets with zero total", () => {
    expect(
      mergePetNotificationCounts(["milo"], {}, {}),
    ).toEqual({});
  });
});
