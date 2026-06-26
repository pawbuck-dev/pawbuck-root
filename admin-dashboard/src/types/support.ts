export interface SubscriptionFeatureGateRow {
  featureKey: string;
  requiresPremium: boolean;
  minimumPlan: "free" | "individual" | "family";
  label: string;
  sortOrder: number;
  updatedAt: string;
}

export interface SubscriptionFeatureGatesResponse {
  items: SubscriptionFeatureGateRow[];
}

export interface PatchSubscriptionFeatureGateBody {
  requiresPremium?: boolean;
  minimumPlan?: "free" | "individual" | "family";
}

export interface FoundingMemberStatsResponse {
  purchaseCount: number;
  spotsRemaining: number;
  cap: number;
}

export type SubscriptionPlanTier = "free" | "individual" | "family";

export interface SubscriptionPlanTierCount {
  plan: SubscriptionPlanTier | string;
  userCount: number;
  foundingMembers: number;
}

export interface SubscriptionPlanBreakdownResponse {
  totalUsers: number;
  usersWithoutEntitlementRow: number;
  expiredPaidSubscriptions: number;
  foundingMembers: number;
  tiers: SubscriptionPlanTierCount[];
  asOf: string;
}

export interface SubscriptionUsage {
  miloConversationsUsed: number;
  aiJournalEntriesUsed: number;
}

export interface SubscriptionLimits {
  maxPets?: number | null;
  maxDocuments?: number | null;
  maxFamilyMembers: number;
  maxMiloConversations?: number | null;
  maxAiJournalEntries?: number | null;
}

export interface SubscriptionStatusResponse {
  plan: SubscriptionPlanTier | string;
  activePlan: SubscriptionPlanTier | string;
  isFoundingMember: boolean;
  isAdminGrant?: boolean;
  productId?: string | null;
  subscriptionStatus?: string | null;
  expiresAt?: string | null;
  usage: SubscriptionUsage;
  limits: SubscriptionLimits;
  foundingSpotsRemaining?: number | null;
  documentCount: number;
}

