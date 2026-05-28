import BottomNavBar from "@/components/home/BottomNavBar";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import PetSelector from "@/components/home/PetSelector";
import DocumentsAndIdSection from "@/components/health/DocumentsAndIdSection";
import HealthRecordsAttentionBanner from "@/components/health/HealthRecordsAttentionBanner";
import { useChat } from "@/context/chatContext";
import { usePets } from "@/context/petsContext";
import { useHealthAttentionForPet, usePetHealthNotificationCounts } from "@/hooks/useHealthHubAttention";
import { healthRecordTabCanvas } from "@/constants/figmaHealthLayout";
import { petPossessiveLabel } from "@/utils/petCopy";
import { useTheme } from "@/context/themeContext";
import { useHealthRecordPetId } from "@/hooks/useHealthRecordPetId";
import { useSelectedPet } from "@/context/selectedPetContext";
import { healthRecordHubHref } from "@/utils/healthRecordNavigation";
import { Redirect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Health Records hub — Figma 2033:133716. Default route for /health-record/[id] (bottom nav + dashboard).
 */
export default function HealthRecordsHubScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const routePetId = useHealthRecordPetId();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const router = useRouter();
  const { pets } = usePets();
  const [redirectPetId, setRedirectPetId] = useState<string | null>(null);

  const displayPetId = redirectPetId ?? selectedPetId ?? routePetId;

  useEffect(() => {
    if (redirectPetId && routePetId === redirectPetId) {
      setRedirectPetId(null);
    }
  }, [redirectPetId, routePetId]);

  const insets = useSafeAreaInsets();
  const { openChat, setSelectedPet } = useChat();

  const pet = pets.find((p) => p.id === displayPetId);
  const petName = pet?.name ?? "your pet";

  const notificationCounts = usePetHealthNotificationCounts(pets.map((p) => p.id));
  const { attentionCount, subtitle: attentionSubtitle } = useHealthAttentionForPet(displayPetId);

  /** Dark: same deeper well as health tabs + dashboard (cards sit on top like Care Team). */
  const pageBg = healthRecordTabCanvas(theme, isDark);

  if (redirectPetId && redirectPetId !== routePetId) {
    return <Redirect href={healthRecordHubHref(redirectPetId)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 120,
        }}
      >
        <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          <Text
            style={{
              fontSize: 28,
              fontWeight: "700",
              color: theme.foreground,
              letterSpacing: -0.3,
            }}
          >
            {petPossessiveLabel(pet?.name, "Health Records")}
          </Text>
        </View>

        {pets.length > 1 && (
          <View style={{ marginBottom: 12, paddingHorizontal: 4 }}>
            <PetSelector
              pets={pets}
              selectedPetId={displayPetId ?? null}
              onSelectPet={(nextPetId) => {
                if (!nextPetId || nextPetId === displayPetId) return;
                setSelectedPetId(nextPetId);
                setRedirectPetId(nextPetId);
              }}
              notificationCounts={notificationCounts}
            />
          </View>
        )}

        <View style={{ paddingHorizontal: 16 }}>
          {attentionCount > 0 ? (
            <HealthRecordsAttentionBanner
              subtitle={attentionSubtitle}
              onPress={() =>
                displayPetId &&
                router.push(`/(home)/health-record/${displayPetId}/(tabs)/vaccinations` as any)
              }
            />
          ) : null}

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              Share.share({
                message: `${petName}'s health records are in PawBuck. Ask your clinic how they prefer to receive documents or visit summaries.`,
                title: "Share with vet",
              }).catch(() => {});
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              paddingVertical: 14,
              borderRadius: 100,
              marginBottom: 14,
              backgroundColor: theme.primary,
            }}
          >
            <Ionicons name="share-outline" size={20} color={theme.primaryForeground} />
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primaryForeground }}>
              Share with vet
            </Text>
          </TouchableOpacity>

          <HealthRecordsSection
            petId={displayPetId ?? ""}
            petName={petName}
            variant="hub"
            showTitle={false}
          />

          <DocumentsAndIdSection pet={pet} />
        </View>
      </ScrollView>

      <BottomNavBar activeTab="records" selectedPetId={displayPetId} />

      {pet ? (
        <TouchableOpacity
          onPress={() => {
            setSelectedPet(pet);
            openChat({ starterScreen: "health_records" });
          }}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Ask Milo about health records"
          style={{
            position: "absolute",
            right: 20,
            bottom: 88 + insets.bottom,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.primary,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
