import PetJournalHomeCard from "@/components/petJournal/PetJournalHomeCard";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { fetchAllJournalEntriesForPet } from "@/services/petJournal";
import { useQuery } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react-native";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("@/services/petJournal", () => ({
  fetchAllJournalEntriesForPet: jest.fn(),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/context/subscriptionContext", () => ({
  useSubscription: jest.fn(),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: jest.fn(),
}));

const pet = {
  id: "pet-1",
  name: "Milo",
  user_id: "u1",
} as any;

describe("PetJournalHomeCard", () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        foreground: "#fff",
        secondary: "#aaa",
        primary: "#3BD0D2",
        primaryForeground: "#000",
        background: "#111",
      },
      mode: "dark",
    });
    (useSubscription as jest.Mock).mockReturnValue({
      ensurePremium: (fn: () => void) => fn(),
    });
  });

  it("shows empty-state copy and journal shortcuts when there are no entries", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isPending: false,
    });

    render(<PetJournalHomeCard pet={pet} />);
    expect(screen.getByText("Milo's Journal")).toBeTruthy();
    expect(screen.getByText(/Notes help Milo and your Health Briefing/)).toBeTruthy();
    expect(screen.getByText("Check in with Milo")).toBeTruthy();
    expect(screen.getByText("View all")).toBeTruthy();
    expect(screen.getByText("Symptom")).toBeTruthy();
    expect(screen.getByText("Appetite")).toBeTruthy();
    expect(screen.getByText("Mood")).toBeTruthy();
    expect(screen.getByText("More")).toBeTruthy();
    expect(screen.queryByText("QUICK LOG")).toBeNull();
    expect(screen.queryByText("Walk")).toBeNull();
  });

  it("shows latest entry title and view-all label when entries exist", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [
        {
          id: "e1",
          pet_id: "pet-1",
          domain: "health",
          subtype: "symptom",
          entry_date: new Date().toISOString().slice(0, 10),
          note: "Eating less + back-leg stiffness",
          triage_status: "watching",
          vet_flagged: false,
        },
      ],
      isPending: false,
    });

    render(<PetJournalHomeCard pet={pet} />);
    expect(screen.getByText("Eating less + back-leg stiffness")).toBeTruthy();
    expect(screen.getByText(/LAST ENTRY/)).toBeTruthy();
    expect(screen.getByText("View all · 1 entry this week")).toBeTruthy();
    expect(screen.getByText("Check in with Milo")).toBeTruthy();
  });

  it("shows loading indicator while fetching", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: undefined,
      isPending: true,
    });

    render(<PetJournalHomeCard pet={pet} />);
    expect(screen.getByText("Milo's Journal")).toBeTruthy();
    expect(screen.queryByText("View all")).toBeNull();
  });
});
