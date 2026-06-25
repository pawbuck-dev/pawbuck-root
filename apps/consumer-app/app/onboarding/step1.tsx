import Header from "@/components/layout/Header";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

const VALUE_POINTS: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: "book-outline",
    title: "Health journal and records",
    body: "Keep vaccinations, meds, and documents organized in one place.",
  },
  {
    icon: "medkit-outline",
    title: "Milo AI triage",
    body: "Get grounded guidance when something seems off — not a substitute for your vet.",
  },
  {
    icon: "mail-outline",
    title: "Share with your vet",
    body: "Each pet gets a unique inbound address so records land in their profile automatically.",
  },
];

export default function OnboardingStep1() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const muted = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Header />
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pb-10 pt-4"
        keyboardShouldPersistTaps="handled"
      >
        <Text
          className="text-3xl font-bold text-center mb-3"
          style={{ color: theme.foreground }}
        >
          Welcome to PawBuck
        </Text>
        <Text
          className="text-base text-center mb-8 leading-6"
          style={{ color: muted }}
        >
          A calmer way to stay on top of your pet's care. Next, we'll ask where you're located,
          then about nine quick questions to build their health profile.
        </Text>

        <View className="gap-4 mb-10">
          {VALUE_POINTS.map((row) => (
            <View
              key={row.title}
              className="rounded-2xl p-4 flex-row gap-3"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
              }}
            >
              <View
                className="w-11 h-11 rounded-full items-center justify-center"
                style={{ backgroundColor: `${theme.primary}22` }}
              >
                <Ionicons name={row.icon} size={22} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold mb-1" style={{ color: theme.foreground }}>
                  {row.title}
                </Text>
                <Text className="text-sm leading-5" style={{ color: muted }}>
                  {row.body}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          testID="onboarding-continue"
          accessibilityRole="button"
          accessibilityLabel="Continue"
          onPress={() => router.push("/onboarding/step2")}
          className="rounded-2xl py-4 px-8 items-center active:opacity-85"
          style={{ backgroundColor: theme.primary }}
        >
          <Text className="text-lg font-semibold" style={{ color: theme.primaryForeground }}>
            Continue
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
