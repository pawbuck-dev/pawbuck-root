import { useMedicines } from "@/context/medicinesContext";
import { Tables, TablesInsert } from "@/database.types";
import React from "react";
import { Modal } from "react-native";
import MedicineForm from "./MedicineForm";

interface MedicineEditModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (id: string, data: TablesInsert<"medicines">) => void;
  medicine: Tables<"medicines">;
  loading?: boolean;
}

export const MedicineEditModal: React.FC<MedicineEditModalProps> = ({
  visible,
  onClose,
  onSave,
  medicine,
  loading = false,
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
        loading={loading}
        actionTitle="Edit"
        isProcessing={loading}
        onSave={(data) =>
          updateMedicineMutation.mutate({
            id: medicine.id,
            data,
          })
        }
        initialData={medicine}
      />
    </Modal>
  );
};
