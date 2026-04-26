import {
  careActivityKindMatchesScope,
  isLifecycleActivityKind,
  shouldSendPetActivityPush,
} from "@/services/petActivityPolicy";

describe("petActivityPolicy", () => {
  test("isLifecycleActivityKind", () => {
    expect(isLifecycleActivityKind("invite_accepted")).toBe(true);
    expect(isLifecycleActivityKind("vaccine_added")).toBe(false);
  });

  test("careActivityKindMatchesScope", () => {
    expect(careActivityKindMatchesScope("vaccine_added", "all")).toBe(true);
    expect(careActivityKindMatchesScope("vaccine_added", "meds_only")).toBe(false);
    expect(careActivityKindMatchesScope("med_added", "meds_only")).toBe(true);
    expect(careActivityKindMatchesScope("journal_added", "journal_only")).toBe(true);
    expect(careActivityKindMatchesScope("med_updated", "none")).toBe(false);
  });

  test("shouldSendPetActivityPush", () => {
    expect(
      shouldSendPetActivityPush({
        kind: "invite_accepted",
        careActivityScope: "none",
        carePushEnabled: false,
        lifecyclePushEnabled: true,
      })
    ).toBe(true);

    expect(
      shouldSendPetActivityPush({
        kind: "invite_accepted",
        careActivityScope: "all",
        carePushEnabled: true,
        lifecyclePushEnabled: false,
      })
    ).toBe(false);

    expect(
      shouldSendPetActivityPush({
        kind: "vaccine_added",
        careActivityScope: "all",
        carePushEnabled: true,
        lifecyclePushEnabled: true,
      })
    ).toBe(true);

    expect(
      shouldSendPetActivityPush({
        kind: "vaccine_added",
        careActivityScope: "all",
        carePushEnabled: false,
        lifecyclePushEnabled: true,
      })
    ).toBe(false);

    expect(
      shouldSendPetActivityPush({
        kind: "vaccine_added",
        careActivityScope: "meds_only",
        carePushEnabled: true,
        lifecyclePushEnabled: true,
      })
    ).toBe(false);

    expect(
      shouldSendPetActivityPush({
        kind: "journal_updated",
        careActivityScope: "journal_only",
        carePushEnabled: true,
        lifecyclePushEnabled: true,
      })
    ).toBe(true);
  });
});
