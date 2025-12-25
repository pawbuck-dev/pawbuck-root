import { useAuth } from "@/context/authContext";
import {
    approveEmail,
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
import { Alert } from "react-native";

interface EmailApprovalContextType {
  /** Current pending approval being displayed */
  currentApproval: PendingApprovalWithPet | null;
  /** Whether the approval modal is visible */
  isModalVisible: boolean;
  /** Loading state for approval/rejection */
  isProcessing: boolean;
  /** Number of remaining pending approvals */
  pendingCount: number;
  /** Approve the current email */
  handleApprove: () => Promise<void>;
  /** Reject the current email */
  handleReject: () => Promise<void>;
  /** Refresh pending approvals */
  refreshPendingApprovals: () => Promise<void>;
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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get current approval from the list
  const currentApproval = pendingApprovals[currentIndex] ?? null;
  const pendingCount = pendingApprovals.length;

  /**
   * Fetch pending approvals from the database
   */
  const refreshPendingApprovals = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setPendingApprovals([]);
      setIsModalVisible(false);
      return;
    }

    try {
      const approvals = await getPendingApprovals();
      setPendingApprovals(approvals);
      setCurrentIndex(0);

      // Show modal if there are pending approvals
      if (approvals.length > 0) {
        setIsModalVisible(true);
      } else {
        setIsModalVisible(false);
      }
    } catch (error) {
      console.error("Error fetching pending approvals:", error);
      setPendingApprovals([]);
    }
  }, [isAuthenticated, user]);

  /**
   * Move to next approval or close modal if none left
   */
  const advanceToNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < pendingApprovals.length) {
      setCurrentIndex(nextIndex);
    } else {
      // No more approvals, close modal and refresh
      setIsModalVisible(false);
      setPendingApprovals([]);
      setCurrentIndex(0);
    }
  }, [currentIndex, pendingApprovals.length]);

  /**
   * Handle approve action
   */
  const handleApprove = useCallback(async () => {
    if (!currentApproval) return;

    setIsProcessing(true);
    setIsModalVisible(false);
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
        
        // Show modal again if there are more approvals (next item will be at same index)
        if (pendingApprovals.length > 1) {
          setIsModalVisible(true);
        } else {
          setCurrentIndex(0);
        }
      } else {
        setIsModalVisible(true); // Show modal again on error
        Alert.alert(
          "Error",
          result.error || "Failed to process email. Please try again."
        );
      }
    } catch (error) {
      console.error("Error approving email:", error);
      setIsModalVisible(true); // Show modal again on error
      Alert.alert("Error", "Failed to approve email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentApproval, pendingApprovals.length]);

  /**
   * Handle reject action
   */
  const handleReject = useCallback(async () => {
    if (!currentApproval) return;

    setIsProcessing(true);
    setIsModalVisible(false);
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
        
        // Show modal again if there are more approvals (next item will be at same index)
        if (pendingApprovals.length > 1) {
          setIsModalVisible(true);
        } else {
          setCurrentIndex(0);
        }
      } else {
        setIsModalVisible(true); // Show modal again on error
        Alert.alert(
          "Error",
          result.error || "Failed to reject email. Please try again."
        );
      }
    } catch (error) {
      console.error("Error rejecting email:", error);
      setIsModalVisible(true); // Show modal again on error
      Alert.alert("Error", "Failed to reject email. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [currentApproval, pendingApprovals.length]);

  // Fetch pending approvals when user authenticates
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshPendingApprovals();
    } else {
      setPendingApprovals([]);
      setIsModalVisible(false);
    }
  }, [isAuthenticated, user?.id]);

  return (
    <EmailApprovalContext.Provider
      value={{
        currentApproval,
        isModalVisible,
        isProcessing,
        pendingCount,
        handleApprove,
        handleReject,
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

