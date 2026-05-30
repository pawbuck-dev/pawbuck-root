import type { Pet } from "@/context/petsContext";
import { fetchHealthExportBundle } from "@/services/healthExportBundle";
import { buildPetPassportHtml } from "@/services/petPassportTemplate";
import {
  petPhotoDataUri,
  printHtmlToPdfFile,
  qrDataUriForUrl,
  sharePdfFile,
} from "@/services/healthExportPdfCommon";
import { petPassportVerifyPath } from "@/constants/healthExportUrls";

export async function generatePetPassportPdf(pet: Pet): Promise<string> {
  const bundle = await fetchHealthExportBundle(pet);
  const [photo, qr] = await Promise.all([
    petPhotoDataUri(pet.photo_url),
    qrDataUriForUrl(petPassportVerifyPath(pet.email_id ?? pet.name)),
  ]);
  const html = buildPetPassportHtml({ bundle, petPhotoDataUri: photo, qrDataUri: qr });
  const filename = `${pet.name.replace(/[^a-zA-Z0-9]/g, "_")}_Pet_Health_Passport.pdf`;
  return printHtmlToPdfFile(html, filename);
}

export async function sharePetPassportPdf(pet: Pet): Promise<void> {
  const uri = await generatePetPassportPdf(pet);
  await sharePdfFile(uri, "Share Pet Health Passport");
}

/** @deprecated Use generatePetPassportPdf — kept for imports from pdfGenerator. */
export type GeneratePDFOptions = { pet: Pet; vaccinations?: unknown[] };
