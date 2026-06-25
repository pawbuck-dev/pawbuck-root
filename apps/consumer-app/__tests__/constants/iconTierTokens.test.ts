import {
  DOMAIN_CATEGORY_DEFAULT_ICONS,
  DOMAIN_CATEGORY_IDS,
  getDomainCategoryIconTier,
  getNavigationIconTier,
  hubCardTypeToDomainCategory,
  ICON_WELL_SIZES,
} from "@/constants/iconTierTokens";

describe("iconTierTokens", () => {
  describe("getNavigationIconTier", () => {
    it("returns distinct dark and light navigation tiers", () => {
      const dark = getNavigationIconTier(true);
      const light = getNavigationIconTier(false);

      expect(dark.wellBg).not.toBe(light.wellBg);
      expect(dark.glyphColor).not.toBe(light.glyphColor);
      expect(dark).toMatchObject({
        wellBg: "rgba(255,255,255,0.1)",
        glyphColor: "#FFFFFF",
      });
      expect(light).toMatchObject({
        wellBg: "#E0E0E0",
        glyphColor: "#111111",
      });
    });
  });

  describe("getDomainCategoryIconTier", () => {
    it("defines all domain categories with dark/light B1 tiers", () => {
      expect(DOMAIN_CATEGORY_IDS).toHaveLength(9);

      for (const category of DOMAIN_CATEGORY_IDS) {
        const dark = getDomainCategoryIconTier(category, true);
        const light = getDomainCategoryIconTier(category, false);

        expect(dark.wellBg).not.toBe(light.wellBg);
        expect(dark.glyphColor).not.toBe(light.glyphColor);
        expect(dark.wellBg).toMatch(/^rgba\(/);
        expect(light.wellBg).toMatch(/^rgba\(/);
        expect(DOMAIN_CATEGORY_DEFAULT_ICONS[category]).toBeDefined();
      }
    });

    it("maps health hub card types to domain categories", () => {
      expect(hubCardTypeToDomainCategory("vaccine")).toBe("vaccines");
      expect(hubCardTypeToDomainCategory("med")).toBe("medications");
      expect(hubCardTypeToDomainCategory("exam")).toBe("clinical_visits");
      expect(hubCardTypeToDomainCategory("lab")).toBe("labs");
    });
  });

  describe("ICON_WELL_SIZES", () => {
    it("uses sm/md/lg well and icon dimensions", () => {
      expect(ICON_WELL_SIZES).toEqual({
        sm: { well: 28, icon: 16 },
        md: { well: 40, icon: 20 },
        lg: { well: 44, icon: 22 },
        xl: { well: 56, icon: 26 },
        hero: { well: 128, icon: 56 },
      });
    });
  });
});
