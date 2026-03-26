import { Redirect } from "expo-router";

/**
 * Weekly challenge / standings entry point. Reuses Pawthon hub until a dedicated rankings UI exists.
 */
export default function LeaderboardScreen() {
  return <Redirect href="/pawthon" />;
}
