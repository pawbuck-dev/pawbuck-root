import { useAuth } from "@/context/authContext";
import { getPawbuckApiBaseUrl } from "@/utils/pawbuckApi";
import { supabase } from "@/utils/supabase";
import { uploadFile } from "@/utils/image";
import { analyzePetDocument } from "@pawbuck/api-client";
import type { PetDocumentVaultRowDto } from "@pawbuck/api-client";
import { useCallback, useState } from "react";
import type { DocumentPickerAsset } from "expo-document-picker";
import type { ImagePickerAsset } from "expo-image-picker";

export type MiloUploadStatus = "idle" | "uploading" | "analyzing" | "error";

export function useMiloUpload() {
  const { user } = useAuth();
  const [status, setStatus] = useState<MiloUploadStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadAndAnalyze = useCallback(
    async (
      petId: string,
      petNameForPath: string,
      file: ImagePickerAsset | DocumentPickerAsset
    ): Promise<PetDocumentVaultRowDto> => {
      if (!user?.id) {
        setErrorMessage("Not signed in");
        setStatus("error");
        throw new Error("Not signed in");
      }

      const base = getPawbuckApiBaseUrl();
      if (!base) {
        setErrorMessage("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
        setStatus("error");
        throw new Error("EXPO_PUBLIC_PAWBUCK_API_URL is not set");
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setErrorMessage("No session");
        setStatus("error");
        throw new Error("No session");
      }

      setErrorMessage(null);
      setStatus("uploading");

      const extension = file.mimeType?.split("/")[1] ?? "jpg";
      const safeName = petNameForPath.split(" ").join("_");
      const storagePath = `${user.id}/pet_${safeName}_${petId}/documents/${Date.now()}.${extension}`;

      try {
        const data = await uploadFile(file, storagePath);
        setStatus("analyzing");

        const row = await analyzePetDocument(base, token, {
          petId,
          bucket: "pets",
          path: data.path,
          mimeType: file.mimeType ?? undefined,
        });

        setStatus("idle");
        return row;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Upload failed";
        setErrorMessage(msg);
        setStatus("error");
        throw e instanceof Error ? e : new Error(msg);
      }
    },
    [user?.id]
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setErrorMessage(null);
  }, []);

  return { uploadAndAnalyze, status, errorMessage, reset };
}
