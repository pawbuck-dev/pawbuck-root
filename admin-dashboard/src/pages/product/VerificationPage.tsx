import { EmailDocumentVerificationPanel } from "@/components/EmailDocumentVerificationPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function VerificationPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader
        title="Verification rules"
        description="Country-specific email document verification thresholds."
      />
      <EmailDocumentVerificationPanel client={client} />
    </div>
  );
}
