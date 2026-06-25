import { meetsMinimumPlan, type SubscriptionPlan } from "@/constants/subscriptionPlans";

/**
 * First pet always receives an @pawbuck.app address; additional pet emails require Family
 * (see docs/pawbuck-product-help/16-subscription-and-plans.md).
 */
export function canAssignPetEmailAddress(
  plan: SubscriptionPlan,
  existingPetCount: number
): boolean {
  if (existingPetCount <= 0) return true;
  return meetsMinimumPlan(plan, "family");
}
