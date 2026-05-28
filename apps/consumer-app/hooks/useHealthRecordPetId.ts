import { useGlobalSearchParams, useLocalSearchParams, useSegments } from "expo-router";
import { useMemo } from "react";

function normalizeRouteId(raw: string | string[] | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  const id = Array.isArray(raw) ? raw[0] : raw;
  return id?.trim() || undefined;
}

/**
 * Pet id from /health-record/[id] routes. Prefer global params so nested (tabs) layouts
 * still update when the owner switches pets from the strip under the header.
 */
export function useHealthRecordPetId(): string | undefined {
  const global = useGlobalSearchParams<{ id?: string | string[] }>();
  const local = useLocalSearchParams<{ id?: string | string[] }>();
  const segments = useSegments();

  return useMemo(() => {
    const fromGlobal = normalizeRouteId(global.id);
    if (fromGlobal) return fromGlobal;

    const fromLocal = normalizeRouteId(local.id);
    if (fromLocal) return fromLocal;

    const idx = segments.findIndex((s) => s === "health-record");
    if (idx >= 0 && idx + 1 < segments.length) {
      const candidate = segments[idx + 1];
      if (candidate && candidate !== "(tabs)" && candidate !== "[id]") {
        return candidate;
      }
    }

    return undefined;
  }, [global.id, local.id, segments]);
}
