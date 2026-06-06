import { supportQueryKeys } from "@/hooks/supportQueries";

describe("supportQueryKeys", () => {
  it("builds stable metrics and queues keys", () => {
    expect(supportQueryKeys.metrics()).toEqual(["support", "metrics"]);
    expect(supportQueryKeys.queuesSummary()).toEqual(["support", "queues", "summary"]);
    expect(supportQueryKeys.subscriptionPlanBreakdown()).toEqual([
      "support",
      "subscription",
      "plan-breakdown",
    ]);
    expect(supportQueryKeys.all).toEqual(["support"]);
  });
});
