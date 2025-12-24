import { Pet } from "@/context/selectedPetContext";
import { MedicineData } from "@/models/medication";
import { Vaccination } from "@/models/vaccination";

export interface NotificationContent {
  title: string;
  body: string;
  data: {
    medicineId?: string;
    vaccinationId?: string;
    petId: string;
    url: string;
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
 * Build notification content for a vaccination reminder
 */
export const buildVaccinationNotificationContent = (
  vaccination: Vaccination,
  pet: Pet
): NotificationContent => {
  const dueDate = new Date(vaccination.next_due_date!).toLocaleDateString();
  return {
    title: `${pet.name}'s Vaccination Due Soon`,
    body: `${vaccination.name} is due on ${dueDate}`,
    data: {
      vaccinationId: vaccination.id,
      petId: pet.id,
      url: `/health-record/${pet.id}/(tabs)/vaccinations`,
    },
  };
};

