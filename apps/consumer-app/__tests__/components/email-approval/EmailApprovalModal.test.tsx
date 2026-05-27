jest.mock("@/context/emailApprovalContext", () => ({
  useEmailApproval: () => ({
    currentApproval: {
      id: "ap1",
      sender_email: "vet@clinic.com",
      pets: { name: "Rex" },
      validation_status: "pending",
      validation_errors: {},
      document_type: "vaccination",
    },
    isModalVisible: true,
    isProcessing: false,
    handleApprove: jest.fn(),
    handleApproveAnyway: jest.fn(),
    handleReject: jest.fn(),
    handleReplyToVet: jest.fn(),
  }),
}));

import { EmailApprovalModal } from "@/components/email-approval/EmailApprovalModal";
import { ThemeProvider } from "@/context/themeContext";
import { render } from "@testing-library/react-native";
import React from "react";

describe("EmailApprovalModal", () => {
  it("renders unknown sender approval copy", () => {
    const { getByText } = render(
      <ThemeProvider>
        <EmailApprovalModal />
      </ThemeProvider>
    );
    expect(getByText("Rex")).toBeTruthy();
  });
});
