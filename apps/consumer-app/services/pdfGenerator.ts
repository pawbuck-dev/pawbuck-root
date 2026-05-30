/**
 * Pet Health Passport PDF (v2 template).
 * Re-exports for backward compatibility with existing imports.
 */
import type { Tables } from "@/database.types";
import type { Pet } from "@/context/petsContext";
import { generatePetPassportPdf, sharePetPassportPdf } from "@/services/petPassportPdf";

export type GeneratePDFOptions = {
  pet: Pet;
  vaccinations: Tables<"vaccinations">[];
};

export const generatePetPassportPDF = async ({ pet }: GeneratePDFOptions): Promise<string> => {
  return generatePetPassportPdf(pet);
};

export const sharePetPassportPDF = sharePetPassportPdf;

export const generateAndSharePetPassport = async (options: GeneratePDFOptions): Promise<void> => {
  await sharePetPassportPdf(options.pet);
};
