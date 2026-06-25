import {
  MESSAGE_CARE_TEAM_FILTERS,
  MESSAGE_CARE_TEAM_SECTION_TITLES,
} from "@/components/messages/MessagesInboxToolbar";
import { HorizontalPillChip } from "@/components/ui/HorizontalPillChip";
import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#0a1a1a",
      foreground: "#fff",
      primary: "#3BD0D2",
      secondary: "#aaa",
      card: "#1a2a2a",
      border: "#333",
    },
    mode: "dark",
  }),
}));

describe("Messages inbox UI", () => {
  it("aligns section titles with care-type filter labels", () => {
    const filterLabels = Object.fromEntries(
      MESSAGE_CARE_TEAM_FILTERS.filter((f) => f.id !== "all").map((f) => [f.id, f.label])
    );
    expect(filterLabels.veterinarian).toBe(MESSAGE_CARE_TEAM_SECTION_TITLES.veterinarian);
    expect(filterLabels.dog_walker).toBe(MESSAGE_CARE_TEAM_SECTION_TITLES.dog_walker);
    expect(filterLabels.boarding).toBe(MESSAGE_CARE_TEAM_SECTION_TITLES.boarding);
  });

  it("renders inline filter icon without avatar well wrapper", () => {
    render(
      <HorizontalPillChip
        label="Vets"
        selected={false}
        leadingWell={false}
        onPress={jest.fn()}
        leading={<Text testID="filter-icon">•</Text>}
      />
    );
    expect(screen.getByText("Vets")).toBeTruthy();
    expect(screen.getByTestId("filter-icon")).toBeTruthy();
  });
});
