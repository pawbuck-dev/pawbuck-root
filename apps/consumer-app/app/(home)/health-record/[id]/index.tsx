import BottomNavBar from "@/components/home/BottomNavBar";
import HealthRecordsSection from "@/components/home/HealthRecordsSection";
import PetSelector from "@/components/home/PetSelector";
import DocumentsAndIdSection from "@/components/health/DocumentsAndIdSection";
import HealthRecordsAttentionBanner from "@/components/health/HealthRecordsAttentionBanner";
import { usePets } from "@/context/petsContext";
import { useHealthAttentionForPet, usePetHealthNotificationCounts } from "@/hooks/useHealthHubAttention";
import { dashboardCareTeamCardChrome, healthRecordTabCanvas } from "@/constants/figmaHealthLayout";
import { petPossessiveLabel } from "@/utils/petCopy";
import { useTheme } from "@/context/themeContext";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { ScrollView, Share, Text, TouchableOpacity, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Health Records hub — Figma 2033:133716. Default route for /health-record/[id] (bottom nav + dashboard).
 */
export default function HealthRecordsHubScreen() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { pets } = usePets();
  const insets = useSafeAreaInsets();

  const pet = pets.find((p) => p.id === id);
  const petName = pet?.name ?? "your pet";

  const notificationCounts = usePetHealthNotificationCounts(pets.map((p) => p.id));
  const { attentionCount, subtitle: attentionSubtitle } = useHealthAttentionForPet(id);

  /** Dark: same deeper well as health tabs + dashboard (cards sit on top like Care Team). */
  const pageBg = healthRecordTabCanvas(theme, isDark);

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
              selectedPetId={id}
              onSelectPet={(petId) => {
                router.replace(`/(home)/health-record/${petId}` as any);
              }}
              notificationCounts={notificationCounts}
            />
          </View>
        )}

        <View style={{ paddingHorizontal: 16 }}>
          {attentionCount > 0 ? (
            <HealthRecordsAttentionBanner
              subtitle={attentionSubtitle}
              onPress={() => router.push(`/(home)/health-record/${id}/(tabs)/vaccinations` as any)}
            />
          ) : null}

          <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() =>
                router.push(`/(home)/health-record/${id}/vaccination-upload-modal?upload=library` as any)
              }
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 14,
                borderRadius: 100,
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
              }}
            >
              <Ionicons name="cloud-upload-outline" size={20} color={theme.foreground} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>Upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                Share.share({
                  message: `${petName}'s health records are in PawBuck. Ask your clinic how they prefer to receive documents or visit summaries.`,
                  title: "Share with vet",
                }).catch(() => {});
              }}
              style={{
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 14,
                borderRadius: 100,
                backgroundColor: theme.primary,
              }}
            >
              <Ionicons name="share-outline" size={20} color={theme.primaryForeground} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primaryForeground }}>
                Share with vet
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() =>
              router.push({ pathname: "/(home)/pet-journal", params: { petId: id } } as any)
            }
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              borderRadius: 24,
              paddingVertical: 16,
              paddingHorizontal: 16,
              marginBottom: 14,
              ...dashboardCareTeamCardChrome(isDark),
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <Ionicons name="book-outline" size={22} color={theme.foreground} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Pet Journal</Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 2 }}>
                Log symptoms, behavior & environment
              </Text>
            </View>
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                alignItems: "center",
                justifyContent: "center",
                marginLeft: 8,
              }}
            >
              <MaterialCommunityIcons name="arrow-top-right" size={20} color={theme.secondary} />
            </View>
          </TouchableOpacity>

          <HealthRecordsSection
            petId={id}
            petName={petName}
            variant="hub"
            showTitle={false}
          />

          <DocumentsAndIdSection pet={pet} />
        </View>
      </ScrollView>

      <BottomNavBar activeTab="records" selectedPetId={id} />
    </View>
  );
}
