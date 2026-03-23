import { MedicineData } from "@/types/medication";

export type MedicineListStatus = "active" | "completed";

export function getMedicineListStatus(medicine: MedicineData): MedicineListStatus {
  const now = new Date();
  if (medicine.end_date) {
    const endDate = new Date(medicine.end_date);
    endDate.setHours(23, 59, 59, 999);
    if (endDate < now) return "completed";
  }
  return "active";
}

export function medicineStatusSubtitle(status: MedicineListStatus): string {
  return status === "active" ? "Active medication" : "Completed medication";
}

export function medicineStatusBadgeStyle(
  status: MedicineListStatus,
  isDark: boolean
): { bg: string; text: string; label: string } {
  if (status === "active") {
    return isDark
      ? { bg: "rgba(96, 165, 250, 0.22)", text: "#93C5FD", label: "Active" }
      : { bg: "rgba(59, 130, 246, 0.12)", text: "#1D4ED8", label: "Active" };
  }
  return isDark
    ? { bg: "rgba(156, 163, 175, 0.18)", text: "#D1D5DB", label: "Completed" }
    : { bg: "rgba(107, 114, 128, 0.14)", text: "#4B5563", label: "Completed" };
}
