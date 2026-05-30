import { FeatureGatesPanel } from "@/components/FeatureGatesPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function GatesPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader title="Feature gates" description="Subscription feature flags per product area." />
      <FeatureGatesPanel client={client} />
    </div>
  );
}
