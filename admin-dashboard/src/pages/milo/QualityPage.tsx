import { MiloQualityPanel } from "@/components/MiloQualityPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function QualityPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader
        title="Milo quality"
        description="Production outcome ledger for chat, journal, and document vision failures."
      />
      <MiloQualityPanel client={client} />
    </div>
  );
}
