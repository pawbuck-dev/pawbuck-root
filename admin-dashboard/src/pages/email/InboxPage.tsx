import { useSearchParams } from "react-router-dom";
import { ProcessedEmailsPanel } from "@/components/ProcessedEmailsPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function InboxPage() {
  const { client } = useAdminApp();
  const [searchParams] = useSearchParams();
  const ownerPreset = searchParams.get("owner") ?? "";

  return (
    <div className="page">
      <PageHeader
        title="Review inbox"
        description="Fix emails that didn't become pet health records. Default view matches what owners see under Messages → Processing errors."
      />
      <ProcessedEmailsPanel client={client} presetOwnerEmail={ownerPreset} />
    </div>
  );
}
