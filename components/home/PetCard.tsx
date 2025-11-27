import { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import PetImage from "./PetImage";

type PetCardProps = {
  pet: Pet;
};

export default function PetCard({ pet }: PetCardProps) {
  const router = useRouter();
  const { theme } = useTheme();

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <View
      className="rounded-3xl p-6 relative"
      style={{
        backgroundColor: theme.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
      }}
    >
      {/* Edit Button */}
      <TouchableOpacity
        className="absolute top-5 right-5 w-10 h-10 rounded-full items-center justify-center z-10"
        style={{
          backgroundColor: theme.dashedCard,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Ionicons name="pencil-outline" size={16} color={theme.secondary} />
      </TouchableOpacity>

      {/* Photo Upload Area */}
      <PetImage pet={pet} />

      {/* Pet Info */}
      <View className="items-center mb-5">
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: theme.cardForeground, letterSpacing: -0.5 }}
        >
          {pet.name}
        </Text>
        <Text className="text-sm mb-2" style={{ color: theme.secondary }}>
          {pet.breed} • {calculateAge(pet.date_of_birth)} years • {pet.sex}
        </Text>
        {pet.microchip_number && (
          <View
            className="px-3 py-1.5 rounded-full mt-1"
            style={{ backgroundColor: theme.dashedCard }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: theme.secondary, letterSpacing: 0.5 }}
            >
              MICROCHIP {pet.microchip_number}
            </Text>
          </View>
        )}
      </View>

      {/* QR Code */}
      <View className="items-center mb-5">
        <View
          className="w-32 h-32 rounded-lg items-center justify-center p-3"
          style={{
            backgroundColor: "#FFFFFF",
            borderWidth: 1,
            borderColor: theme.border,
          }}
        >
          <QRCode
            value={`https://pawbuck.app/pet/${pet.id}`}
            size={104}
            backgroundColor="#FFFFFF"
            color="#000000"
          />
        </View>
        <Text className="mt-3 text-xs" style={{ color: theme.secondary }}>
          Scan for health passport
        </Text>
      </View>

      {/* Health at a Glance */}
      <View
        className="rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: theme.dashedCard,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          className="text-sm font-bold mb-3"
          style={{ color: theme.cardForeground, letterSpacing: 0.5 }}
        >
          HEALTH AT A GLANCE
        </Text>
        <View className="gap-3">
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: theme.primary + "20" }}
            >
              <Ionicons name="medical" size={16} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-semibold mb-0.5"
                style={{ color: theme.cardForeground }}
              >
                Vaccines
              </Text>
              <Text className="text-xs" style={{ color: theme.secondary }}>
                Up-to-date • Next: None scheduled
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "#FF9800" + "20" }}
            >
              <Ionicons name="medkit" size={16} color="#FF9800" />
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-semibold mb-0.5"
                style={{ color: theme.cardForeground }}
              >
                Medicines
              </Text>
              <Text className="text-xs" style={{ color: theme.secondary }}>
                Next: None scheduled
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Health Records Button */}
      <TouchableOpacity
        className="rounded-2xl py-4 items-center"
        style={{
          backgroundColor: theme.primary,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        }}
        onPress={() =>
          router.push(`/(home)/health-record/${pet.id}/(tabs)/vaccinations`)
        }
      >
        <View className="flex-row items-center gap-2">
          <Ionicons
            name="document-text-outline"
            size={20}
            color={theme.primaryForeground}
          />
          <Text
            className="font-semibold text-base"
            style={{ color: theme.primaryForeground }}
          >
            Health Records
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
