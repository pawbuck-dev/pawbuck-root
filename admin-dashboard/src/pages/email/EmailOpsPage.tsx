import { useNavigate } from "react-router-dom";
import { EmailOpsPanel } from "@/components/EmailOpsPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function EmailOpsPage() {
  const navigate = useNavigate();
  const { client } = useAdminApp();

  return (
    <div className="page">
      <PageHeader
        title="Email operations"
        description="Bulk tools, ops health checks, and edge deploy tuning."
      />
      <EmailOpsPanel
        client={client}
        onOpenMailErrors={(email) => {
          const qs = email ? `?owner=${encodeURIComponent(email)}` : "";
          navigate(`/email/inbox${qs}`);
        }}
        onOpenProcessing={() => navigate("/email/health")}
      />
    </div>
  );
}
