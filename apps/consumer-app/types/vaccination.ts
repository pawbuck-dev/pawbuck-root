import { Tables, TablesInsert } from "@/database.types";

export type Vaccination = Tables<"vaccinations">;
export type VaccinationInsert = TablesInsert<"vaccinations">;

// Type definitions for vaccination OCR response
export type VaccinationOCRRecord = {
  name: string;
  date: string; // YYYY-MM-DD format
  next_due_date: string; // YYYY-MM-DD format
  clinic_name: string;
  notes: string;
  document_url: string;
};

export type VaccinationOCRResponse = {
  vaccines: VaccinationOCRRecord[];
};
