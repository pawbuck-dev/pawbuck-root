import { Pet } from "@/context/petsContext";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type PetCardProps = {
  pet: Pet;
};

export default function PetCard({ pet }: PetCardProps) {
  const router = useRouter();

  const handleTakePhoto = async () => {
    const imageUri = await takePhoto();

    if (imageUri) {
      // TODO: Handle image upload
      console.log("Image URI:", imageUri);
    }
  };

  const handleUpload = async () => {
    const imageUri = await pickImageFromLibrary();

    if (imageUri) {
      // TODO: Handle image upload
      console.log("Image URI:", imageUri);
    }
  };

  const handlePhotoUpload = () => {
    Alert.alert(
      "Upload Photo",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: handleTakePhoto,
        },
        {
          text: "Choose from Gallery",
          onPress: handleUpload,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

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
      className="rounded-3xl p-5 relative"
      style={{ backgroundColor: "#5FC4C0" }}
    >
      {/* Edit Button */}
      <TouchableOpacity
        className="absolute top-5 right-5 w-12 h-12 rounded-full items-center justify-center z-10"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.9)" }}
      >
        <Ionicons name="pencil-outline" size={18} color="#5FC4C0" />
      </TouchableOpacity>

      {/* Photo Upload Area */}
      <View className="items-center mb-4">
        <TouchableOpacity
          onPress={handlePhotoUpload}
          activeOpacity={0.7}
          className="w-56 h-56 rounded-full items-center justify-center"
          style={{
            backgroundColor: "#2C3E50",
            borderWidth: 3,
            borderStyle: "dashed",
            borderColor: "#1A252F",
          }}
        >
          <Ionicons name="cloud-upload" size={48} color="#5FC4C0" />
        </TouchableOpacity>
      </View>

      {/* Pet Info */}
      <View className="items-center mb-4">
        <Text className="text-4xl font-bold mb-2" style={{ color: "#2C3E50" }}>
          {pet.name}
        </Text>
        <Text className="text-base mb-1" style={{ color: "#2C3E50" }}>
          {pet.breed} • {calculateAge(pet.date_of_birth)} years • {pet.sex}
        </Text>
        <Text
          className="text-xs tracking-wider font-mono"
          style={{ color: "#2C3E50" }}
        >
          MICROCHIP {pet.microchip_number || "N/A"}
        </Text>
      </View>

      {/* QR Code */}
      <View className="items-center mb-4">
        <View
          className="w-32 h-32 rounded-lg items-center justify-center p-2"
          style={{ backgroundColor: "white" }}
        >
          <QRCode value={`https://pawbuck.app/pet/${pet.id}`} size={112} />
        </View>
        <Text className="mt-2 text-sm" style={{ color: "#2C3E50" }}>
          Scan for health passport
        </Text>
      </View>

      {/* Health at a Glance */}
      <View
        className="rounded-3xl p-4 mb-4"
        style={{ backgroundColor: "rgba(69, 123, 121, 0.35)" }}
      >
        <Text
          className="text-lg font-extrabold mb-3 tracking-wide"
          style={{ color: "#2C3E50" }}
        >
          HEALTH AT A GLANCE
        </Text>
        <View className="gap-2.5">
          <View className="flex-row items-start">
            <Text className="text-lg mr-2">💉</Text>
            <Text
              className="flex-1 text-base leading-5"
              style={{ color: "#2C3E50" }}
            >
              <Text className="font-bold">Vaccines:</Text> Up-to-date | Next:
              None scheduled
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-lg mr-2">💊</Text>
            <Text
              className="flex-1 text-base leading-5"
              style={{ color: "#2C3E50" }}
            >
              <Text className="font-bold">Medicines:</Text> Next: None scheduled
            </Text>
          </View>
        </View>
      </View>

      {/* Health Records Button */}
      <TouchableOpacity
        className="rounded-3xl py-4 items-center shadow-lg"
        style={{ backgroundColor: "#2C3E50" }}
        onPress={() =>
          router.push(`/(home)/health-record/${pet.id}/(tabs)/vaccinations`)
        }
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name="document-text" size={22} color="white" />
          <Text className="text-white font-bold text-lg tracking-wide">
            Health Records
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}
