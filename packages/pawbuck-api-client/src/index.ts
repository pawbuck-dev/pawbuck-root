export {
  bookAppointment,
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
  submitHealthRecordsBundle,
  type MiloHealthBundleRequest,
  type MiloHealthBundleResponse,
} from "./miloHealthBundleApi";
