import {
  formatPeeObservationJournalNote,
  formatPoopObservationJournalNote,
} from "@/services/bodyTrackerJournalSync";

describe("bodyTrackerJournalSync note formatting", () => {
  it("formats poop observation note", () => {
    const note = formatPoopObservationJournalNote(
      {
        poop_tags: ["Mucus", "Blood"],
        poop_count: 2,
        poop_target: 6,
        poop_observation_note: "Loose.",
        poop_observation_photo_path: "u/p/p.jpg",
      },
      ""
    );
    expect(note).toContain("stool observation");
    expect(note).toContain("2/6");
    expect(note).toContain("Mucus");
    expect(note).toContain("Notes: Loose.");
    expect(note).toContain("Photo: saved");
  });

  it("prefers draft note over stored when both set", () => {
    const note = formatPoopObservationJournalNote(
      {
        poop_tags: ["Mucus"],
        poop_count: 1,
        poop_target: 4,
        poop_observation_note: "Stored",
        poop_observation_photo_path: null,
      },
      "Draft"
    );
    expect(note).toContain("Notes: Draft");
    expect(note).not.toContain("Stored");
  });

  it("formats pee observation note", () => {
    const note = formatPeeObservationJournalNote(
      {
        pee_tags: ["Unusual color"],
        pee_count: 3,
        pee_target: 6,
        pee_observation_note: null,
        pee_observation_photo_path: null,
      },
      ""
    );
    expect(note).toContain("urine observation");
    expect(note).toContain("3/6");
    expect(note).toContain("Unusual color");
    expect(note).toContain("Photo: none");
  });
});
