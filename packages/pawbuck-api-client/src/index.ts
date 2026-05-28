export {
  bookAppointment,
  BookingApiError,
  fetchAvailability,
  type AvailabilityResponse,
  type BookAppointmentResponse,
  type BookingServiceType,
  type NormalizedSlotDto,
} from "./bookingApi";

export {
  analyzePetDocument,
  type AnalyzePetDocumentRequest,
  type PetDocumentClinicalSyncResultDto,
  type PetDocumentVaultRowDto,
} from "./miloDocumentsApi";

export {
  MILO_DOCUMENT_FALLBACK_MESSAGE,
  MILO_DOCUMENT_TIMEOUT_MESSAGE,
  MILO_DOCUMENT_UNAVAILABLE_MESSAGE,
  extractApiErrorMessage,
  fetchWithRetry,
  isRetryableHttpStatus,
  normalizeNonJsonApiError,
  parseApiResponseBody,
} from "./httpErrors";

export {
  submitHealthRecordsBundle,
  type MiloHealthBundleRequest,
  type MiloHealthBundleResponse,
} from "./miloHealthBundleApi";
