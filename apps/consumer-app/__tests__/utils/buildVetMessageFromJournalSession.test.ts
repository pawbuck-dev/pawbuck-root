import type { Pet } from "@/context/petsContext";
import {
  buildVetMessageFromJournalSession,
  buildVetMessageSubject,
  stripJournalChipLinesFromVetBody,
  pickPrimaryVetGreetingName,
  shouldSuppressVetEmailCompose,
  stripMarkdownForVetEmail,
} from "@/utils/buildVetMessageFromJournalSession";

function mockPet(over: Partial<Pet> = {}): Pet {
  return {
    id: "pet-1",
    user_id: "u1",
    name: "Pawsome",
    animal_type: "dog",
    breed: "Malamute",
    color: null,
    country: "US",
    created_at: "",
    date_of_birth: "2022-01-15",
    deleted_at: null,
    email_id: "pawsome2",
    microchip_number: null,
    passport_number: null,
    pet_parent_display_name: null,
    photo_url: null,
    sex: "male",
    target_weight_unit: null,
    target_weight_value: null,
    weight_value: 32,
    weight_unit: "kg",
    ...over,
  } as Pet;
}

describe("stripMarkdownForVetEmail", () => {
  it("removes bold markers", () => {
    expect(stripMarkdownForVetEmail("**Observations:** soft stool.")).toBe("Observations: soft stool.");
  });
});

describe("shouldSuppressVetEmailCompose", () => {
  it("suppresses when triage is emergency", () => {
    expect(shouldSuppressVetEmailCompose({ triage: { level: "emergency" } }, "medium")).toBe(true);
  });
  it("suppresses when severity is urgent", () => {
    expect(shouldSuppressVetEmailCompose(null, "urgent")).toBe(true);
  });
  it("allows email for medium without emergency triage", () => {
    expect(shouldSuppressVetEmailCompose({ triage: { level: "advice" } }, "medium")).toBe(false);
  });
});

describe("buildVetMessageFromJournalSession", () => {
  const base = () => ({
    pet: mockPet(),
    userTurns: ["Watery stool for 3 days"],
    journalSummary: null,
    ownerSigningName: "Alex Rivera",
    sessionDateLabel: "May 10, 2026",
    logIsoTimestamp: "2026-05-10T16:42:00.000Z",
    timezoneAbbrev: "GMT",
    severity: "medium" as const,
  });

  it("uses plain-text header and no Dear / Best regards", () => {
    const body = buildVetMessageFromJournalSession(base());
    expect(body).toContain("PET        Pawsome");
    expect(body).toContain("OWNER      Alex Rivera");
    expect(body).not.toContain("Dear ");
    expect(body).not.toContain("Best regards");
    expect(body).not.toContain("**");
    expect(body).toContain("Alex Rivera");
    expect(body).toContain("Pawsome's parent · sent via PawBuck");
    expect(body).toContain("Reply directly to this email");
  });

  it("renders structured observations with userText over chip", () => {
    const body = buildVetMessageFromJournalSession({
      ...base(),
      vetNotificationPayload: {
        observations: [
          {
            displayLabel: "Diarrhea",
            primaryChip: "Vomiting or diarrhea",
            userText: "Watery stool, no blood",
          },
        ],
      },
    });
    expect(body).toContain("What:       Watery stool, no blood");
    expect(body).not.toMatch(/What:.*Vomiting or diarrhea/s);
  });

  it("includes MEDICAL CONTEXT when vetMedicalContext is provided", () => {
    const body = buildVetMessageFromJournalSession({
      ...base(),
      vetMedicalContext: {
        lastVisitDate: "2025-11-01",
        lastVisitLabel: "Wellness",
        vaccinesStatus: "Current",
        vaccinesDetail: "Rabies due 2026",
      },
    });
    expect(body).toContain("MEDICAL CONTEXT");
    expect(body).toContain("LAST VISIT     2025-11-01 · Wellness");
  });
});

describe("pickPrimaryVetGreetingName", () => {
  it("prefers veterinarian type", () => {
    expect(
      pickPrimaryVetGreetingName([
        { vet_name: "Walker Joe", clinic_name: "", type: "dog_walker" },
        { vet_name: "Amy Chen", clinic_name: "Paws Clinic", type: "veterinarian" },
      ])
    ).toBe("Amy Chen");
  });
});

describe("buildVetMessageSubject", () => {
  it("includes pet, summary segment, and urgency tag within 70 chars", () => {
    const subject = buildVetMessageSubject({
      pet: mockPet(),
      userTurns: ["Coughing"],
      journalSummary: null,
      ownerSigningName: "Sam",
      sessionDateLabel: "May 10, 2026",
      severity: "low",
    });
    expect(subject.length).toBeLessThanOrEqual(70);
    expect(subject).toContain("Pawsome");
    expect(subject).toContain("FYI");
    expect(subject).toMatch(/·/);
    expect(subject).not.toContain("!");
  });

  it("uses vetAsk when provided", () => {
    const subject = buildVetMessageSubject({
      pet: mockPet(),
      userTurns: ["Coughing"],
      journalSummary: null,
      ownerSigningName: "Sam",
      sessionDateLabel: "May 10, 2026",
      severity: "low",
      vetAsk: "urgent",
    });
    expect(subject).toContain("Urgent");
  });
});

describe("stripJournalChipLinesFromVetBody", () => {
  it("removes confirm chip lines from body", () => {
    const body = "SYMPTOM: Cough\n\nLooks right — save\nEdit a field";
    expect(stripJournalChipLinesFromVetBody(body)).toBe("SYMPTOM: Cough");
  });
});
