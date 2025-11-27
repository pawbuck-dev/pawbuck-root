import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import QRCode from "react-native-qrcode-svg";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

export default function Home() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { theme, mode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { pets, loading, refreshPets, addPet } = usePets();
  const [currentPetIndex, setCurrentPetIndex] = useState(0);

  // Handle pet data from onboarding/signup using PetsContext
  useEffect(() => {
    if (!params.petData) return;

    const handlePetData = async () => {
      try {
        const petData = JSON.parse(params.petData as string);
        await addPet(petData);
        router.setParams({ petData: undefined });
      } catch (error) {
        console.error("Error syncing pet:", error);
        Alert.alert(
          "Error",
          "There was an issue saving your pet's profile. Please try adding it again from the home page."
        );
      }
    };

    handlePetData();
  }, [params.petData, router, addPet]);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            // Navigate back to welcome screen
            router.replace("/");
          } catch (error: any) {
            console.error("Error signing out:", error);
            Alert.alert("Error", error.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleRefresh = async () => {
    try {
      await refreshPets();
      Alert.alert("Success", "Pets data refreshed!");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to refresh pets");
    }
  };

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

  const navigateToPet = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPetIndex > 0) {
      setCurrentPetIndex(currentPetIndex - 1);
    } else if (direction === "next" && currentPetIndex < pets.length - 1) {
      setCurrentPetIndex(currentPetIndex + 1);
    }
  };

  const currentPet = pets[currentPetIndex];

  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || "U";
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

  // Swipe gesture handling
  const translateX = useSharedValue(0);
  const context = useSharedValue({ x: 0 });

  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value };
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
    })
    .onEnd((event) => {
      const SWIPE_THRESHOLD = 50;

      if (event.translationX > SWIPE_THRESHOLD && currentPetIndex > 0) {
        // Swipe right - go to previous pet
        runOnJS(navigateToPet)("prev");
      } else if (
        event.translationX < -SWIPE_THRESHOLD &&
        currentPetIndex < pets.length - 1
      ) {
        // Swipe left - go to next pet
        runOnJS(navigateToPet)("next");
      }

      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  // Show loading state
  if (loading) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color="#5FC4C0" />
        <Text className="mt-4 text-lg" style={{ color: theme.foreground }}>
          Loading your pets...
        </Text>
      </View>
    );
  }

  // Show message if no pets
  if (pets.length === 0) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />

        {/* Header */}
        <View className="px-6 pt-12 pb-3 flex-row items-center justify-between">
          <Ionicons name="paw" size={32} color="#5FC4C0" />
          <Text
            className="text-3xl font-bold"
            style={{ color: theme.foreground }}
          >
            Your Pets
          </Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={toggleTheme}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <Ionicons
                name={mode === "dark" ? "sunny" : "moon"}
                size={20}
                color="#5FC4C0"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSignOut}
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: "#5FC4C0" }}
            >
              <Text className="text-xl font-bold text-gray-900">
                {getUserInitial()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="flex-1 items-center justify-center px-6">
          <Ionicons name="paw-outline" size={80} color="#5FC4C0" />
          <Text
            className="text-2xl font-bold mt-6 text-center"
            style={{ color: theme.foreground }}
          >
            No Pets Yet
          </Text>
          <Text
            className="text-base mt-2 text-center"
            style={{ color: theme.foreground, opacity: 0.7 }}
          >
            Add your first pet to get started!
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/onboarding/step1")}
            className="mt-6 px-8 py-4 rounded-full"
            style={{ backgroundColor: "#5FC4C0" }}
          >
            <Text className="text-lg font-bold text-gray-900">Add a Pet</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-16 pb-3 flex-row items-center justify-between">
        <Ionicons name="paw" size={32} color="#5FC4C0" />
        <Text
          className="text-3xl font-bold"
          style={{ color: theme.foreground }}
        >
          Your Pets
        </Text>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity
            onPress={handleRefresh}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
          >
            <Ionicons name="refresh" size={20} color="#5FC4C0" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleTheme}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
          >
            <Ionicons
              name={mode === "dark" ? "sunny" : "moon"}
              size={20}
              color="#5FC4C0"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSignOut}
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: "#5FC4C0" }}
          >
            <Text className="text-xl font-bold text-gray-900">
              {getUserInitial()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Pet Card with Navigation */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
      >
        <View className="flex-1 px-5 pt-2">
          <GestureDetector gesture={panGesture}>
            <Animated.View
              className="rounded-3xl p-5 relative h-full"
              style={[{ backgroundColor: "#5FC4C0" }, animatedStyle]}
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
                <Text
                  className="text-4xl font-bold mb-2"
                  style={{ color: "#2C3E50" }}
                >
                  {currentPet.name}
                </Text>
                <Text className="text-base mb-1" style={{ color: "#2C3E50" }}>
                  {currentPet.breed} •{" "}
                  {calculateAge(currentPet.date_of_birth)} years •{" "}
                  {currentPet.sex}
                </Text>
                <Text
                  className="text-xs tracking-wider font-mono"
                  style={{ color: "#2C3E50" }}
                >
                  MICROCHIP {currentPet.microchip_number || "N/A"}
                </Text>
              </View>

              {/* QR Code */}
              <View className="items-center mb-4">
                <View
                  className="w-32 h-32 rounded-lg items-center justify-center p-2"
                  style={{ backgroundColor: "white" }}
                >
                  <QRCode
                    value={`https://pawbuck.app/pet/${currentPet.id}`}
                    size={112}
                  />
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
                      <Text className="font-bold">Vaccines:</Text> Up-to-date | Next: None scheduled
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
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons name="document-text" size={22} color="white" />
                  <Text className="text-white font-bold text-lg tracking-wide">
                    Health Records
                  </Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Carousel Dots - Bottom of Screen */}
        <View className="items-center py-4">
          <View className="flex-row gap-2">
            {pets.map((_, index) => (
              <View
                key={index}
                className="rounded-full"
                style={{
                  width: 10,
                  height: 10,
                  backgroundColor:
                    index === currentPetIndex
                      ? "#5FC4C0"
                      : "rgba(95, 196, 192, 0.3)",
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
  );
}
