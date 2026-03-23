import { Toggle } from "@/components/ui/Toggle";
import { useTheme } from "@/context/themeContext";
import { fireEvent, render, screen } from "@testing-library/react-native";

jest.mock("@/context/themeContext", () => ({
  useTheme: jest.fn(),
}));

describe("Toggle", () => {
  beforeEach(() => {
    (useTheme as jest.Mock).mockReturnValue({
      theme: {
        primary: "#3BD0D2",
        border: "#ccc",
      },
    });
  });

  it("renders and calls onValueChange when pressed", () => {
    const onValueChange = jest.fn();
    render(<Toggle value={false} onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId("pawbuck-toggle"));
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("toggles off when value is true", () => {
    const onValueChange = jest.fn();
    render(<Toggle value onValueChange={onValueChange} />);
    fireEvent.press(screen.getByTestId("pawbuck-toggle"));
    expect(onValueChange).toHaveBeenCalledWith(false);
  });
});
