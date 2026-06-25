/**
 * Catalog of services shown on “Select Service” (Figma booking step 3/4).
 * In production, merge with clinic-specific offerings from your API.
 */
export type VetBookingServiceId =
  | "dental"
  | "xray"
  | "vaccination"
  | "blood_work"
  | "wellness"
  | "groom"
  | "emergency"
  | "surgery_consult";

export type VetBookingServiceCatalogItem = {
  id: VetBookingServiceId;
  label: string;
  /** MaterialCommunityIcons glyph name */
  icon: string;
  /** Pastel circle behind icon */
  circleBg: string;
};

export const VET_BOOKING_SERVICES_CATALOG: VetBookingServiceCatalogItem[] = [
  { id: "dental", label: "Dental Cleaning", icon: "tooth-outline", circleBg: "#D4E8FF" },
  { id: "xray", label: "X-Ray", icon: "stethoscope", circleBg: "#FFE5D4" },
  { id: "vaccination", label: "Vaccination", icon: "needle", circleBg: "#C8F0EE" },
  { id: "blood_work", label: "Blood Work", icon: "water", circleBg: "#FFD6E8" },
  { id: "wellness", label: "Wellness Exam", icon: "flask-outline", circleBg: "#D4F5D4" },
  { id: "groom", label: "Full Groom", icon: "content-cut", circleBg: "#D4E8FF" },
  { id: "emergency", label: "Emergency Care", icon: "hand-heart", circleBg: "#FFD6E8" },
  { id: "surgery_consult", label: "Surgery Consult", icon: "hospital-building", circleBg: "#C8F0EE" },
];
