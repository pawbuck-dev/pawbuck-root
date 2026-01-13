import MedicineForm from "@/components/medicines/MedicineForm";
import ProcessingOverlay, {
  ProcessingStatus,
} from "@/components/medicines/ProcessingOverlay";
import ReviewMedicines from "@/components/medicines/ReviewMedicines";
import UploadOptions from "@/components/medicines/UploadOptions";
import { useMedicines } from "@/context/medicinesContext";
import { Tables, TablesInsert } from "@/database.types";
import { MedicineFormData } from "@/models/medication";
import { isDuplicateMedication } from "@/utils/duplicateDetection";
import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert } from "react-native";

export type ViewMode = "upload" | "manual" | "review";

export default function MedicationUploadModal() {
  const { addMedicinesMutation, medicines: existingMedicines } = useMedicines();

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

  const handleSaveMedications = async (medications: MedicineFormData[]) => {
    try {
      await saveMedicationsFiltered(medications, []);
    } catch (error) {
      console.error("Error saving medicines:", error);
      setStatus("error");
      setStatusMessage("An error occurred");
      Alert.alert("Error", "Failed to save medicines");
      setTimeout(() => setStatus("idle"), 2000);
    }
  };

  const saveMedicationsFiltered = async (
    medications: MedicineFormData[],
    duplicatesToSkip: MedicineFormData[]
  ) => {
    // Filter out duplicates if any (defined outside try for catch block access)
    const medicationsToSave = duplicatesToSkip.length > 0
      ? medications.filter(
          (m) => !duplicatesToSkip.some(
            (d) => d.name.toLowerCase().trim() === m.name.toLowerCase().trim() &&
                   d.start_date === m.start_date
          )
        )
      : medications;

    if (medicationsToSave.length === 0) {
      setStatus("error");
      setStatusMessage("All medications are duplicates");
      Alert.alert("No New Records", "All medications are already recorded.");
      setTimeout(() => setStatus("idle"), 2000);
      return;
    }

    try {
      setStatus("inserting");
      setStatusMessage(
        `Saving ${medicationsToSave.length} medicine${medicationsToSave.length !== 1 ? "s" : ""}...`
      );

      // Save all medications in parallel
      await addMedicinesMutation.mutateAsync(medicationsToSave);

      // Success
      setStatus("success");
      const skippedMessage = duplicatesToSkip.length > 0
        ? ` (${duplicatesToSkip.length} duplicate${duplicatesToSkip.length > 1 ? "s" : ""} skipped)`
        : "";
      setStatusMessage(`Medicines added successfully!${skippedMessage}`);

      // Navigate back after showing success
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (error: any) {
      console.error("Error saving medicines:", error);
      setStatus("error");
      
      // Check for duplicate medication error
      if (error.message?.startsWith("DUPLICATE_MEDICATION:")) {
        // Identify which medications are duplicates
        const duplicateMedications = medicationsToSave.filter((m) =>
          isDuplicateMedication({ name: m.name, start_date: m.start_date || null }, existingMedicines)
        );
        
        const duplicateNames = duplicateMedications.length > 0
          ? duplicateMedications
              .map((m) => `• ${m.name} (${m.start_date ? new Date(m.start_date).toLocaleDateString() : "No start date"})`)
              .join("\n")
          : "Unable to identify specific duplicates";
        
        setStatusMessage("One or more medications already exist");
        Alert.alert(
          "Duplicate Medications Found",
          `The following medication${duplicateMedications.length !== 1 ? "s are" : " is"} already recorded:\n\n${duplicateNames}`
        );
      } else {
        setStatusMessage("An error occurred");
        Alert.alert("Error", "Failed to save medicines");
      }
      
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
