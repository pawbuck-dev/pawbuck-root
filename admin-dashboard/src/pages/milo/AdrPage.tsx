import { MedicationAdrPanel } from "@/components/MedicationAdrPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function AdrPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader title="Medication ADR" description="Adverse drug reaction review and tuning." />
      <MedicationAdrPanel client={client} />
    </div>
  );
}
