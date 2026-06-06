import { useSubscription } from "@/context/subscriptionContext";
import { getDocumentUploadQuota } from "@/utils/documentUploadQuota";
import { useCallback, useMemo } from "react";

export function useDocumentUploadQuota() {
  const { plan, status, openPaywall } = useSubscription();

  const quota = useMemo(() => getDocumentUploadQuota(plan, status), [plan, status]);

  const ensureDocumentUploadAllowed = useCallback(
    (onAllowed: () => void) => {
      if (!quota.atCap) {
        onAllowed();
        return;
      }
      openPaywall({
        source: "document_upload",
        copyVariant: "document_cap",
        requiredPlan: "individual",
      });
    },
    [openPaywall, quota.atCap]
  );

  return { ...quota, ensureDocumentUploadAllowed };
}
