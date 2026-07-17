import { FeatureGatesPanel } from "@/components/FeatureGatesPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function GatesPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader
        title="Feature gates"
        description="Subscription feature flags per product area. While app_feature_flags.monetization_enabled is false (free launch), server pet/doc quotas and plan gates are bypassed for all users."
      />
      <FeatureGatesPanel client={client} />
    </div>
  );
}
