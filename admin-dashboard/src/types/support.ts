export interface SupportMetrics {
  totalUsers: number;
  usersWithPets: number;
  usersWithPetsAndHealthRecords: number;
}

export interface SupportUserRow {
  id: string;
  email: string | null;
  createdAt: string | null;
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
