import { getSettingsSubscreenTokens } from "@/components/layout/settingsSubscreenTokens";

describe("getSettingsSubscreenTokens", () => {
  const theme = {
    background: "#0a1a1a",
    foreground: "#fff",
    secondary: "#aaa",
    card: "#1a2a2a",
    border: "#333",
    primary: "#3BD0D2",
  };

  it("uses glass tile surfaces in dark mode", () => {
    const t = getSettingsSubscreenTokens(theme as never, true);
    expect(t.tileBg).toBe("rgba(255,255,255,0.04)");
    expect(t.listCardBg).toBe("rgba(255,255,255,0.06)");
    expect(t.contentPaddingH).toBe(20);
  });

  it("uses light page background in light mode", () => {
    const t = getSettingsSubscreenTokens(theme as never, false);
    expect(t.pageBg).toBe("#F5F7F8");
    expect(t.iconWellBg).toBe("#EDEDEE");
  });
});
