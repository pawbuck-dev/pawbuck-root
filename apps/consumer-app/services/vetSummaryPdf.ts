import type { Pet } from "@/context/petsContext";
import { fetchClinicalSummaryForExport } from "@/services/fetchClinicalSummaryForExport";
import { fetchHealthExportBundle } from "@/services/healthExportBundle";
import { buildVetSummaryHtml } from "@/services/vetSummaryTemplate";
import {
  printHtmlToPdfFile,
  qrDataUriForUrl,
  sharePdfFile,
} from "@/services/healthExportPdfCommon";
import { vetSummaryVerifyPath } from "@/constants/healthExportUrls";

export async function generateVetSummaryPdf(pet: Pet): Promise<string> {
  const bundle = await fetchHealthExportBundle(pet);
  const [clinical, qr] = await Promise.all([
    fetchClinicalSummaryForExport(bundle),
    qrDataUriForUrl(vetSummaryVerifyPath(pet.email_id ?? pet.name)),
  ]);
  const html = buildVetSummaryHtml({ bundle, clinical, qrDataUri: qr });
  const filename = `${pet.name.replace(/[^a-zA-Z0-9]/g, "_")}_Veterinary_Summary.pdf`;
  return printHtmlToPdfFile(html, filename);
}

export async function shareVetSummaryPdf(pet: Pet): Promise<void> {
  const uri = await generateVetSummaryPdf(pet);
  await sharePdfFile(uri, "Share Veterinary Summary");
}
