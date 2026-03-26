import BottomNavBar from "@/components/home/BottomNavBar";
import ContactModal from "@/components/contact/ContactModal";
import PrivateImage from "@/components/common/PrivateImage";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { ProfileFigmaRow, ProfileSectionHeading } from "@/components/profile/ProfileFigmaRow";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileListCard } from "@/components/profile/ProfileListCard";
import { ProfilePetPickerModal } from "@/components/profile/ProfilePetPickerModal";
import {
  PROFILE_HELP_ROWS,
  PROFILE_MY_PETS_LINK_ROWS,
  PROFILE_SETTINGS_ROWS,
  type ProfileHelpRowId,
  type ProfileSettingsRowId,
} from "@/components/profile/profileMenuConfig";
import { getProfileScreenTokens } from "@/components/profile/profileUiTokens";
import { isHttpAvatarUrl } from "@/components/profile/profileUtils";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { getUserProfile, updateUserProfile } from "@/services/userProfile";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Linking, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  const { theme, mode, toggleTheme } = useTheme();
  const { top } = useSafeAreaInsets();
  const isDarkMode = mode === "dark";
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { pets } = usePets();
  const { selectedPet, selectedPetId, setSelectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();

  const screenTokens = useMemo(() => getProfileScreenTokens(theme, isDarkMode), [theme, isDarkMode]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState("");
  const [editingAddress, setEditingAddress] = useState("");
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["user_profile"],
    queryFn: getUserProfile,
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: updateUserProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user_profile"] });
      queryClient.invalidateQueries({ queryKey: ["user_preferences"] });
      setShowEditModal(false);
      Alert.alert("Success", "Profile updated successfully");
    },
    onError: (error) => {
      Alert.alert("Error", "Failed to update profile");
      console.error("Error updating profile:", error);
    },
  });

  const handleEdit = () => {
    if (profile) {
      setEditingPhone(profile.phone || "");
      setEditingAddress(profile.address || "");
      setShowEditModal(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      phone: editingPhone.trim() || null,
      address: editingAddress.trim() || null,
    });
  };

  const handleSignOut = () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (e: unknown) {
            console.error(e);
            Alert.alert("Error", "Failed to log out");
          }
        },
      },
    ]);
  };

  const openNotificationsSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        "Notifications",
        "Open your device Settings app to manage notification permissions for PawBuck."
      );
    });
  };

  const openPrivacyInfo = () => {
    Alert.alert(
      "Privacy & security",
      "Your pet health data is protected by industry-standard security. For questions about data use, see our FAQ or contact support."
    );
  };

  const settingsRowHandlers: Record<ProfileSettingsRowId, () => void> = {
    notifications: openNotificationsSettings,
    privacy: openPrivacyInfo,
    appearance: () => toggleTheme(),
  };

  const helpRowHandlers: Record<ProfileHelpRowId, () => void> = {
    faq: () => router.push("/(home)/faq"),
    contact: () => setShowContactModal(true),
  };

  const rawAvatar = useMemo(() => {
    const a = user?.user_metadata?.avatar_url as string | undefined;
    const p = user?.user_metadata?.picture as string | undefined;
    if (isHttpAvatarUrl(a)) return a.trim();
    if (isHttpAvatarUrl(p)) return p.trim();
    return undefined;
  }, [user?.user_metadata?.avatar_url, user?.user_metadata?.picture]);

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [rawAvatar, user?.id]);

  const showAvatarPhoto = !!rawAvatar && !avatarLoadFailed;
  const currentPet = selectedPet ?? pets[0] ?? null;
  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <View className="px-5 pb-3 flex-row items-center justify-between" style={{ paddingTop: top + 8 }}>
        <Text className="text-3xl font-bold" style={{ color: theme.foreground }}>
          Profile
        </Text>
        <TouchableOpacity
          onPress={() => router.push("/(home)/settings")}
          className="w-11 h-11 rounded-full items-center justify-center"
          style={{
            backgroundColor: screenTokens.profileCardBg,
            ...screenTokens.profileCardBorderStyle,
          }}
          accessibilityLabel="More settings"
        >
          <Ionicons name="settings-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <ProfileHeroCard
          profile={profile}
          displayName={displayName}
          rawAvatar={rawAvatar}
          showAvatarPhoto={showAvatarPhoto}
          onAvatarError={() => setAvatarLoadFailed(true)}
          onEditPress={handleEdit}
        />

        <ProfileSectionHeading>My Pets</ProfileSectionHeading>
        {/* Current pet — own card (Figma / light ref: separate from action rows) */}
        <ProfileListCard>
          <ProfileFigmaRow
            trailing="down"
            trailingCircled
            leading={
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  overflow: "hidden",
                  backgroundColor: screenTokens.profileListIconWellBg,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {currentPet?.photo_url ? (
                  <PrivateImage
                    bucketName="pets"
                    filePath={currentPet.photo_url}
                    style={{ width: 52, height: 52 }}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="paw" size={22} color={screenTokens.profileListIconColor} />
                )}
              </View>
            }
            title={currentPet?.name ?? "No pet yet"}
            subtitle="Current pet profile"
            onPress={() => pets.length > 0 && setShowPetPicker(true)}
          />
        </ProfileListCard>
        <ProfileListCard style={{ marginTop: 14 }}>
          {PROFILE_MY_PETS_LINK_ROWS.map((row) => (
            <ProfileFigmaRow
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              onPress={() => router.push(row.href)}
            />
          ))}
        </ProfileListCard>

        <ProfileSectionHeading>Settings</ProfileSectionHeading>
        <ProfileListCard>
          {PROFILE_SETTINGS_ROWS.map((row) => (
            <ProfileFigmaRow
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              onPress={settingsRowHandlers[row.id]}
            />
          ))}
        </ProfileListCard>

        <ProfileSectionHeading>Help & Support</ProfileSectionHeading>
        <ProfileListCard>
          {PROFILE_HELP_ROWS.map((row) => (
            <ProfileFigmaRow
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.subtitle}
              onPress={helpRowHandlers[row.id]}
            />
          ))}
        </ProfileListCard>

        <ProfileListCard style={{ marginTop: 24 }}>
          <ProfileFigmaRow
            icon="logout-variant"
            title="Log Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
          />
        </ProfileListCard>
      </ScrollView>

      <BottomNavBar activeTab="profile" />

      <ProfilePetPickerModal
        visible={showPetPicker}
        onClose={() => setShowPetPicker(false)}
        pets={pets}
        selectedPetId={selectedPetId}
        onSelectPet={(id) => {
          setSelectedPetId(id);
          setShowPetPicker(false);
        }}
      />

      <ContactModal visible={showContactModal} onClose={() => setShowContactModal(false)} />

      <ProfileEditModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        topInset={top}
        editingPhone={editingPhone}
        setEditingPhone={setEditingPhone}
        editingAddress={editingAddress}
        setEditingAddress={setEditingAddress}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />
    </View>
  );
}
