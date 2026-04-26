import { useTheme } from "@/context/themeContext";
import {
  fetchPetActivityEvents,
  subscribePetActivityEvents,
  type PetActivityEventRow,
} from "@/services/petActivity";
import { supabase } from "@/utils/supabase";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

type Props = {
  petId: string;
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PetActivityFeed({ petId }: Props) {
  const { theme } = useTheme();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["pet_activity_events", petId],
    queryFn: () => fetchPetActivityEvents(petId),
    enabled: !!petId,
  });

  useEffect(() => {
    if (!petId) return;

    const channel = subscribePetActivityEvents(petId, (row: PetActivityEventRow) => {
      queryClient.setQueryData<PetActivityEventRow[]>(
        ["pet_activity_events", petId],
        (prev) => {
          const base = prev ?? [];
          if (base.some((e) => e.id === row.id)) return base;
          return [row, ...base];
        }
      );
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [petId, queryClient]);

  if (isLoading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <Text className="text-sm" style={{ color: theme.secondary }}>
        No recent activity yet. Vaccines, medications, and journal updates from your care team
        will appear here.
      </Text>
    );
  }

  return (
    <View>
      {events.map((e, idx) => (
        <View
          key={e.id}
          className="py-3"
          style={
            idx < events.length - 1
              ? { borderBottomWidth: 1, borderBottomColor: theme.border }
              : undefined
          }
        >
          <Text className="text-sm leading-5" style={{ color: theme.foreground }}>
            {e.summary}
          </Text>
          <Text className="text-xs mt-1" style={{ color: theme.secondary }}>
            {formatWhen(e.created_at)}
          </Text>
        </View>
      ))}
    </View>
  );
}
