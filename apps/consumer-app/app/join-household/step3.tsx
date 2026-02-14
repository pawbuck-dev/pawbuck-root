import { useRouter, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "@/context/themeContext";

export default function JoinHouseholdStep3() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDarkMode = mode === "dark";
  const { inviteCode } = useLocalSearchParams<{ inviteCode: string }>();

  const handleContinue = () => {
    // Navigate to home screen
    router.dismissAll();
    router.replace("/(home)/home");
  };

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Top Navigation Bar */}
      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <View style={{ width: 60 }} />
          <Text className="text-base" style={{ color: theme.foreground }}>
            Step 3 of 3
          </Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Progress Bar */}
        <View
          className="w-full h-1 rounded-full"
          style={{ backgroundColor: isDarkMode ? "#1F1F1F" : theme.border }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: "100%",
              backgroundColor: theme.primary,
            }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerClassName="flex-grow"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 items-center justify-center px-6 py-8">
          <View className="w-full max-w-md items-center">
            {/* Success Icon */}
            <View className="items-center mb-8">
              <View
                className="w-24 h-24 rounded-full items-center justify-center"
                style={{
                  backgroundColor: theme.primary + "20",
                }}
              >
                <MaterialCommunityIcons
                  name="check-circle"
                  size={60}
                  color={theme.primary}
                />
              </View>
            </View>

            {/* Title */}
            <Text
              className="text-3xl font-bold text-center mb-4"
              style={{ color: theme.foreground }}
            >
              Successfully Joined!
            </Text>

            {/* Success Message */}
            <Text
              className="text-base text-center mb-8"
              style={{ color: theme.secondary }}
            >
              You&apos;ve successfully joined the household. You now have access to all pets in this household.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Action Button */}
      <View className="px-6 pb-8 pt-4">
        <Pressable
          onPress={handleContinue}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor: theme.primary,
          }}
        >
          <Text
            className="text-lg font-semibold"
            style={{ color: "#FFFFFF" }}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

