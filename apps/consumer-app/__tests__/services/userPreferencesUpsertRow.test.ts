import { buildUserPreferencesUpsertRow } from "@/services/userPreferences";

describe("buildUserPreferencesUpsertRow", () => {
  it("includes full_name when provided", () => {
    const row = buildUserPreferencesUpsertRow("user-1", {
      full_name: "Ada Lovelace",
    });
    expect(row.user_id).toBe("user-1");
    expect(row.vaccination_reminder_days).toBe(14);
    expect(row.full_name).toBe("Ada Lovelace");
  });

  it("omits full_name when not in partial preferences", () => {
    const row = buildUserPreferencesUpsertRow("user-2", {});
    expect(row).not.toHaveProperty("full_name");
    expect(row.vaccination_reminder_days).toBe(14);
  });

  it("merges phone and address when provided", () => {
    const row = buildUserPreferencesUpsertRow("user-3", {
      phone: "+15551212",
      address: "1 Main St",
    });
    expect(row.phone).toBe("+15551212");
    expect(row.address).toBe("1 Main St");
  });

  it("includes journal_prompt fields when provided", () => {
    const row = buildUserPreferencesUpsertRow("user-4", {
      journal_prompt_enabled: false,
      journal_prompt_hour: 19,
      journal_prompt_minute: 30,
    });
    expect(row.journal_prompt_enabled).toBe(false);
    expect(row.journal_prompt_hour).toBe(19);
    expect(row.journal_prompt_minute).toBe(30);
  });
});
