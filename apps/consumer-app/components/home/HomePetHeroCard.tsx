import PrivateImage from "@/components/common/PrivateImage";
import { useTheme } from "@/context/themeContext";
import type { Pet } from "@/context/petsContext";
import { usePetPhotoUpload } from "@/hooks/usePetPhotoUpload";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const HERO_HEIGHT = 200;

type Props = {
  pet: Pet;
  streakDays?: number;
};

export default function HomePetHeroCard({ pet, streakDays = 0 }: Props) {
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const { uploading, promptPhotoUpload } = usePetPhotoUpload(pet);

  const showStreakBadge = streakDays >= 3;

  const borderStyle =
    Platform.OS === "android"
      ? {}
      : {
          borderWidth: 1 as const,
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        };

  return (
    <View
      style={{
        marginHorizontal: 20,
        marginBottom: 12,
        borderRadius: 22,
        overflow: "hidden",
        backgroundColor: isDark ? "#14171c" : "#1A1E25",
        ...borderStyle,
      }}
    >
      <View style={{ height: HERO_HEIGHT, position: "relative" }}>
        {pet.photo_url ? (
          <PrivateImage
            bucketName="pets"
            filePath={pet.photo_url}
            style={{ width: "100%", height: HERO_HEIGHT }}
            resizeMode="cover"
          />
        ) : (
          <Pressable
            onPress={promptPhotoUpload}
            style={{
              flex: 1,
              height: HERO_HEIGHT,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "#1e2228" : "#2a2e35",
            }}
            accessibilityRole="button"
            accessibilityLabel={`Add a photo of ${pet.name}`}
          >
            <Ionicons name="camera-outline" size={40} color="rgba(255,255,255,0.55)" />
            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                fontWeight: "600",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              {`Add ${pet.name}'s photo`}
            </Text>
          </Pressable>
        )}

        <LinearGradient
          colors={["rgba(10,11,14,0)", "rgba(11,13,17,0.55)", "rgba(11,13,17,0.92)"]}
          locations={[0.25, 0.55, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            bottom: 0,
          }}
          pointerEvents="none"
        />

        {uploading ? (
          <View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 3,
            }}
          >
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : null}

        {showStreakBadge ? (
          <View
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              right: pet.photo_url ? 52 : 12,
              zIndex: 2,
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 24,
              backgroundColor: "rgba(8,9,11,0.42)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
              alignSelf: "flex-start",
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: "#fff" }} numberOfLines={1}>
              {`🔥 ${streakDays}-day streak`}
            </Text>
          </View>
        ) : null}

        {pet.photo_url ? (
          <TouchableOpacity
            onPress={promptPhotoUpload}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change pet photo"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 2,
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(8,9,11,0.42)",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.14)",
            }}
          >
            <Ionicons name="camera-outline" size={17} color="#fff" />
          </TouchableOpacity>
        ) : null}

        <View
          style={{
            position: "absolute",
            left: 18,
            right: 18,
            bottom: 14,
            zIndex: 2,
          }}
        >
          <Text
            style={{
              fontSize: 25,
              fontWeight: "800",
              letterSpacing: -0.6,
              color: "#fff",
              textShadowColor: "rgba(0,0,0,0.7)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 12,
            }}
          >
            {`How's ${pet.name} today?`}
          </Text>
        </View>
      </View>
    </View>
  );
}
