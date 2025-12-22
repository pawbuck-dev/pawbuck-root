import { Pet } from "@/context/selectedPetContext";
import { MedicineData } from "@/models/medication";

export interface NotificationContent {
  title: string;
  body: string;
  data: {
    medicineId: string;
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

