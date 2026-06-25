import {
  PROFILE_MY_PETS_LINK_ROWS,
  PROFILE_SETTINGS_ROWS,
} from "@/components/profile/profileMenuConfig";

describe("profileMenuConfig settings rows", () => {
  it("splits notification center from push permissions", () => {
    const ids = PROFILE_SETTINGS_ROWS.map((r) => r.id);
    expect(ids).toContain("notification-center");
    expect(ids).toContain("notifications");
    expect(PROFILE_SETTINGS_ROWS.find((r) => r.id === "notifications")?.title).toBe(
      "Push permissions"
    );
  });

  it("routes privacy to a dedicated screen via profile wiring", () => {
    const privacy = PROFILE_SETTINGS_ROWS.find((r) => r.id === "privacy");
    expect(privacy?.title).toBe("Privacy & Security");
  });
});

describe("profileMenuConfig pet access rows", () => {
  it("uses clearer transfer naming", () => {
    expect(PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "claim")?.title).toBe(
      "Accept pet transfer"
    );
    expect(PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "transfer")?.title).toBe(
      "Transfer pet to someone else"
    );
  });

  it("consolidates household sharing into one Profile hub row", () => {
    const ids = PROFILE_MY_PETS_LINK_ROWS.map((r) => r.id);
    expect(ids).toContain("family-sharing");
    expect(ids).not.toContain("join-household");
    expect(ids).not.toContain("access");

    const hub = PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "family-sharing");
    expect(hub?.title).toBe("Family Sharing");
    expect(hub?.href).toBe("/(home)/family-sharing");
    expect(hub?.subtitle).toMatch(/Join a household/i);
  });

  it("distinguishes transfer flows in subtitles", () => {
    expect(PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "claim")?.subtitle).toMatch(
      /transfer code/i
    );
    expect(PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "transfer")?.subtitle).toMatch(
      /ownership/i
    );
  });
});
