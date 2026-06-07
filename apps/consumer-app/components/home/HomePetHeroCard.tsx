import PrivateImage from "@/components/common/PrivateImage";
import JournalEntryShortcuts from "@/components/petJournal/JournalEntryShortcuts";
import { useTheme } from "@/context/themeContext";
import type { Pet } from "@/context/petsContext";
import { usePetPhotoUpload } from "@/hooks/usePetPhotoUpload";
import type { HomeTodaySnapshot } from "@/utils/homeTodaySnapshot";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const HERO_HEIGHT = 200;

type Props = {
  pet: Pet;
  snapshot: HomeTodaySnapshot;
  streakDays?: number;
  onCheckInWithMilo: () => void;
  aiJournalEntriesRemaining?: number | null;
  aiJournalEntriesUsed?: number;
};

function heroSubtitle(snapshot: HomeTodaySnapshot, streakDays: number, petName: string): string {
  if (streakDays >= 3) {
    return `You're on a roll — keep ${petName}'s record current with a quick note.`;
  }
  if (snapshot.statusTone === "attention") {
    return snapshot.priority?.subtitle ?? snapshot.statusLabel;
  }
  return "A quick check-in helps Milo and your vet briefing stay accurate.";
}

export default function HomePetHeroCard({
  pet,
  snapshot,
  streakDays = 0,
  onCheckInWithMilo,
  aiJournalEntriesRemaining,
  aiJournalEntriesUsed = 0,
}: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const router = useRouter();
  const { uploading, promptPhotoUpload } = usePetPhotoUpload(pet);

  const showAiJournalQuota =
    aiJournalEntriesRemaining != null && aiJournalEntriesUsed > 0;

  const statusColor = snapshot.statusTone === "ok" ? "#22C55E" : "#F97316";
  const subtitle = heroSubtitle(snapshot, streakDays, pet.name);

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        };

  const badgeLabel =
    streakDays >= 3
      ? `🔥 ${streakDays}-day streak`
      : snapshot.statusTone === "attention"
        ? `${snapshot.attentionCount} need attention`
        : null;

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: isDark ? "#14171c" : "#1A1E25",
        ...borderStyle,
      }}
    >
      <View style={{ height: HERO_HEIGHT, position: "relative" }}>
        {pet.photo_url ? (
          <PrivateImage
            bucketName="pets"
            filePath={pet.photo_url}
            style={{ width: "100%", height: HERO_HEIGHT }}
            resizeMode="cover"
          />
        ) : (
          <Pressable
            onPress={promptPhotoUpload}
            style={{
              flex: 1,
              height: HERO_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#1e2228" : "#2a2e35",
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add a photo of ${pet.name}`}
          >
            <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.55)" />
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: "600",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Add {`${pet.name}'s photo`}
            </Text>
          </Pressable>
        )}

        <LinearGradient
          colors={["rgba(10,11,14,0)", "rgba(11,13,17,0.55)", "rgba(11,13,17,0.92)"]}
          locations={[0.25, 0.55, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
          pointerEvents="none"
        />

        {uploading ? (
          <View
            style={{
              ...StyleSheetAbsoluteFill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 3,
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : null}

        {badgeLabel ? (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 2,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 24,
              backgroundColor: "rgba(8,9,11,0.42)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: streakDays >= 3 ? "700" : "600",
                color: streakDays >= 3 ? "#fff" : "rgba(255,255,255,0.78)",
              }}
            >
              {badgeLabel}
            </Text>
          </View>
        ) : null}

        {pet.photo_url ? (
          <TouchableOpacity
            onPress={promptPhotoUpload}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change pet photo"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 2,
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(8,9,11,0.42)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
            }}
          >
            <Ionicons name="camera-outline" size={17} color="#fff" />
          </TouchableOpacity>
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 14,
            zIndex: 2,
          }}
        >
          <Text
            style={{
              fontSize: 25,
              fontWeight: "800",
              letterSpacing: -0.6,
              color: "#fff",
              textShadowColor: "rgba(0,0,0,0.7)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 12,
            }}
          >
            {`How's ${pet.name} today?`}
          </Text>
          <Text
            style={{
              marginTop: 4,
              fontSize: 13,
              fontWeight: "600",
              color: "rgba(255,255,255,0.82)",
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 8,
            }}
            numberOfLines={2}
          >
            {subtitle}
          </Text>
        </View>
      </View>

      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 15,
          paddingBottom: 17,
          backgroundColor: isDark ? "#14171c" : "#1A1E25",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 }}>
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: statusColor,
            }}
          />
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff", flex: 1 }}>
            {snapshot.statusLabel}
          </Text>
        </View>

        <Pressable
          onPress={onCheckInWithMilo}
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            paddingVertical: 15,
            borderRadius: 15,
            backgroundColor: theme.primary,
            marginBottom: snapshot.priority ? 12 : 0,
          }}
          accessibilityRole="button"
          accessibilityLabel={`Check in with Milo about ${pet.name}`}
        >
          <Ionicons name="sparkles" size={18} color={theme.primaryForeground} />
          <Text style={{ fontSize: 16, fontWeight: "800", color: theme.primaryForeground }}>
            Check in with Milo
          </Text>
        </Pressable>

        {snapshot.priority ? (
          <Pressable
            onPress={() => router.push(snapshot.priority!.route as any)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderRadius: 12,
              backgroundColor: "rgba(249,115,22,0.14)",
              gap: 10,
              marginBottom: 12,
            }}
            accessibilityRole="button"
            accessibilityLabel={snapshot.priority.title}
          >
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(249,115,22,0.25)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="heart" size={18} color="#EA580C" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }} numberOfLines={1}>
                {snapshot.priority.title}
              </Text>
              <Text
                style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", marginTop: 2 }}
                numberOfLines={2}
              >
                {snapshot.priority.subtitle}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
          </Pressable>
        ) : null}

        <JournalEntryShortcuts petId={pet.id} onDarkSurface />

        {showAiJournalQuota ? (
          <Text
            style={{
              fontSize: 11,
              color: "rgba(255,255,255,0.55)",
              textAlign: "center",
              marginTop: 12,
            }}
          >
            {aiJournalEntriesRemaining} AI check-in{aiJournalEntriesRemaining === 1 ? "" : "s"} left on Free
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};