export interface SetAdminEntitlementBody {
  plan: SubscriptionPlanTier | "free";
  expiresAt?: string | null;
  note?: string | null;
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

/** GET /api/support/queues/summary */
export interface SupportQueuesSummary {
  asOf: string;
  reviewInboxOpen: number;
  stuckProcessing: number;
  mailFailuresLast30Days: number;
  opsChecksFailing: number;
  opsAllReady: boolean;
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
  plan: SubscriptionPlanTier | string;
  isFoundingMember: boolean;
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
  dateOfBirth: string | null;
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
  /** Detail-only diagnostics (GET by id). */
  consumerInboxVisible?: boolean;
  consumerInboxHiddenReason?: string | null;
  canOwnerResolve?: boolean;
  storedArchiveStatus?: string | null;
  storedArchiveMessage?: string | null;
  recommendedAction?: string | null;
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
  totalReviewInboxCandidates: number;
  totalStuckProcessing: number;
  totalHardFailuresClearedFromInbox?: number;
  byDocumentType: SupportProcessedEmailsSummaryBucket[];
}

export interface SupportDailyProcessingVolume {
  date: string;
  total: number;
  succeeded: number;
  failed: number;
}

export interface SupportFailureCategoryBucket {
  category: string;
  label: string;
  description: string;
  count: number;
  shareOfFailures: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface SupportTopFailureReason {
  reason: string;
  category: string;
  count: number;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface SupportDailyFailureCategory {
  date: string;
  category: string;
  label: string;
  count: number;
}

export interface SupportQualityTrend {
  previousFrom: string;
  previousTo: string;
  previousSuccessRate: number;
  successRateDelta: number;
  previousFailed: number;
  failedDelta: number;
}

export interface SupportOpsHealthCheck {
  id: string;
  label: string;
  ok: boolean;
  hint: string;
}

export interface SupportOpsHealthResponse {
  allReady: boolean;
  checks: SupportOpsHealthCheck[];
  checkedAt?: string;
  postgresLatencyMs?: number | null;
  latestProbes?: SupportOpsProbeSnapshot[];
}

export interface SupportOpsProbeSnapshot {
  probeName: string;
  ok: boolean;
  latencyMs?: number | null;
  errorSummary?: string | null;
  source: string;
  checkedAt: string;
}

export interface SupportOpsAvailabilityResponse {
  asOf: string;
  overallAvailability24h: number;
  overallAvailability7d: number;
  probes: SupportProbeAvailability[];
  dailyOverall: SupportDailyAvailability[];
}

export interface SupportProbeAvailability {
  probeName: string;
  label: string;
  availability24h: number;
  availability7d: number;
  samples24h: number;
  samples7d: number;
  lastOk?: boolean | null;
  lastErrorSummary?: string | null;
}

export interface SupportDailyAvailability {
  date: string;
  availabilityPct: number;
  samples: number;
}

export interface SupportReleaseStuckLockResponse {
  released: boolean;
  message: string;
  email?: SupportProcessedEmailDetail;
}

export interface SupportDocumentTypeOutcome {
  documentType: string;
  succeeded: number;
  failed: number;
  successRate: number;
}

export interface SupportEmailProcessingMetrics {
  totalCompleted: number;
  totalSucceeded: number;
  totalFailed: number;
  successRate: number;
  totalReviewInboxOpen: number;
  totalStuckProcessing: number;
  dailyVolume: SupportDailyProcessingVolume[];
  byFailureCategory: SupportFailureCategoryBucket[];
  topFailureReasons: SupportTopFailureReason[];
  byDocumentType: SupportDocumentTypeOutcome[];
  dailyFailuresByCategory: SupportDailyFailureCategory[];
  qualityTrend: SupportQualityTrend;
}

export interface SupportVaultDocumentTypeBucket {
  documentType: string;
  count: number;
}

export interface SupportVaultProcessingMetrics {
  totalDocuments: number;
  clinicalSynced: number;
  clinicalSyncErrors: number;
  pendingClinicalSync: number;
  byDocumentType: SupportVaultDocumentTypeBucket[];
}

export interface SupportDocumentProcessingMetricsResponse {
  from: string;
  to: string;
  email: SupportEmailProcessingMetrics;
  vault: SupportVaultProcessingMetrics;
}

export interface SupportMiloQualityBucketRow {
  key: string;
  count: number;
}

export interface SupportMiloQualityOverviewResponse {
  from: string;
  to: string;
  total: number;
  successCount: number;
  partialCount: number;
  failedCount: number;
  successRate: number;
  bySurface: SupportMiloQualityBucketRow[];
  topFailureCodes: SupportMiloQualityBucketRow[];
}

export interface SupportMiloQualityOutcomeRow {
  id: string;
  createdAt: string;
  userId?: string;
  petId?: string;
  turnId?: string;
  documentId?: string;
  surface: string;
  outcome: string;
  failureCode?: string;
  intentTags: string[];
  usedRag: boolean;
  usedCurated: boolean;
  usedPetFacts: boolean;
  journalEmergencyStop: boolean;
  documentType?: string;
  confidence?: number;
  modelId?: string;
}

export interface SupportMiloQualityOutcomesResponse {
  from: string;
  to: string;
  total: number;
  items: SupportMiloQualityOutcomeRow[];
}

export interface SupportBulkClearReviewInboxRequest {
  action?: "dismiss" | "resolve";
  dryRun?: boolean;
  ownerUserId?: string;
  ownerEmail?: string;
  from?: string;
  to?: string;
  emailIds?: string[];
  maxRows?: number;
}

export interface SupportBulkClearReviewInboxResponse {
  dryRun: boolean;
  action: string;
  matchingCount: number;
  updatedCount: number;
  message: string;
}

export interface SupportBulkReprocessReviewInboxRequest {
  dryRun?: boolean;
  defaultDocType?: "vaccinations" | "medications" | "lab_results" | "clinical_exams";
  includeDismissed?: boolean;
  ownerUserId?: string;
  ownerEmail?: string;
  from?: string;
  to?: string;
  emailIds?: string[];
  maxRows?: number;
}

export interface SupportBulkReprocessRowResult {
  emailId: string;
  subject: string | null;
  status: string;
  message: string | null;
}

export interface SupportBulkReprocessReviewInboxResponse {
  dryRun: boolean;
  eligibleCount: number;
  attemptedCount: number;
  succeededCount: number;
  failedCount: number;
  skippedCount: number;
  message: string;
  results: SupportBulkReprocessRowResult[];
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
