export type MessageComposeMode = "care_team" | "support";

export function isSupportComposeMode(composeMode?: MessageComposeMode): boolean {
  return composeMode === "support";
}

export function supportComposeParams(email: string): Record<string, string> {
  return { email, composeMode: "support" };
}
