import { Pet } from "@/context/petsContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

type PetCardProps = {
  pet: Pet;
};

export default function PetCard({ pet }: PetCardProps) {
  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Sorry, we need camera permissions to take photos!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      // Handle photo upload
      console.log("Photo taken:", result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Sorry, we need media library permissions to upload photos!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      // Handle photo upload
      console.log("Photo uploaded:", result.assets[0].uri);
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
        <Ionicons name="pencil" size={20} color="#2C3E50" />
      </TouchableOpacity>

      {/* Photo Upload Area */}
      <View className="items-center mb-4">
        <View className="relative">
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
      </View>

      {/* Pet Info */}
      <View className="items-center px-14">
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
          PET DETAILS
        </Text>
        <View className="gap-2.5">
          <View className="flex-row items-start">
            <Text className="text-lg mr-2">🏠</Text>
            <Text
              className="flex-1 text-base leading-5"
              style={{ color: "#2C3E50" }}
            >
              <Text className="font-bold">Country:</Text> {pet.country}
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-lg mr-2">⚖️</Text>
            <Text
              className="flex-1 text-base leading-5"
              style={{ color: "#2C3E50" }}
            >
              <Text className="font-bold">Weight:</Text> {pet.weight_value}{" "}
              {pet.weight_unit}
            </Text>
          </View>
          <View className="flex-row items-start">
            <Text className="text-lg mr-2">🐾</Text>
            <Text
              className="flex-1 text-base leading-5"
              style={{ color: "#2C3E50" }}
            >
              <Text className="font-bold">Type:</Text> {pet.animal_type}
            </Text>
          </View>
        </View>
      </View>

      {/* Health Records Button */}
      <TouchableOpacity
        className="rounded-3xl py-4 items-center shadow-lg"
        style={{ backgroundColor: "#2C3E50" }}
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
