import { useNavigate } from "react-router-dom";
import { DocumentProcessingMetricsPanel } from "@/components/DocumentProcessingMetricsPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function ProcessingHealthPage() {
  const navigate = useNavigate();
  const { client } = useAdminApp();

  return (
    <div className="page">
      <PageHeader
        title="Processing health"
        description="Email pipeline volume, failures, and clinical vault sync metrics."
      />
      <DocumentProcessingMetricsPanel
        client={client}
        onOpenMailErrors={() => navigate("/email/inbox")}
      />
    </div>
  );
}
