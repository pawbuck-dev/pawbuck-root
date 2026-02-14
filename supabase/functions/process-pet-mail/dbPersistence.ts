/**
 * Database persistence module for OCR results
 * Saves extracted data to the appropriate database tables
 */
import { createSupabaseClient } from "../_shared/supabase-utils.ts";
import type { DocumentType, Pet } from "./types.ts";

// OCR Response Types
interface VaccinationOCRData {
  vaccines: Array<{
    name: string;
    date: string;
    next_due_date?: string | null;
    clinic_name?: string | null;
    notes?: string | null;
  }>;
}

interface MedicationOCRData {
  confidence: number;
  medicines: Array<{
    name: string;
    type: string;
    dosage: string;
    frequency: string;
    purpose?: string | null;
    prescribed_by?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  }>;
}

interface LabResultOCRData {
  confidence: number;
  labResult: {
    testType: string;
    labName: string;
    testDate?: string | null;
    orderedBy?: string | null;
    results: Array<{
      testName: string;
      value: string;
      unit: string;
      referenceRange: string;
      status: "normal" | "low" | "high";
    }>;
  };
}

interface ClinicalExamOCRData {
  confidence: number;
  exam: {
    exam_type: string;
    exam_date?: string | null;
    clinic_name?: string | null;
    vet_name?: string | null;
    weight_value?: number | null;
    weight_unit?: string | null;
    temperature?: number | null;
    heart_rate?: number | null;
    respiratory_rate?: number | null;
    findings?: string | null;
    notes?: string | null;
    follow_up_date?: string | null;
    validity_date?: string | null;
  };
}

export interface SaveResult {
  success: boolean;
  recordIds: string[];
  error?: string;
}

/**
 * Save vaccination records to the database
 */
