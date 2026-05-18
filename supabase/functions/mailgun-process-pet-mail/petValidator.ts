/** Re-export canonical validator (country-aware rules live in process-pet-mail). */
export {
  evaluatePetVerification,
  extractPetInfoFromDocument,
  formatDetailedError,
  formatValidationResult,
  validatePetFromDocument,
} from "../process-pet-mail/petValidator.ts";
export type { ValidatePetFromDocumentOptions } from "../process-pet-mail/petValidator.ts";
