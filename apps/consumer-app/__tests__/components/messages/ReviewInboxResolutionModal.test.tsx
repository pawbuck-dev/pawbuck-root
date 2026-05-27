jest.mock("@/context/petsContext", () => ({
  usePets: () => ({
    pets: [{ id: "pet-1", name: "Rex" }],
  }),
}));

jest.mock("@/utils/mailResolveApi", () => ({
  resolveReviewInboxEmail: jest.fn().mockResolvedValue(undefined),
}));

import ReviewInboxResolutionModal from "@/components/messages/ReviewInboxResolutionModal";
import { ThemeProvider } from "@/context/themeContext";
import { resolveReviewInboxEmail } from "@/utils/mailResolveApi";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

const item = {
  id: "email-1",
  pet_id: "pet-1",
  subject: "Vaccine",
  failure_reason: "breed mismatch",
  pets: { name: "Rex" },
} as any;

describe("ReviewInboxResolutionModal", () => {
  it("calls resolveReviewInboxEmail on confirm", async () => {
    const onResolved = jest.fn();
    const { getByText } = render(
      <ThemeProvider>
        <ReviewInboxResolutionModal
          visible
          item={item}
          onClose={jest.fn()}
          onResolved={onResolved}
        />
      </ThemeProvider>
    );

    fireEvent.press(getByText("Confirm"));
    await waitFor(() => {
      expect(resolveReviewInboxEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          emailId: "email-1",
          selectedPetId: "pet-1",
          selectedDocType: "vaccinations",
        })
      );
    });
  });
});
