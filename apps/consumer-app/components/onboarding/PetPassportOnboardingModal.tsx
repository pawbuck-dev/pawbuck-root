import { useTheme } from "@/context/themeContext";
import { trackOnboardingEvent } from "@/utils/analytics";
import { markPetPassportOnboardingSeen } from "@/utils/onboardingStorage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Modal, Platform, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface PetPassportOnboardingModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function PetPassportOnboardingModal({
  visible,
  onClose,
}: PetPassportOnboardingModalProps) {
  const { theme, mode } = useTheme();
  const { top, bottom } = useSafeAreaInsets();
  const router = useRouter();

  // Track when modal is shown
  useEffect(() => {
    if (visible) {
      trackOnboardingEvent("pet_passport_onboarding_shown");
    }
  }, [visible]);

  const persistPetPassportOnboarding = (extraMeta?: Record<string, unknown>) => {
    void (async () => {
      try {
        await markPetPassportOnboardingSeen();
      } catch (e) {
        console.error("[PetPassportOnboardingModal] mark seen", e);
      }
      try {
        await trackOnboardingEvent("pet_passport_onboarding_completed", extraMeta);
      } catch (e) {
        console.error("[PetPassportOnboardingModal] analytics", e);
      }
    })();
  };

  const handleGotIt = () => {
    onClose();
    persistPetPassportOnboarding();
  };

  const handleGoToPetProfile = () => {
    onClose();
    router.push("/(home)/pet-profile");
    persistPetPassportOnboarding({ action: "navigated_to_pet_profile" });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleGotIt}
      hardwareAccelerated
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "android" ? top : 0,
          paddingBottom: Platform.OS === "android" ? bottom : 0,
        }}
        collapsable={false}
      >
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b flex-row items-center justify-between"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.border,
          }}
        >
          <Text
            className="text-xl font-bold"
            style={{ color: theme.foreground }}
          >
            Share Vaccination Records
          </Text>
          <TouchableOpacity
            onPress={handleGotIt}
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={{
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              ...(Platform.OS === "android" ? { elevation: 1 } : {}),
            }}
          >
            <Ionicons name="close" size={24} color={theme.foreground} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 px-6 pt-8">
          {/* Icon/Illustration */}
          <View className="items-center mb-8">
            <View
              className="w-24 h-24 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name="document-text-outline"
                size={48}
                color={theme.primary}
              />
            </View>
            <Text
              className="text-2xl font-bold mb-2 text-center"
              style={{ color: theme.foreground }}
            >
              Do you know?
            </Text>
            <Text
              className="text-base text-center px-4"
              style={{ color: theme.secondary }}
            >
              You can share your pet's vaccination records with vets, walkers, or sitters in just one click.
            </Text>
          </View>

          {/* How It Works */}
          <View
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-start mb-4">
              <Ionicons
                name="help-circle-outline"
                size={24}
                color={theme.primary}
                style={{ marginRight: 12, marginTop: 2 }}
              />
              <View className="flex-1">
                <Text
                  className="text-lg font-semibold mb-3"
                  style={{ color: theme.foreground }}
                >
                  How?
                </Text>
                <Text
                  className="text-base leading-6"
                  style={{ color: theme.secondary }}
                >
                  Go to{" "}
                  <Text style={{ fontWeight: "600", color: theme.foreground }}>
                    Settings → Pet profile
                  </Text>{" "}
                  → Download your pet passport and instantly share vaccination records with anyone who needs them.
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons — TouchableOpacity for reliable Android hits */}
          <View className="gap-3">
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleGoToPetProfile}
              style={{
                width: "100%",
                minHeight: 52,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: theme.primary,
                ...(Platform.OS === "android" ? { elevation: 4 } : {}),
              }}
            >
              <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                Go to Pet Profile
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.88}
              onPress={handleGotIt}
              style={{
                width: "100%",
                minHeight: 52,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 16,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: theme.border,
                ...(Platform.OS === "android" ? { elevation: 2 } : {}),
              }}
            >
              <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
                Got it!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
