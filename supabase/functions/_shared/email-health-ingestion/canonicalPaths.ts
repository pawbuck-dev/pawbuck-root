export type CanonicalPet = {
  id: string;
  name: string;
  user_id: string;
};

export function extensionFromFilename(filename: string): string {
  const parts = filename.split(".");
  if (parts.length < 2) return "bin";
  const ext = parts.pop()!.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return ext || "bin";
}

/** Aligns with consumer app: `{userId}/pet_{name}_{petId}/documents/{documentId}.{ext}` */
export function buildCanonicalDocumentStoragePath(
  pet: CanonicalPet,
  documentId: string,
  filename: string,
): string {
  const safeName = pet.name.replace(/[^a-zA-Z0-9]/g, "_");
  const ext = extensionFromFilename(filename);
  return `${pet.user_id}/pet_${safeName}_${pet.id}/documents/${documentId}.${ext}`;
}
