import { Tables, TablesInsert, TablesUpdate } from "@/database.types";

export type ClinicalExam = Tables<"clinical_exams">;
export type ClinicalExamInsert = TablesInsert<"clinical_exams">;
export type ClinicalExamUpdate = TablesUpdate<"clinical_exams">;

// Type definitions for clinical exam OCR response
export interface ClinicalExamOCRExtraction {
  exam_type: string;
  exam_date: string | null;
  clinic_name: string | null;
  vet_name: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  findings: string | null;
  notes: string | null;
  follow_up_date: string | null;
}

export interface ClinicalExamOCRResponse {
  confidence: number;
  exam: ClinicalExamOCRExtraction;
}

// Data type used in the review modal
export interface ClinicalExamData {
  exam_type: string;
  exam_date: string | null;
  clinic_name: string | null;
  vet_name: string | null;
  weight_value: number | null;
  weight_unit: string | null;
  temperature: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  findings: string | null;
  notes: string | null;
  follow_up_date: string | null;
  document_url: string | null;
}

// Helper to convert OCR response to insert format
export function parseClinicalExamOCRResponse(
  petId: string,
  ocrResponse: ClinicalExamOCRResponse,
  documentUrl: string
): Omit<ClinicalExamInsert, "user_id"> {
  const { exam } = ocrResponse;
  
  return {
    pet_id: petId,
    exam_type: exam.exam_type,
    exam_date: exam.exam_date || new Date().toISOString().split('T')[0],
    clinic_name: exam.clinic_name,
    vet_name: exam.vet_name,
    weight_value: exam.weight_value,
    weight_unit: exam.weight_unit,
    temperature: exam.temperature,
    heart_rate: exam.heart_rate,
    respiratory_rate: exam.respiratory_rate,
    findings: exam.findings,
    notes: exam.notes,
    follow_up_date: exam.follow_up_date,
    document_url: documentUrl,
    created_at: new Date().toISOString(),
  };
}
