import type { User } from "@supabase/supabase-js";
import {
  isPlausibleDisplayNameForGreeting,
  resolveAuthDisplayName,
} from "@/services/authDisplayName";

/** Suffix for `Hi${suffix}!` — space + first name, or ` there` for "Hi there!". */
export function miloHiGreetingSuffixFromUser(user: User | null | undefined): string {
  const resolved = resolveAuthDisplayName(user);
  if (!isPlausibleDisplayNameForGreeting(resolved)) return " there";
  const first = resolved.split(/\s+/).filter(Boolean)[0];
  if (first) return ` ${first}`;
  return " there";
}

export type HeroDisplayNameResult = {
  /** Shown in profile hero "Name" row */
  displayName: string;
  /** When true, omit misleading "Locked" badge (name comes from Sign in with Apple / not yet captured). */
  hideNameLockedBadge: boolean;
};

/**
 * Profile hero name: prefer saved full name; never fall back to raw email local part
 * (Apple may only expose an opaque id before Phase 5.1).
 */
export function resolveProfileHeroDisplayName(
  profileFullName: string | null | undefined,
  user: User | null | undefined
): HeroDisplayNameResult {
  const fromProfile = profileFullName?.trim() ?? "";
  const fromMeta = resolveAuthDisplayName(user);
  const named =
    (fromProfile && isPlausibleDisplayNameForGreeting(fromProfile) ? fromProfile : "") ||
    (isPlausibleDisplayNameForGreeting(fromMeta) ? fromMeta : "");
  if (named) {
    return { displayName: named, hideNameLockedBadge: false };
  }
  return { displayName: "Add your name", hideNameLockedBadge: true };
}

export function isApplePrivateRelayEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  return email.trim().toLowerCase().endsWith("@privaterelay.appleid.com");
}

export type ProfileEmailDisplay = {
  /** Primary line in profile hero */
  primary: string;
  /** When set, show behind "Show details" */
  relayAddress: string | null;
};

export function profileEmailDisplayForHero(email: string | null | undefined): ProfileEmailDisplay {
  const e = email?.trim() ?? "";
  if (!e) return { primary: "Not set", relayAddress: null };
  if (isApplePrivateRelayEmail(e)) {
    return { primary: "Email hidden via Apple Sign In", relayAddress: e };
  }
  return { primary: e, relayAddress: null };
}

/** Dev / seed placeholder care-team names to replace with a neutral label. */
const CARE_TEAM_PLACEHOLDER_NAMES = new Set(["uh", "uhh", "uhhh"]);

export function sanitizeCareTeamMemberDisplayName(
  vetName: string | null | undefined,
  clinicName: string | null | undefined,
  fallbackLabel: string
): string {
  const raw = (vetName?.trim() || clinicName?.trim() || "").trim();
  if (!raw) return fallbackLabel;
  if (CARE_TEAM_PLACEHOLDER_NAMES.has(raw.toLowerCase())) return fallbackLabel;
  return raw;
}
