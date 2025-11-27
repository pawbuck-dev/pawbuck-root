import AddPetCard from "@/components/home/AddPetCard";
import PetCard from "@/components/home/PetCard";
import { useAuth } from "@/context/authContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSharedValue } from "react-native-reanimated";
import Carousel, { Pagination } from "react-native-reanimated-carousel";

export default function Home() {
  const router = useRouter();

  const { theme, mode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { pets, loadingPets, addingPet } = usePets();
  const progress = useSharedValue<number>(0);

  // Add the "Add Pet" card to the carousel data
  const carouselData = useMemo<any[]>(() => {
    return [...pets, { isAddCard: true }];
  }, [pets]);

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

  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  if (addingPet) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color="#5FC4C0" />
        <Text className="mt-4 text-lg" style={{ color: theme.foreground }}>
          Adding your pet...
        </Text>
      </View>
    );
  }

  // Show loading state
  if (loadingPets) {
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

  return (
    <GestureHandlerRootView
      className="flex-1"
      style={{ backgroundColor: theme.background }}
    >
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View className="px-6 pt-24 pb-3 flex-row items-center justify-between">
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

      <View className="flex-1 flex-col items-center justify-center px-6">
        <Carousel
          data={carouselData}
          height={Dimensions.get("window").height * 0.8}
          loop={false}
          pagingEnabled={true}
          width={Dimensions.get("window").width}
          mode="parallax"
          modeConfig={{
            parallaxScrollingScale: 0.95,
            parallaxScrollingOffset: 23,
          }}
          onProgressChange={progress}
          renderItem={({ item, index }: { item: Pet; index: number }) => {
            if (index === carouselData.length - 1) {
              return <AddPetCard />;
            }
            return <PetCard pet={item as Pet} />;
          }}
        />
        <Pagination.Basic
          progress={progress}
          data={carouselData}
          dotStyle={{ backgroundColor: theme.secondary, borderRadius: 100 }}
          activeDotStyle={{ backgroundColor: theme.primary }}
          containerStyle={{ gap: 7 }}
        />
      </View>
    </GestureHandlerRootView>
  );
}
