import { DocumentSyncAdminPanel } from "@/components/DocumentSyncAdminPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function DocumentSyncPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader
        title="Document sync"
        description="Run clinical vault sync for processed documents."
      />
      <DocumentSyncAdminPanel client={client} />
    </div>
  );
}
