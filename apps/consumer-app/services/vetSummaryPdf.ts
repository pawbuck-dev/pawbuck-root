import type { Pet } from "@/context/petsContext";
import { fetchClinicalSummaryForExport } from "@/services/fetchClinicalSummaryForExport";
import { fetchHealthExportBundle } from "@/services/healthExportBundle";
import { buildVetSummaryHtml } from "@/services/vetSummaryTemplate";
import { printHtmlToPdfFile, sharePdfFile } from "@/services/healthExportPdfCommon";

export async function generateVetSummaryPdf(pet: Pet): Promise<string> {
  const bundle = await fetchHealthExportBundle(pet);
  const clinical = await fetchClinicalSummaryForExport(bundle);
  const html = buildVetSummaryHtml({ bundle, clinical });
  const filename = `${pet.name.replace(/[^a-zA-Z0-9]/g, "_")}_Veterinary_Summary.pdf`;
  return printHtmlToPdfFile(html, filename);
}

export async function shareVetSummaryPdf(pet: Pet): Promise<void> {
  const uri = await generateVetSummaryPdf(pet);
  await sharePdfFile(uri, "Share Veterinary Summary");
}
