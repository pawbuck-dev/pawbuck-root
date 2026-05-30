import { MiloJournalPanel } from "@/components/MiloJournalPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function JournalPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader title="Journal & chat" description="Milo journal smoke and conversation tooling." />
      <MiloJournalPanel client={client} />
    </div>
  );
}
