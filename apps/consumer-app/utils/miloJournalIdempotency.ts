import type { JournalDomain } from "@/constants/petJournal";

/** 32-bit FNV-1a — stable, short hex for idempotency keys (no crypto import). */
export function fnv1a32Hex(input: string): string {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

/**
 * One journal row per triage "session" for a given symptom subtype: same owner lines
 * (normalized) + pet + domain + subtype collapse duplicate Milo completes.
 */
export function computeMiloJournalIdempotencyKey(input: {
  petId: string;
  domain: JournalDomain;
  subtype: string;
  triageSourceText: string;
}): string {
  const normalized = input.triageSourceText.trim().replace(/\s+/g, " ").toLowerCase();
  const payload = `${input.petId}|${input.domain}|${input.subtype}|${normalized}`;
  return `${input.domain}:${input.subtype}:${fnv1a32Hex(payload)}`;
}
