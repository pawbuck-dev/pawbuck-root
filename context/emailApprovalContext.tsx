import { useAuth } from "@/context/authContext";
import {
  approveEmail,
  approveEmailAnyway,
  getPendingApprovals,
  PendingApprovalWithPet,
  rejectEmail,
} from "@/services/pendingEmailApprovals";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert, Linking } from "react-native";

interface EmailApprovalContextType {
  /** Current pending approval being displayed */
  currentApproval: PendingApprovalWithPet | null;
  /** Whether the approval modal is visible */
  isModalVisible: boolean;
  /** Loading state for approval/rejection */
  isProcessing: boolean;
  /** Number of remaining pending approvals */
  pendingCount: number;
  /** All pending approvals */
  pendingApprovals: PendingApprovalWithPet[];
  /** Approve the current email */
  handleApprove: () => Promise<void>;
  /** Approve email despite incorrect information (force process) */
  handleApproveAnyway: () => Promise<void>;
  /** Reject the current email */
  handleReject: () => Promise<void>;
  /** Reply to the vet email */
  handleReplyToVet: () => Promise<void>;
  /** Refresh pending approvals */
  refreshPendingApprovals: () => Promise<void>;
  setCurrentApproval: (approval: PendingApprovalWithPet | null) => void;
}

const EmailApprovalContext = createContext<EmailApprovalContextType | undefined>(
  undefined
);

export const EmailApprovalProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState<PendingApprovalWithPet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal visibility is now always false - UI is handled by Messages screen
  const isModalVisible = false;

  // Get current approval from the list
  const currentApproval = pendingApprovals[currentIndex] ?? null;
  const pendingCount = pendingApprovals.length;

  /**
   * Fetch pending approvals from the database
   */
  const refreshPendingApprovals = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPendingApprovals([]);
      return;
    }

    try {
      const approvals = await getPendingApprovals();
      setPendingApprovals(approvals);
      setCurrentIndex(0);
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      setPendingApprovals([]);
    }
  }, [isAuthenticated, user]);

  /**
   * Handle approve action
   */
  const handleApprove = useCallback(async () => {
    if (!currentApproval) return;

    setIsProcessing(true);
    try {
      const result = await approveEmail(
        currentApproval.id,
        currentApproval.pet_id,
        currentApproval.sender_email,
        currentApproval.s3_bucket,
        currentApproval.s3_key
      );

      if (result.success) {
        // Remove from local list
        setPendingApprovals((prev) =>
          prev.filter((a) => a.id !== currentApproval.id)
        );
        setCurrentIndex(0);
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to process email. Please try again."
        );
      }
    } catch (error) {
      console.error("Error approving email:", error);
      Alert.alert("Error", "Failed to approve email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentApproval]);

  /**
   * Handle approve anyway action (force process despite incorrect info)
   */
  const handleApproveAnyway = useCallback(async () => {
    if (!currentApproval) return;

    setIsProcessing(true);
    try {
      const result = await approveEmailAnyway(
        currentApproval.id,
        currentApproval.pet_id,
        currentApproval.sender_email,
        currentApproval.s3_bucket,
        currentApproval.s3_key
      );

      if (result.success) {
        // Remove from local list
        setPendingApprovals((prev) =>
          prev.filter((a) => a.id !== currentApproval.id)
        );
        setCurrentIndex(0);
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to process email. Please try again."
        );
      }
    } catch (error) {
      console.error("Error approving email anyway:", error);
      Alert.alert("Error", "Failed to process email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentApproval]);

  /**
   * Handle reject action
   */
  const handleReject = useCallback(async () => {
    if (!currentApproval) return;

    setIsProcessing(true);
    try {
      const result = await rejectEmail(
        currentApproval.id,
        currentApproval.pet_id,
        currentApproval.sender_email
      );

      if (result.success) {
        // Remove from local list
        setPendingApprovals((prev) =>
          prev.filter((a) => a.id !== currentApproval.id)
        );
        setCurrentIndex(0);
      } else {
        Alert.alert(
          "Error",
          result.error || "Failed to reject email. Please try again."
        );
      }
    } catch (error) {
      console.error("Error rejecting email:", error);
      Alert.alert("Error", "Failed to reject email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentApproval]);

  /**
   * Set the current approval (used by Messages screen to set context for handlers)
   */
  const setCurrentApproval = useCallback((approval: PendingApprovalWithPet | null) => {
    if (approval) {
      const index = pendingApprovals.findIndex((a) => a.id === approval.id);
      if (index !== -1) {
        setCurrentIndex(index);
      }
    }
  }, [pendingApprovals]);

  /**
   * Handle reply to vet - opens email client with pre-filled content
   */
  const handleReplyToVet = useCallback(async () => {
    if (!currentApproval) return;

    const petName = currentApproval.pets?.name || "my pet";
    const senderEmail = currentApproval.sender_email;
    
    // Build error message based on validation errors
    let errorDetails = "";
    if (currentApproval.validation_errors) {
      const errors = Object.keys(currentApproval.validation_errors);
      if (errors.includes("microchip_number")) {
        errorDetails = `I noticed that the microchip number on the ${currentApproval.document_type || "document"} doesn't match the records for ${petName}. `;
      }
      if (errors.includes("pet_name")) {
        errorDetails += errorDetails ? "Also, " : "";
        errorDetails += `the pet name doesn't match our records. `;
      }
    } else {
      errorDetails = `I noticed some information on the ${currentApproval.document_type || "document"} doesn't match the records for ${petName}. `;
    }

    const subject = `Regarding ${petName}'s ${currentApproval.document_type || "document"}`;
    const body = `Hi,\n\n${errorDetails}Could you please verify and confirm the correct information?\n\nThank you,\n[Your Name]`;

    const mailtoUrl = `mailto:${senderEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      } else {
        Alert.alert("Error", "No email app is available on this device.");
      }
    } catch (error) {
      console.error("Error opening email client:", error);
      Alert.alert("Error", "Failed to open email client. Please try again.");
    }
  }, [currentApproval]);

  // Fetch pending approvals when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshPendingApprovals();
    } else {
      setPendingApprovals([]);
    }
  }, [isAuthenticated, user?.id]);

  return (
    <EmailApprovalContext.Provider
      value={{
        currentApproval,
        isModalVisible,
        isProcessing,
        pendingCount,
        pendingApprovals,
        setCurrentApproval,
        handleApprove,
        handleApproveAnyway,
        handleReject,
        handleReplyToVet,
        refreshPendingApprovals,
      }}
    >
      {children}
    </EmailApprovalContext.Provider>
  );
};

export const useEmailApproval = () => {
  const context = useContext(EmailApprovalContext);
  if (context === undefined) {
    throw new Error(
      "useEmailApproval must be used within an EmailApprovalProvider"
    );
  }
  return context;
};

