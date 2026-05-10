import { Pet } from "@/context/selectedPetContext";
import { MedicineData } from "@/types/medication";
import { Vaccination } from "@/types/vaccination";

export interface NotificationContent {
  title: string;
  body: string;
  data: {
    medicineId?: string;
    vaccinationId?: string;
    petId: string;
    url: string;
    notificationKind?: string;
    /** Days before due for staged vaccine reminders (30, 7, 0). */
    vaccineOffsetDays?: number;
  };
}

/**
 * Build notification content for a medicine reminder
 */
export const buildNotificationContent = (
  medicine: MedicineData,
  pet: Pet
): NotificationContent => {
  return {
    title: `${pet.name}'s Medication`,
    body: `${medicine.name} - ${medicine.dosage}`,
    data: {
      medicineId: medicine.id,
      petId: pet.id,
      url: `/health-record/${pet.id}/(tabs)/medications`,
    },
  };
};

/**
 * Build notification content for a vaccination reminder (multi-stage: 30d, 7d, day-of).
 */
export const buildVaccinationNotificationContent = (
  vaccination: Vaccination,
  pet: Pet,
  offsetDays: 30 | 7 | 0
): NotificationContent => {
  const dueDate = new Date(vaccination.next_due_date!).toLocaleDateString();
  const when =
    offsetDays === 30
      ? "in 30 days"
      : offsetDays === 7
        ? "in 7 days"
        : "today";
  return {
    title:
      offsetDays === 0 ? `${pet.name}'s vaccination is due today` : `${pet.name}'s vaccination reminder`,
    body: `${vaccination.name} is due on ${dueDate} (${when}).`,
    data: {
      vaccinationId: vaccination.id,
      petId: pet.id,
      url: `/health-record/${pet.id}/(tabs)/vaccinations`,
      notificationKind: "vaccination_reminder",
      vaccineOffsetDays: offsetDays,
    },
  };
};





