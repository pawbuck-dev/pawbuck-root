import type { OnboardingPetData } from "@/types/onboardingPetData";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DRAFT_KEY = "@pawbuck/onboarding_pet_draft_v1";

export type OnboardingPetDraft = {
  petData: OnboardingPetData;
  isOnboardingComplete: boolean;
  savedAt: number;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function loadOnboardingPetDraft(): Promise<OnboardingPetDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isPlainObject(parsed)) return null;
    const petData = parsed.petData;
    if (!isPlainObject(petData)) return null;
    return {
      petData: petData as OnboardingPetData,
      isOnboardingComplete: Boolean(parsed.isOnboardingComplete),
      savedAt: typeof parsed.savedAt === "number" ? parsed.savedAt : 0,
    };
  } catch {
    return null;
  }
}

export async function saveOnboardingPetDraft(draft: {
  petData: OnboardingPetData;
  isOnboardingComplete: boolean;
}): Promise<void> {
  try {
    const payload: OnboardingPetDraft = {
      ...draft,
      savedAt: Date.now(),
    };
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export async function clearOnboardingPetDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}