async function saveVaccinations(
  pet: Pet,
  storagePath: string,
  ocrData: VaccinationOCRData
): Promise<SaveResult> {
  const supabase = createSupabaseClient();
  const recordIds: string[] = [];

  try {
    for (const vaccine of ocrData.vaccines) {
      // Skip if no name or date
      if (!vaccine.name || !vaccine.date) {
        console.log(`Skipping vaccine with missing name or date`);
        continue;
      }

      const { data, error } = await supabase
        .from("vaccinations")
        .insert({
          pet_id: pet.id,
          user_id: pet.user_id,
          name: vaccine.name,
          date: vaccine.date,
          next_due_date: vaccine.next_due_date || null,
          clinic_name: vaccine.clinic_name || null,
          notes: vaccine.notes || null,
          document_url: storagePath,
          created_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`Error inserting vaccination ${vaccine.name}:`, error);
        continue;
      }

      if (data?.id) {
        recordIds.push(data.id);
        console.log(`Inserted vaccination: ${vaccine.name} (ID: ${data.id})`);
      }
    }

    return {
      success: recordIds.length > 0,
      recordIds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error saving vaccinations:", error);
    return {
      success: false,
      recordIds,
      error: errorMessage,
    };
  }
}

/**
 * Save medicine records to the database
 */
async function saveMedicines(
  pet: Pet,
  storagePath: string,
  ocrData: MedicationOCRData
): Promise<SaveResult> {
  const supabase = createSupabaseClient();
  const recordIds: string[] = [];

  try {
    for (const medicine of ocrData.medicines) {
      // Skip if no name
      if (!medicine.name) {
        console.log(`Skipping medicine with missing name`);
        continue;
      }

      const { data, error } = await supabase
        .from("medicines")
        .insert({
          pet_id: pet.id,
          user_id: pet.user_id,
          name: medicine.name,
          type: medicine.type || "Other",
          dosage: medicine.dosage || "As directed",
          frequency: medicine.frequency || "As Needed",
          purpose: medicine.purpose || null,
          prescribed_by: medicine.prescribed_by || null,
          start_date: medicine.start_date || null,
          end_date: medicine.end_date || null,
          schedules: [], // Default empty schedules as per user preference
          document_url: storagePath,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (error) {
        console.error(`Error inserting medicine ${medicine.name}:`, error);
        continue;
      }

      if (data?.id) {
        recordIds.push(data.id);
        console.log(`Inserted medicine: ${medicine.name} (ID: ${data.id})`);
      }
    }

    return {
      success: recordIds.length > 0,
      recordIds,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error saving medicines:", error);
    return {
      success: false,
      recordIds,
      error: errorMessage,
    };
  }
}

/**
 * Save lab result record to the database
 */
async function saveLabResult(
  pet: Pet,
  storagePath: string,
  ocrData: LabResultOCRData
): Promise<SaveResult> {
  const supabase = createSupabaseClient();

  try {
    const labResult = ocrData.labResult;

    // Skip if no test type or lab name
    if (!labResult.testType || !labResult.labName) {
      console.log(`Skipping lab result with missing test type or lab name`);
      return {
        success: false,
        recordIds: [],
        error: "Missing required fields: testType or labName",
      };
    }

    const { data, error } = await supabase
      .from("lab_results")
      .insert({
        pet_id: pet.id,
        user_id: pet.user_id,
        test_type: labResult.testType,
        lab_name: labResult.labName,
        test_date: labResult.testDate || null,
        ordered_by: labResult.orderedBy || null,
        results: labResult.results || [],
        confidence: ocrData.confidence || null,
        document_url: storagePath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Error inserting lab result:`, error);
      return {
        success: false,
        recordIds: [],
        error: error.message,
      };
    }

    if (data?.id) {
      console.log(`Inserted lab result: ${labResult.testType} (ID: ${data.id})`);
      return {
        success: true,
        recordIds: [data.id],
      };
    }

    return {
      success: false,
      recordIds: [],
      error: "No record ID returned",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error saving lab result:", error);
    return {
      success: false,
      recordIds: [],
      error: errorMessage,
    };
  }
}

/**
 * Save clinical exam record to the database
 */
async function saveClinicalExam(
  pet: Pet,
  storagePath: string,
  ocrData: ClinicalExamOCRData
): Promise<SaveResult> {
  const supabase = createSupabaseClient();

  try {
    const exam = ocrData.exam;

    // Skip if no exam type or date
    if (!exam.exam_type) {
      console.log(`Skipping clinical exam with missing exam type`);
      return {
        success: false,
        recordIds: [],
        error: "Missing required field: exam_type",
      };
    }

    const { data, error } = await supabase
      .from("clinical_exams")
      .insert({
        pet_id: pet.id,
        user_id: pet.user_id,
        exam_type: exam.exam_type,
        exam_date: exam.exam_date || new Date().toISOString().split("T")[0],
        clinic_name: exam.clinic_name || null,
        vet_name: exam.vet_name || null,
        weight_value: exam.weight_value || null,
        weight_unit: exam.weight_unit || null,
        temperature: exam.temperature || null,
        heart_rate: exam.heart_rate || null,
        respiratory_rate: exam.respiratory_rate || null,
        findings: exam.findings || null,
        notes: exam.notes || null,
        follow_up_date: exam.follow_up_date || null,
        validity_date: exam.validity_date || null,
        document_url: storagePath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error(`Error inserting clinical exam:`, error);
      return {
        success: false,
        recordIds: [],
        error: error.message,
      };
    }

    if (data?.id) {
      console.log(`Inserted clinical exam: ${exam.exam_type} (ID: ${data.id})`);
      return {
        success: true,
        recordIds: [data.id],
      };
    }

    return {
      success: false,
      recordIds: [],
      error: "No record ID returned",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error saving clinical exam:", error);
    return {
      success: false,
      recordIds: [],
      error: errorMessage,
    };
  }
}

/**
 * Main dispatcher function that routes to the appropriate save function
 * based on document type
 */
export async function saveOCRResults(
  documentType: DocumentType,
  pet: Pet,
  storagePath: string,
  ocrData: unknown
): Promise<SaveResult> {
  console.log(`Saving OCR results for document type: ${documentType}`);

  switch (documentType) {
    case "vaccinations":
      return await saveVaccinations(
        pet,
        storagePath,
        ocrData as VaccinationOCRData
      );

    case "medications":
      return await saveMedicines(pet, storagePath, ocrData as MedicationOCRData);

    case "lab_results":
      return await saveLabResult(pet, storagePath, ocrData as LabResultOCRData);

    case "clinical_exams":
      return await saveClinicalExam(
        pet,
        storagePath,
        ocrData as ClinicalExamOCRData
      );
    
    case "billing_invoice":
      return await saveClinicalExam(
        pet,
        storagePath,
        ocrData as ClinicalExamOCRData
      );
    
    case "travel_certificate":
      return await saveClinicalExam(
        pet,
        storagePath,
        ocrData as ClinicalExamOCRData
      );

    case "irrelevant":
      return {
        success: false,
        recordIds: [],
        error: "Cannot save irrelevant documents to database",
      };

    default:
      return {
        success: false,
        recordIds: [],
        error: `Unknown document type: ${documentType}`,
      };
  }
}


