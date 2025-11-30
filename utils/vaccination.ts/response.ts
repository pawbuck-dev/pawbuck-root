import {
  VaccinationInsert,
  VaccinationOCRResponse,
} from "@/models/vaccination";

export const parseVaccinationOCRResponse = (
  petId: string,
  response: VaccinationOCRResponse
): VaccinationInsert[] => {
  const vaccines: VaccinationInsert[] = response.vaccines.map((vaccine) => ({
    name: vaccine.name,
    date: vaccine.date,
    next_due_date: vaccine.next_due_date,
    clinic_name: vaccine.clinic_name,
    notes: vaccine.notes || "",
    document_url: vaccine.document_url,
    pet_id: petId,
    created_at: new Date().toISOString(),
  }));

  return vaccines;
};
