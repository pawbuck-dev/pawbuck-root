import { useMedicines } from "@/context/medicinesContext";
import { MedicineData } from "@/models/medication";
import React from "react";
import { Modal } from "react-native";
import MedicineForm from "./MedicineForm";

interface MedicineEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  medicine: MedicineData;
}

export const MedicineEditModal: React.FC<MedicineEditModalProps> = ({
  visible,
  onClose,
  onSave,
  medicine,
}) => {
  const { updateMedicineMutation } = useMedicines();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <MedicineForm
        onClose={onClose}
        loading={updateMedicineMutation.isPending}
        actionTitle="Edit"
        isProcessing={updateMedicineMutation.isPending}
        onSave={async (data) => {
          await updateMedicineMutation.mutateAsync({
            id: medicine.medicine.id || "",
            data,
          });
          onSave();
        }}
        initialData={medicine}
      />
    </Modal>
  );
};
