import {
  clearOnboardingPetDraft,
  loadOnboardingPetDraft,
  saveOnboardingPetDraft,
} from "@/services/onboardingDraftStorage";
import type { OnboardingPetData } from "@/types/onboardingPetData";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/** @deprecated Use OnboardingPetData from types; kept for backward compatibility with imports. */
export type PetData = OnboardingPetData;

interface OnboardingContextType {
  petData: OnboardingPetData;
  updatePetData: (data: Partial<OnboardingPetData>) => void;
  resetOnboarding: () => void;
  isOnboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  /** True after AsyncStorage draft load attempt (success or empty). */
  onboardingDraftHydrated: boolean;
  /** When set, authenticated onboarding review navigates here after the pet is saved (e.g. profile). */
  postPetCreationRoute: string | null;
  setPostPetCreationRoute: (route: string | null) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined
);

const SAVE_DEBOUNCE_MS = 400;

export const OnboardingProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [petData, setPetData] = useState<OnboardingPetData>({});
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [postPetCreationRoute, setPostPetCreationRoute] = useState<string | null>(null);
  const [onboardingDraftHydrated, setOnboardingDraftHydrated] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const petDataRef = useRef<OnboardingPetData>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const draft = await loadOnboardingPetDraft();
        if (cancelled) return;
        if (draft) {
          const nextPet = draft.petData ?? {};
          petDataRef.current = nextPet;
          setPetData(nextPet);
          setIsOnboardingComplete(Boolean(draft.isOnboardingComplete));
        }
      } finally {
        if (!cancelled) {
          setOnboardingDraftHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    petDataRef.current = petData;
  }, [petData]);

  useEffect(() => {
    if (!onboardingDraftHydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveOnboardingPetDraft({ petData, isOnboardingComplete });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [petData, isOnboardingComplete, onboardingDraftHydrated]);

  const updatePetData = useCallback((data: Partial<OnboardingPetData>) => {
    setPetData((prev) => {
      const next = { ...(prev || {}), ...data };
      petDataRef.current = next;
      return next;
    });
  }, []);

  const completeOnboarding = useCallback(async () => {
    setIsOnboardingComplete(true);
    await saveOnboardingPetDraft({
      petData: petDataRef.current,
      isOnboardingComplete: true,
    });
  }, []);

  const resetOnboarding = useCallback(() => {
    setIsOnboardingComplete(false);
    petDataRef.current = {};
    setPetData({});
    setPostPetCreationRoute(null);
    void clearOnboardingPetDraft();
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        petData,
        updatePetData,
        resetOnboarding,
        isOnboardingComplete,
        completeOnboarding,
        onboardingDraftHydrated,
        postPetCreationRoute,
        setPostPetCreationRoute,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};
