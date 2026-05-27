jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import HealthRecordsUploadSheet from "@/components/health/HealthRecordsUploadSheet";
import { ThemeProvider } from "@/context/themeContext";
import { fireEvent, render } from "@testing-library/react-native";
import React from "react";

describe("HealthRecordsUploadSheet", () => {
  it("invokes option handlers", () => {
    const onLibrary = jest.fn();
    const onPdf = jest.fn();
    const { getByText } = render(
      <ThemeProvider>
        <HealthRecordsUploadSheet
          visible
          title="Add vaccination"
          onClose={jest.fn()}
          options={[
            { id: "library", label: "Photo library", icon: "images-outline", onPress: onLibrary },
            { id: "pdf", label: "PDF file", icon: "document-outline", usePdfBadge: true, onPress: onPdf },
          ]}
        />
      </ThemeProvider>
    );

    fireEvent.press(getByText("Photo library"));
    fireEvent.press(getByText("PDF file"));
    expect(onLibrary).toHaveBeenCalled();
    expect(onPdf).toHaveBeenCalled();
  });
});
