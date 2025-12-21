import MedicineForm from "@/components/medicines/MedicineForm";
import ProcessingOverlay, {
  ProcessingStatus,
} from "@/components/medicines/ProcessingOverlay";
import ReviewMedicines from "@/components/medicines/ReviewMedicines";
import UploadOptions from "@/components/medicines/UploadOptions";
import { useSelectedPet } from "@/context/selectedPetContext";
import { Tables, TablesInsert } from "@/database.types";
import { supabase } from "@/utils/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";

export type ViewMode = "upload" | "manual" | "review";

export default function MedicationUploadModal() {
  const queryClient = useQueryClient();

  const { pet } = useSelectedPet();

  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [statusMessage, setStatusMessage] = useState<string>("");

  const [viewMode, setViewMode] = useState<ViewMode>("upload");

  const [extractedMedications, setExtractedMedications] = useState<
    TablesInsert<"medicines">[]
  >([]);
  const [extractionConfidence, setExtractionConfidence] = useState<number>(0);

  const handleDocumentSelected = async (documentPath: string) => {
    // Step 2: Extracting
    setStatus("extracting");
    setStatusMessage("Extracting medicine data...");

    const { data: ocrData, error: ocrError } = await supabase.functions.invoke<{
      confidence: number;
      medicines: Tables<"medicines">[];
    }>("medication-ocr", {
      body: {
        bucket: "pets",
        path: documentPath,
      },
    });

    if (ocrError) {
      setStatus("error");
      setStatusMessage("Failed to process document");
      Alert.alert("Error", "Failed to extract medication data");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    // Store extracted data and switch to review mode
    setExtractedMedications(ocrData!.medicines);
    setExtractionConfidence(ocrData!.confidence);
    setStatus("idle");
    setViewMode("review");
  };

  const handleSaveMedications = async (
    medications: TablesInsert<"medicines">[]
  ) => {
    try {
      setStatus("inserting");
      setStatusMessage(
        `Saving ${medications.length} medicine${medications.length !== 1 ? "s" : ""}...`
      );

      const { error: insertError } = await supabase
        .from("medicines")
        .insert(medications);

      if (insertError) {
        console.error("Error inserting medicines:", insertError);
        setStatus("error");
        setStatusMessage("Failed to save medicines");
        Alert.alert("Error", "Failed to save medicines");
        setTimeout(() => setStatus("idle"), 2000);
        return;
      }

      // Invalidate medicines query to trigger refetch
      await queryClient.invalidateQueries({
        queryKey: ["medicines", pet.id],
      });

      // Success
      setStatus("success");
      setStatusMessage("Medicines added successfully!");

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error) {
      console.error("Error saving medicines:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to save medicines");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const isProcessing = status !== "idle";

  // Upload Mode UI
  return (
    <>
      <ProcessingOverlay status={status} statusMessage={statusMessage} />
      {viewMode === "upload" && (
        <UploadOptions
          onDocumentSelected={handleDocumentSelected}
          isProcessing={isProcessing}
          setStatus={setStatus}
          setStatusMessage={setStatusMessage}
          setViewMode={setViewMode}
        />
      )}
      {viewMode === "manual" && (
        <MedicineForm
          onClose={() => setViewMode("upload")}
          loading={isProcessing}
          actionTitle="Add"
          isProcessing={isProcessing}
          onSave={(m) => handleSaveMedications([m])}
        />
      )}
      {viewMode === "review" && (
        <ReviewMedicines
          initialMedications={extractedMedications}
          extractionConfidence={extractionConfidence}
          isProcessing={isProcessing}
          handleSaveMedications={handleSaveMedications}
        />
      )}
    </>
  );
}
