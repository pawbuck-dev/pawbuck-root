import { FeatureGatesPanel } from "@/components/FeatureGatesPanel";
import { SubscriptionOverviewPanel } from "@/components/SubscriptionOverviewPanel";
import { useAdminApp } from "@/context/AdminAppContext";
import { PageHeader } from "@/ui/PageHeader";

export function SubscriptionsPage() {
  const { client } = useAdminApp();
  return (
    <div className="page">
      <PageHeader
        title="Subscriptions"
        description="Plan tier breakdown, founding member cap, and per-feature minimum plans."
      />
      <SubscriptionOverviewPanel />
      <div style={{ marginTop: "1.5rem" }}>
        <FeatureGatesPanel client={client} />
      </div>
    </div>
  );
}
