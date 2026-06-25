import { VET_BOOKING_SERVICES_CATALOG } from "@/constants/vetBookingServices";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";

describe("vetBookingServices catalog icons", () => {
  it("uses valid MaterialCommunityIcons glyph names for every service", () => {
    const glyphMap = MaterialCommunityIcons.glyphMap;
    for (const item of VET_BOOKING_SERVICES_CATALOG) {
      expect(glyphMap).toHaveProperty(item.icon);
    }
  });
});
