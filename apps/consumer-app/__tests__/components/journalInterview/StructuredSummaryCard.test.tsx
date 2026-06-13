import { StructuredSummaryCard } from "@/components/journalInterview/StructuredSummaryCard";
import { ThemeProvider } from "@/context/themeContext";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

const wrap = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe("StructuredSummaryCard", () => {
  it("calls onConfirm and onEdit", () => {
    const onConfirm = jest.fn();
    const onEdit = jest.fn();
    const { getByText } = wrap(
      <StructuredSummaryCard
        petName="Milo"
        summary={{ fields: { SYMPTOM: "Vomiting" } }}
        onConfirm={onConfirm}
        onEdit={onEdit}
      />
    );
    fireEvent.press(getByText("Looks right — save"));
    fireEvent.press(getByText("Edit"));
    expect(onConfirm).toHaveBeenCalled();
    expect(onEdit).toHaveBeenCalled();
  });

  it("shows attach photo when hint set", () => {
    const onAttachPhoto = jest.fn();
    const { getByText } = wrap(
      <StructuredSummaryCard
        petName="Milo"
        summary={{ fields: { SYMPTOM: "Itch" }, attachmentHint: true }}
        onConfirm={jest.fn()}
        onAttachPhoto={onAttachPhoto}
      />
    );
    fireEvent.press(getByText("Attach a photo (optional)"));
    expect(onAttachPhoto).toHaveBeenCalled();
  });

  it("hides fields with Not specified values", () => {
    const { getByText, queryByText } = wrap(
      <StructuredSummaryCard
        petName="Milo"
        summary={{
          fields: {
            NOTE: "Not specified",
            ONSET: "Acute, today. Frequency: 2-3 episodes",
          },
        }}
        onConfirm={jest.fn()}
      />
    );
    expect(getByText("ONSET")).toBeTruthy();
    expect(getByText("Acute, today. Frequency: 2-3 episodes")).toBeTruthy();
    expect(queryByText("NOTE")).toBeNull();
    expect(queryByText("Not specified")).toBeNull();
  });
});
