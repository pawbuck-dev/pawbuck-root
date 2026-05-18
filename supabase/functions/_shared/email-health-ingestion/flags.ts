function envFlag(name: string): string | undefined {
  return Deno.env.get(name)?.trim().toLowerCase();
}

/** Primary path: Edge pre-classify → canonical storage → PawBuck.API analyze-internal → pet_documents. */
export function useVaultHealthPipeline(): boolean {
  const v = envFlag("EMAIL_HEALTH_VAULT_PIPELINE");
  if (v === "false" || v === "0") return false;
  return true;
}

/** Rollback: Edge OCR functions + dbPersistence after upload. */
export function useLegacyOcrPipeline(): boolean {
  const v = envFlag("EMAIL_LEGACY_OCR_PIPELINE");
  return v === "true" || v === "1";
}

/** When false, *-ocr Edge functions return 410 (vault pipeline is default). */
export function edgeOcrFunctionsEnabled(): boolean {
  const v = envFlag("EDGE_OCR_FUNCTIONS_ENABLED");
  return v === "true" || v === "1";
}
