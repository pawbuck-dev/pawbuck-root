export interface SubscriptionFeatureGateRow {
  featureKey: string;
  requiresPremium: boolean;
  label: string;
  sortOrder: number;
  updatedAt: string;
}

export interface SubscriptionFeatureGatesResponse {
  items: SubscriptionFeatureGateRow[];
}

export interface PatchSubscriptionFeatureGateBody {
  requiresPremium: boolean;
}

export type EmailDocumentType =
  | "medications"
  | "lab_results"
  | "clinical_exams"
  | "vaccinations"
  | "billing_invoice"
  | "travel_certificate";

export interface CountryEmailDocumentVerificationRow {
  country: string;
  allowNameOnlyDocumentTypes: string[];
  breedRequiredDocumentTypes: string[];
  fuzzyMatchThreshold: number;
  enabled: boolean;
  notes: string | null;
  updatedAt: string | null;
}

export interface CountryEmailDocumentVerificationListResponse {
  items: CountryEmailDocumentVerificationRow[];
}

export interface PatchCountryEmailDocumentVerificationBody {
  allowNameOnlyDocumentTypes?: string[];
  breedRequiredDocumentTypes?: string[];
  fuzzyMatchThreshold?: number;
  enabled?: boolean;
  notes?: string | null;
}

export interface SupportDailySignupPoint {
  date: string;
  count: number;
}

export interface SupportMetrics {
  totalUsers: number;
  usersWithPets: number;
  usersWithPetsAndHealthRecords: number;
  newUsersLast7Days: number;
  totalPets: number;
  dailySignups: SupportDailySignupPoint[];
}

/** POST /api/support/document-sync/run */
export interface SupportDocumentSyncRunResponse {
  rowsAttempted: number;
  message: string | null;
}

export interface SupportUserRow {
  id: string;
  email: string | null;
  createdAt: string | null;
}

export interface SupportUserDirectoryRow {
  id: string;
  email: string | null;
  displayName: string | null;
  createdAt: string | null;
  petCount: number;
}

export interface SupportUserDirectoryResponse {
  items: SupportUserDirectoryRow[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SupportPetRow {
  id: string;
  userId: string;
  name: string;
  breed: string;
  animalType: string;
  dateOfBirth: string;
  sex: string;
  createdAt: string;
}

export interface SupportPetExplorerRow {
  id: string;
  userId: string;
  ownerEmail: string | null;
  name: string;
  breed: string;
  animalType: string;
  /** good | attention | minimal */
  healthStatus: string;
}

export interface SupportHealthTimelineEvent {
  occurredAt: string;
  eventType: string;
  title: string;
  relatedId: string;
  petId: string;
  petName: string;
}

export interface SupportVaccinationRow {
  id: string;
  petId: string;
  userId: string;
  name: string;
  date: string;
  nextDueDate: string | null;
  clinicName: string | null;
  notes: string | null;
  documentUrl: string | null;
  createdAt: string;
}

export interface CreateSupportVaccinationBody {
  name: string;
  date: string;
  nextDueDate?: string | null;
  clinicName?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
}

export interface UpdateSupportVaccinationBody {
  name?: string;
  date?: string;
  nextDueDate?: string | null;
  clinicName?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
}

/** Admin Milo classify preview — matches PawBuck.API ClassifyResponse. */
export interface MiloClassifyPreviewBody {
  fileBase64: string;
  mimeType: string;
}

export interface MiloClassifyResponse {
  documentType: string;
  confidence: number;
  reasoning: string | null;
  extractionPrompt: string;
}

/** Classify + flexible vault extraction (same schema as Milo vision / pet_documents). */
export interface MiloClassifyExtractPreviewResponse {
  documentType: string;
  confidence: number;
  reasoning: string | null;
  extractionPromptByType: string;
  normalizedDocumentType: string;
  flexibleExtractionPrompt: string;
  extractedJson: string | null;
  extractionError: string | null;
}

/** Journal Milo tuning — matches PawBuck.API MiloJournalConfigSnapshot. */
export interface MiloJournalConfigSnapshot {
  recentMedicalWindowDays: number;
  upcomingMilestoneWindowDays: number;
  recentJournalNotesCount: number;
  seniorAgeYears: number;
  postVaccineFocusDays: number;
  newMedicationFocusDays: number;
  limpingLookbackHours: number;
  quietJournalDays: number;
  surgeryExamTypePatterns: string[];
  promptVersion: string;
  journalTemperature: number;
  journalMaxOutputTokens: number;
  journalTreeInterviewEnabled?: boolean;
}

export interface MedicationAdrStats {
  productCount: number;
  entryCount: number;
  overrideCount: number;
  lastIngestionRun: string | null;
}

export interface MiloJournalFeedbackByVersionRow {
  promptVersion: string;
  upCount: number;
  downCount: number;
}

export interface MiloJournalFeedbackAggregates {
  totalFeedback: number;
  upCount: number;
  downCount: number;
  byPromptVersion: MiloJournalFeedbackByVersionRow[];
  byTreeVersion: MiloJournalFeedbackByVersionRow[];
}

export interface MedicationAdrOverrideRow {
  id: string;
  genericName: string | null;
  labelText: string;
  symptomTaxonomy: string[];
  confidence: number;
  active: boolean;
}

export interface CreateMedicationAdrOverrideBody {
  genericName?: string;
  labelText: string;
  symptomTaxonomy: string[];
  confidence?: number;
  notes?: string;
}

/** POST /api/support/milo/journal/chat-smoke */
export interface MiloJournalChatSmokeBody {
  userId: string;
  petId: string;
  message: string;
  journalMode?: boolean;
}

/** Matches PawBuck.API MiloChatResponse (camelCase JSON). */
export interface MiloChatApiResponse {
  answer: string;
  usedPetData: boolean;
  usedRag: boolean;
  planSummary?: string | null;
  petName?: string | null;
  suggestedReplies?: string[];
  journalSessionComplete?: boolean;
  journalStatus?: string | null;
  journalSummary?: string | null;
  journalEmergencyStop?: boolean;
  responseId?: string | null;
  promptVersion?: string | null;
  heuristicTags?: string[];
}

/** Inbound mail / processed_emails (support API). */
export interface SupportProcessedEmailListItem {
  id: string;
  s3Key: string;
  petId: string | null;
  petName: string | null;
  ownerEmail: string | null;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  attachmentCount: number | null;
  success: boolean | null;
  senderEmail: string | null;
  subject: string | null;
  documentType: string | null;
  failureReason: string | null;
  failureReasonSnippet: string | null;
  reviewStatus: string | null;
}

export type SupportProcessedEmailDetail = SupportProcessedEmailListItem;

export interface SupportProcessedEmailsListResponse {
  items: SupportProcessedEmailListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SupportProcessedEmailsSummaryBucket {
  documentType: string;
  count: number;
}

export interface SupportProcessedEmailsSummaryResponse {
  from: string;
  to: string;
  totalFailures: number;
  byDocumentType: SupportProcessedEmailsSummaryBucket[];
}

export interface SupportProcessedEmailAttachment {
  index: number;
  filename: string;
  mimeType: string;
  size: number;
}

export interface SupportProcessedEmailAttachmentsResponse {
  attachments: SupportProcessedEmailAttachment[];
  errorCode: string | null;
  errorMessage: string | null;
  /** When present, attachments list may be metadata-only (no bytes in archive). */
  warningMessage?: string | null;
}

export interface SupportProcessedEmailSignedUrlResponse {
  signedUrl: string | null;
  filename: string | null;
  mimeType: string | null;
  previewPath: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}
