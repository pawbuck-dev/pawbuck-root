import { Redirect } from "expo-router";

/**
 * Weekly challenge / standings entry point. Reuses Pawthon hub (challenge hero gated by app user count).
 */
export default function LeaderboardScreen() {
  return <Redirect href="/pawthon" />;
}
