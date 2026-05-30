import type { PawthonBadgeId } from "@/constants/pawthonBadges";
import { formatWeeklyWalkerRankLine } from "@/services/walkMetrics";
import type { WalkSessionRow } from "@/services/walkSessions";
import type { Pet } from "@/context/petsContext";
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
  }
): WalkSharePayload {
  return {
    petName: pet?.name ?? "my pet",
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
  };
}

export function buildWalkSharePayloadFromComplete(params: {
  pet: Pet;
  distanceMeters: number;
  durationSec: number;
  path: PawthonMapCoord[];
  verificationUri: string | null;
  streak: number;
  newBadges: PawthonBadgeId[];
  weeklyRankLine?: string;
  endedAt?: string;
}): WalkSharePayload {
  return {
    petName: params.pet.name,
    petPhotoUrl: params.pet.photo_url ?? null,
    path: params.path,
    distanceMeters: params.distanceMeters,
    durationSec: params.durationSec,
    endedAt: params.endedAt ?? new Date().toISOString(),
    streakDays: params.streak,
    badgeId: params.newBadges[0],
    verificationPhotoUri: params.verificationUri,
    weeklyRankLine: params.weeklyRankLine,
  };
}
