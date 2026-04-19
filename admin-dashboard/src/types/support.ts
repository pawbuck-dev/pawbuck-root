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
