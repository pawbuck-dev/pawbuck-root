import { createClient } from "jsr:@supabase/supabase-js@2";

export type EmailDocumentVerificationConfig = {
  country: string;
  allowNameOnlyDocumentTypes: string[];
  breedRequiredDocumentTypes: string[];
  fuzzyMatchThreshold: number;
  enabled: boolean;
};

export const DEFAULT_EMAIL_DOCUMENT_VERIFICATION: EmailDocumentVerificationConfig = {
  country: "__default__",
  allowNameOnlyDocumentTypes: ["clinical_exams", "medications"],
  breedRequiredDocumentTypes: [
    "vaccinations",
    "lab_results",
    "travel_certificate",
    "billing_invoice",
  ],
  fuzzyMatchThreshold: 0.7,
  enabled: true,
};

function createSupabaseClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Missing Supabase environment variables");
  }
  return createClient(supabaseUrl, supabaseServiceKey);
}

function mapRow(row: {
  country: string;
  allow_name_only_document_types: string[];
  breed_required_document_types: string[];
  fuzzy_match_threshold: number | string;
  enabled: boolean;
}): EmailDocumentVerificationConfig {
  return {
    country: row.country,
    allowNameOnlyDocumentTypes: row.allow_name_only_document_types ?? [],
    breedRequiredDocumentTypes: row.breed_required_document_types ?? [],
    fuzzyMatchThreshold: Number(row.fuzzy_match_threshold) || 0.7,
    enabled: row.enabled !== false,
  };
}

export async function loadEmailDocumentVerificationConfig(
  country: string | null | undefined,
): Promise<EmailDocumentVerificationConfig> {
  const key = country?.trim();
  if (!key) return { ...DEFAULT_EMAIL_DOCUMENT_VERIFICATION };

  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("country_email_document_verification")
      .select(
        "country, allow_name_only_document_types, breed_required_document_types, fuzzy_match_threshold, enabled",
      )
      .eq("country", key)
      .maybeSingle();

    if (error) {
      console.warn(
        `[EmailDocVerification] Config load failed for country="${key}":`,
        error.message,
      );
      return { ...DEFAULT_EMAIL_DOCUMENT_VERIFICATION, country: key };
    }

    if (!data) {
      console.log(
        `[EmailDocVerification] No config row for country="${key}"; using defaults`,
      );
      return { ...DEFAULT_EMAIL_DOCUMENT_VERIFICATION, country: key };
    }

    return mapRow(data as Parameters<typeof mapRow>[0]);
  } catch (e) {
    console.warn("[EmailDocVerification] Config load error:", e);
    return { ...DEFAULT_EMAIL_DOCUMENT_VERIFICATION, country: key ?? "__default__" };
  }
}

export function allowsNameOnlyForDocumentType(
  config: EmailDocumentVerificationConfig,
  documentType: string,
): boolean {
  if (!config.enabled) return false;
  return config.allowNameOnlyDocumentTypes.includes(documentType);
}

export function breedRequiredForDocumentType(
  config: EmailDocumentVerificationConfig,
  documentType: string,
): boolean {
  if (!config.enabled) return true;
  return config.breedRequiredDocumentTypes.includes(documentType);
}
