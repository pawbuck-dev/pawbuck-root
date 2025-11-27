import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";

export default function AddPetCard() {
  const router = useRouter();
  const { theme } = useTheme();

  const handleAddPet = () => {
    router.push("/onboarding/step1");
  };

  return (
    <View className="items-center justify-center flex-1 px-4">
      <TouchableOpacity
        onPress={handleAddPet}
        activeOpacity={0.7}
        className="rounded-3xl p-8 w-full h-full"
        style={{
          backgroundColor: theme.dashedCard,
          borderWidth: 2,
          borderStyle: "dashed",
          borderColor: theme.primary,
        }}
      >
        <View className="items-center justify-center py-16">
          {/* Plus Icon Circle */}
          <View className="mb-12">
            <View
              className="w-40 h-40 rounded-full items-center justify-center"
              style={{
                backgroundColor: `${theme.primary}20`,
              }}
            >
              <View
                className="w-32 h-32 rounded-full items-center justify-center"
                style={{
                  backgroundColor: `${theme.primary}30`,
                }}
              >
                <Ionicons name="add" size={80} color={theme.primary} />
              </View>
            </View>
          </View>

          {/* Text Content */}
          <View className="items-center px-8">
            <Text
              className="text-3xl font-bold text-center mb-4"
              style={{ color: theme.foreground }}
            >
              Add Another Pet
            </Text>
            <Text
              className="text-base text-center leading-6"
              style={{ color: theme.foreground, opacity: 0.6 }}
            >
              Create a health profile for another family member
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}
