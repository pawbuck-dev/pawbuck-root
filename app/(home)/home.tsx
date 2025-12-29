import { MiloChatButton } from "@/components/chat/MiloChatButton";
import { MiloChatModal } from "@/components/chat/MiloChatModal";
import AddPetCard from "@/components/home/AddPetCard";
import PetCard from "@/components/home/PetCard";
import { ChatProvider } from "@/context/chatContext";
import { useEmailApproval } from "@/context/emailApprovalContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useFocusEffect } from "@react-navigation/native";
import { useQueryClient } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useMemo, useRef } from "react";
import { ActivityIndicator, Dimensions, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";
import Carousel, { Pagination } from "react-native-reanimated-carousel";

export default function Home() {
  const { theme, mode } = useTheme();
  const { pets, loadingPets, addingPet } = usePets();
  const { refreshPendingApprovals } = useEmailApproval();
  const queryClient = useQueryClient();
  const progress = useSharedValue<number>(0);
  const currentIndexRef = useRef<number>(0);

  // Add the "Add Pet" card to the carousel data
  const carouselData = useMemo<any[]>(() => {
    return [...pets, { isAddCard: true }];
  }, [pets]);

  // Function to invalidate queries for a specific pet
  const invalidatePetQueries = useCallback(
    (pet: Pet) => {
      if (pet) {
        queryClient.invalidateQueries({ queryKey: ["vaccinations", pet.id] });
        queryClient.invalidateQueries({ queryKey: ["medicines", pet.id] });
      }
    },
    [queryClient]
  );

  // Refetch data for the currently visible pet when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const currentPet = pets[currentIndexRef.current];
      if (currentPet) {
        invalidatePetQueries(currentPet);
      }
      // Check for pending email approvals
      refreshPendingApprovals();
    }, [pets, invalidatePetQueries, refreshPendingApprovals])
  );

  // Handle carousel snap to invalidate queries for the new pet
  const handleSnapToItem = useCallback(
    (index: number) => {
      currentIndexRef.current = index;
      const newPet = pets[index];
      if (newPet) {
        invalidatePetQueries(newPet);
      }
    },
    [pets, invalidatePetQueries]
  );

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
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        {/* Minimal spacer for status bar */}
        <View className="pt-4" />

        <View className="flex-1 flex-col items-center justify-center">
          <Carousel
            data={carouselData}
            height={Dimensions.get("window").height * 0.85}
            loop={false}
            pagingEnabled={true}
            width={Dimensions.get("window").width}
            mode="parallax"
            modeConfig={{
              parallaxScrollingScale: 0.95,
              parallaxScrollingOffset: 23,
            }}
            onProgressChange={progress}
            onSnapToItem={handleSnapToItem}
            renderItem={({ item, index }: { item: Pet; index: number }) => {
              if (index === carouselData.length - 1) {
                return <AddPetCard />;
              }
              return (
                <View className="flex-1 px-5">
                  <PetCard pet={item as Pet} />
                </View>
              );
            }}
          />
          <Pagination.Basic
            progress={progress}
            data={carouselData}
            dotStyle={{ backgroundColor: theme.secondary, borderRadius: 100 }}
            activeDotStyle={{ backgroundColor: theme.primary }}
            containerStyle={{ gap: 7, marginBottom: 10 }}
          />
        </View>

        {/* Milo Chat */}
        <MiloChatButton />
        <MiloChatModal />
      </View>
    </ChatProvider>
  );
}
