import { MiloClassifyHarness } from "@/components/MiloClassifyHarness";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function ClassifyPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader title="Classify lab" description="Test Milo classification against sample inputs." />
      <MiloClassifyHarness client={client} />
    </div>
  );
}
