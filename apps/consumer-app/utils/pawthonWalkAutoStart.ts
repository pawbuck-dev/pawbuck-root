export type PawthonWalkAutoStartParams = {
  autoStart?: string | string[];
  petId?: string | string[];
};

export function parseAutoStartPetId(params: PawthonWalkAutoStartParams): string | null {
  const raw = params.petId;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw) && typeof raw[0] === "string" && raw[0].trim()) return raw[0].trim();
  return null;
}

export function isAutoStartRequested(params: PawthonWalkAutoStartParams): boolean {
  const raw = params.autoStart;
  if (raw === "1" || raw === "true") return true;
  if (Array.isArray(raw)) return raw.some((v) => v === "1" || v === "true");
  return false;
}

export function shouldAutoStartWalk(params: {
  autoStart: PawthonWalkAutoStartParams;
  phase: string;
  walkPetIds: string[];
  alreadyHandled: boolean;
  /** When > 1, user must pick pets on the select screen first. */
  ownedPetCount?: number;
}): boolean {
  if (params.alreadyHandled) return false;
  if (params.phase !== "select") return false;
  if (params.walkPetIds.length === 0) return false;
  if ((params.ownedPetCount ?? 1) > 1) return false;
  return isAutoStartRequested(params.autoStart);
}
