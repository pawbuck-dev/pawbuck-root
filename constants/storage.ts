/**
 * Supabase Storage configuration constants
 * Centralized location for bucket names and path patterns
 */

export const STORAGE_BUCKETS = {
  VACCINATION_IMAGES: "vaccination-images",
  PET_IMAGES: "pet-images",
  // Add more buckets as needed
} as const;

/**
 * Generate a storage path for a vaccination image
 * @param petId - The pet ID
 * @param filename - Optional specific filename (defaults to timestamp-based)
 */
export function getVaccinationImagePath(
  petId: string,
  filename?: string
): string {
  const name = filename || `vaccination-${Date.now()}.jpg`;
  return `${petId}/${name}`;
}

/**
 * Generate a storage path for a pet profile image
 * @param petId - The pet ID
 * @param filename - Optional specific filename (defaults to 'profile.jpg')
 */
export function getPetImagePath(petId: string, filename?: string): string {
  const name = filename || "profile.jpg";
  return `${petId}/${name}`;
}

/**
 * Parse a storage path to extract bucket and path
 * @param fullPath - Full storage path (e.g., "vaccination-images/pet-123/cert.jpg")
 */
export function parseStoragePath(fullPath: string): {
  bucket: string;
  path: string;
} | null {
  const parts = fullPath.split("/");
  if (parts.length < 2) {
    return null;
  }

  const bucket = parts[0];
  const path = parts.slice(1).join("/");

  return { bucket, path };
}

/**
 * Validate if a bucket name is valid
 */
export function isValidBucket(bucket: string): boolean {
  return Object.values(STORAGE_BUCKETS).includes(
    bucket as (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]
  );
}

