import type { PawthonBadgeId } from "@/constants/pawthonBadges";
import { formatWeeklyWalkerRankLine } from "@/services/walkMetrics";
import type { WalkSessionRow } from "@/services/walkSessions";
import type { Pet } from "@/context/petsContext";
import { formatWalkPetNames } from "@/utils/pawthonWalkPets";
import type { PawthonMapCoord } from "@/components/pawthon/PawthonWalkMap";
import type { WalkSharePayload } from "@/utils/walkShareCard";
import { parseWalkPoints } from "@/utils/pawthonWalkDisplay";

export function buildWalkSharePayloadFromSession(
  session: WalkSessionRow,
  pet: Pet | null | undefined,
  extras?: {
    streakDays?: number;
    badgeId?: PawthonBadgeId;
    verificationPhotoUri?: string | null;
    weeklyRank?: number | null;
    weeklyTotal?: number;
    mapSnapshotUri?: string | null;
    /** When set, overrides single-pet name (multi-pet walk detail). */
    petNamesLabel?: string;
  }
): WalkSharePayload {
  return {
    petName: extras?.petNamesLabel ?? pet?.name ?? "my pet",
    petPhotoUrl: pet?.photo_url ?? null,
    path: parseWalkPoints(session),
    distanceMeters: Number(session.distance_meters),
    durationSec: session.duration_seconds,
    endedAt: session.ended_at,
    streakDays: extras?.streakDays,
    badgeId: extras?.badgeId,
    verificationPhotoUri: extras?.verificationPhotoUri,
    weeklyRankLine:
      extras?.weeklyRank != null || extras?.weeklyTotal != null
        ? formatWeeklyWalkerRankLine(extras.weeklyRank, extras.weeklyTotal)
        : undefined,
    mapSnapshotUri: extras?.mapSnapshotUri ?? null,
  };
}

export function buildWalkSharePayloadFromComplete(params: {
  pets: Pet[];
  distanceMeters: number;
  durationSec: number;
  path: PawthonMapCoord[];
  verificationUri: string | null;
  streak: number;
  newBadges: PawthonBadgeId[];
  weeklyRankLine?: string;
  endedAt?: string;
  mapSnapshotUri?: string | null;
}): WalkSharePayload {
  return {
    petName: formatWalkPetNames(params.pets),
    petPhotoUrl: params.pets[0]?.photo_url ?? null,
    path: params.path,
    distanceMeters: params.distanceMeters,
    durationSec: params.durationSec,
    endedAt: params.endedAt ?? new Date().toISOString(),
    streakDays: params.streak,
    badgeId: params.newBadges[0],
    verificationPhotoUri: params.verificationUri,
    weeklyRankLine: params.weeklyRankLine,
    mapSnapshotUri: params.mapSnapshotUri ?? null,
  };
}
