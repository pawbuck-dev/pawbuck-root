import { supabase } from "./supabase";
import {
  STORAGE_BUCKETS,
  getVaccinationImagePath,
} from "@/constants/storage";

export interface VaccinationRecord {
  vaccine_name: string;
  vaccination_date: string;
  next_due_date?: string;
  vet_clinic_name?: string;
  notes?: string;
}

export interface VaccinationOCRResponse {
  vaccines: VaccinationRecord[];
  error?: string;
}

/**
 * Call the vaccination OCR Edge Function with a Supabase Storage image
 * @param bucket - The storage bucket name
 * @param path - The file path within the bucket
 * @returns Extracted vaccination records
 */
export async function processVaccinationImage(
  bucket: string,
  path: string
): Promise<VaccinationOCRResponse> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "vaccination-ocr",
      {
        body: {
          bucket,
          path,
        },
      }
    );

    if (error) {
      console.error("Error calling vaccination OCR:", error);
      return {
        vaccines: [],
        error: error.message || "Failed to process image",
      };
    }

    return data as VaccinationOCRResponse;
  } catch (error) {
    console.error("Error processing vaccination image:", error);
    return {
      vaccines: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Call the vaccination OCR Edge Function with a direct image URL
 * @param imageUrl - The direct URL to the image
 * @returns Extracted vaccination records
 */
export async function processVaccinationImageFromUrl(
  imageUrl: string
): Promise<VaccinationOCRResponse> {
  try {
    const { data, error } = await supabase.functions.invoke(
      "vaccination-ocr",
      {
        body: {
          imageUrl,
        },
      }
    );

    if (error) {
      console.error("Error calling vaccination OCR:", error);
      return {
        vaccines: [],
        error: error.message || "Failed to process image",
      };
    }

    return data as VaccinationOCRResponse;
  } catch (error) {
    console.error("Error processing vaccination image:", error);
    return {
      vaccines: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Upload an image to Supabase Storage and process it with OCR
 * @param uri - Local file URI from image picker
 * @param petId - The pet ID for organizing storage
 * @param bucket - The storage bucket name (default: vaccination-images bucket)
 * @returns Extracted vaccination records
 */
export async function uploadAndProcessVaccinationImage(
  uri: string,
  petId: string,
  bucket: string = STORAGE_BUCKETS.VACCINATION_IMAGES
): Promise<VaccinationOCRResponse> {
  try {
    // Generate unique filename using storage utility
    const filename = getVaccinationImagePath(petId);

    // Upload to Supabase Storage
    const response = await fetch(uri);
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filename, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading image:", uploadError);
      return {
        vaccines: [],
        error: `Failed to upload image: ${uploadError.message}`,
      };
    }

    // Process the uploaded image
    return await processVaccinationImage(bucket, filename);
  } catch (error) {
    console.error("Error uploading and processing image:", error);
    return {
      vaccines: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

