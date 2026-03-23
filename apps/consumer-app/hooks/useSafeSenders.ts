import { usePets } from "@/context/petsContext";
import {
  addEmailForAllUserPets,
  deleteEmail,
  getWhitelistedEmails,
  PetEmailList,
  updateEmail,
} from "@/services/petEmailList";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert } from "react-native";

interface UseSafeSendersOptions {
  petId: string | undefined;
  enabled?: boolean;
}

interface UseSafeSendersReturn {
  /** List of whitelisted emails */
  whitelistedEmails: PetEmailList[];
  /** Loading state for initial fetch */
  isLoading: boolean;
  /** Add a new email to whitelist */
  addWhitelistedEmail: (email: string) => void;
  /** Update an existing whitelisted email */
  updateWhitelistedEmail: (id: number, newEmail: string) => void;
  /** Delete a whitelisted email */
  deleteWhitelistedEmail: (id: number) => void;
  /** Whether any mutation is pending */
  isPending: boolean;
  /** Whether add mutation is pending */
  isAdding: boolean;
  /** Whether update mutation is pending */
  isUpdating: boolean;
  /** Whether delete mutation is pending */
  isDeleting: boolean;
}

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Custom hook for managing safe senders (whitelisted emails)
 */
export const useSafeSenders = ({
  petId,
  enabled = true,
}: UseSafeSendersOptions): UseSafeSendersReturn => {
  const queryClient = useQueryClient();
  const { pets } = usePets();

  // Fetch whitelisted emails
  const { data: whitelistedEmails = [], isLoading } = useQuery({
    queryKey: ["pet_email_list", petId, "whitelist"],
    queryFn: () => getWhitelistedEmails(petId!),
    enabled: !!petId && enabled,
  });

  // Add whitelist email mutation
  const addMutation = useMutation({
    mutationFn: async (emailToAdd: string) => {
      return addEmailForAllUserPets(emailToAdd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_email_list"] });
      pets.forEach((pet) => {
        queryClient.invalidateQueries({ queryKey: ["pet_email_list", pet.id] });
      });
    },
    onError: (error) => {
      // Show user-friendly message for duplicate emails
      const errorMessage =
        error instanceof Error && error.message.includes("already in your safe senders")
          ? error.message
          : "Failed to add email to safe senders";
      Alert.alert("Error", errorMessage);
      console.error("Error adding whitelist email:", error);
    },
  });

  // Update whitelist email mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, newEmail }: { id: number; newEmail: string }) => {
      return updateEmail(id, newEmail);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_email_list"] });
      pets.forEach((pet) => {
        queryClient.invalidateQueries({ queryKey: ["pet_email_list", pet.id] });
      });
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update email");
      console.error("Error updating whitelist email:", error);
    },
  });

  // Delete whitelist email mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return deleteEmail(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_email_list"] });
      pets.forEach((pet) => {
        queryClient.invalidateQueries({ queryKey: ["pet_email_list", pet.id] });
      });
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to remove email from safe senders");
      console.error("Error deleting whitelist email:", error);
    },
  });

  const addWhitelistedEmail = (email: string) => {
    if (!email.trim()) {
      Alert.alert("Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    addMutation.mutate(email.trim());
  };

  const updateWhitelistedEmail = (id: number, newEmail: string) => {
    if (!newEmail.trim()) {
      Alert.alert("Required", "Please enter an email address");
      return;
    }
    if (!validateEmail(newEmail.trim())) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }
    updateMutation.mutate({ id, newEmail: newEmail.trim() });
  };

  const deleteWhitelistedEmail = (id: number) => {
    deleteMutation.mutate(id);
  };

  const isPending =
    addMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return {
    whitelistedEmails,
    isLoading,
    addWhitelistedEmail,
    updateWhitelistedEmail,
    deleteWhitelistedEmail,
    isPending,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};

