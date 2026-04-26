import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import {
  fetchPetNotificationPrefs,
  upsertPetNotificationPrefs,
  type PetFamilyNotificationPrefsRow,
} from "@/services/petActivity";
import type { PetCareNotificationScope } from "@/services/petActivityPolicy";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  Switch,
  Text,
  View,
} from "react-native";

type Props = {
  petId: string;
};

const SCOPE_OPTIONS: { value: PetCareNotificationScope; label: string }[] = [
  { value: "all", label: "All activity" },
  { value: "meds_only", label: "Meds only" },
  { value: "journal_only", label: "Journal only" },
  { value: "none", label: "No care alerts" },
];

export function PetNotificationPrefsSection({ petId }: Props) {
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id;

  const { data: prefs, isLoading } = useQuery({
    queryKey: ["pet_notification_prefs", petId, userId],
    queryFn: async () => {
      if (!userId) return null;
      const row = await fetchPetNotificationPrefs(petId, userId);
      return (
        row ?? {
          pet_id: petId,
          user_id: userId,
          care_activity_scope: "all" as const,
          lifecycle_push_enabled: true,
          care_push_enabled: true,
          updated_at: new Date().toISOString(),
        }
      );
    },
    enabled: !!petId && !!userId,
  });

  const [pendingScope, setPendingScope] = useState<PetCareNotificationScope | null>(null);

  const effectivePrefs = useMemo(() => {
    if (pendingScope && prefs) {
      return { ...prefs, care_activity_scope: pendingScope };
    }
    return prefs;
  }, [prefs, pendingScope]);

  const mutation = useMutation({
    mutationFn: async (next: Partial<PetFamilyNotificationPrefsRow>) => {
      if (!userId) throw new Error("Not signed in");
      await upsertPetNotificationPrefs(petId, userId, next);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["pet_notification_prefs", petId, userId],
      });
      setPendingScope(null);
    },
    onError: (e: Error) => {
      Alert.alert("Could not save", e.message);
    },
  });

  const applyScope = useCallback(
    (scope: PetCareNotificationScope) => {
      setPendingScope(scope);
      mutation.mutate({ care_activity_scope: scope });
    },
    [mutation]
  );

  if (!userId) {
    return null;
  }

  if (isLoading || !effectivePrefs) {
    return (
      <View className="py-4 items-center">
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  const scope = effectivePrefs.care_activity_scope;

  return (
    <View>
      <Text className="text-base font-semibold mb-2" style={{ color: theme.foreground }}>
        Care activity alerts
      </Text>
      <Text className="text-sm mb-3" style={{ color: theme.secondary }}>
        Choose which health updates notify you for this pet (push). Family invites, role changes,
        and access updates can be toggled separately.
      </Text>

      <View className="flex-row flex-wrap gap-2 mb-4">
        {SCOPE_OPTIONS.map((opt) => {
          const selected = scope === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => applyScope(opt.value)}
              disabled={mutation.isPending}
              className="px-3 py-2 rounded-full active:opacity-80"
              style={{
                backgroundColor: selected ? theme.primary : theme.card,
                borderWidth: 1,
                borderColor: selected ? theme.primary : theme.border,
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: selected ? theme.primaryForeground : theme.foreground }}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View
        className="flex-row items-center justify-between py-3"
        style={{ borderTopWidth: 1, borderTopColor: theme.border }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-medium" style={{ color: theme.foreground }}>
            Health & journal pushes
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: theme.secondary }}>
            Master switch for vaccines, meds, and journal (subject to scope above).
          </Text>
        </View>
        <Switch
          value={effectivePrefs.care_push_enabled}
          onValueChange={(v) => mutation.mutate({ care_push_enabled: v })}
          disabled={mutation.isPending}
        />
      </View>

      <View
        className="flex-row items-center justify-between py-3"
        style={{ borderTopWidth: 1, borderTopColor: theme.border }}
      >
        <View className="flex-1 pr-3">
          <Text className="text-base font-medium" style={{ color: theme.foreground }}>
            Family & access alerts
          </Text>
          <Text className="text-xs mt-0.5" style={{ color: theme.secondary }}>
            Invites accepted, roles changed, members added or removed.
          </Text>
        </View>
        <Switch
          value={effectivePrefs.lifecycle_push_enabled}
          onValueChange={(v) => mutation.mutate({ lifecycle_push_enabled: v })}
          disabled={mutation.isPending}
        />
      </View>
    </View>
  );
}
