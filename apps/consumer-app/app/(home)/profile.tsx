import BottomNavBar from "@/components/home/BottomNavBar";
import PrivateImage from "@/components/common/PrivateImage";
import PetPassportOnboardingModal from "@/components/onboarding/PetPassportOnboardingModal";
import { LogOutConfirmModal } from "@/components/profile/LogOutConfirmModal";
import { ProfileEditModal } from "@/components/profile/ProfileEditModal";
import { ProfileFigmaRow, ProfileSectionHeading } from "@/components/profile/ProfileFigmaRow";
import { ProfileHeroCard } from "@/components/profile/ProfileHeroCard";
import { ProfileListCard } from "@/components/profile/ProfileListCard";
import { ProfilePetPickerModal } from "@/components/profile/ProfilePetPickerModal";
import ProfileJournalReminderSection from "@/components/profile/ProfileJournalReminderSection";
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
import { useOnboarding } from "@/context/onboardingContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useTheme } from "@/context/themeContext";
import { invokeDeleteAccount } from "@/services/accountDeletion";
import { getUserProfile, updateUserProfile } from "@/services/userProfile";
import { hasSeenPetPassportOnboarding } from "@/utils/onboardingStorage";
import { supabase } from "@/utils/supabase";
import {
  profileEmailDisplayForHero,
  resolveProfileHeroDisplayName,
} from "@/utils/userDisplayIdentity";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile() {
  const { theme, mode, toggleTheme } = useTheme();
  const { top } = useSafeAreaInsets();
  const isDarkMode = mode === "dark";
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { pets } = usePets();
  const { selectedPet, selectedPetId, setSelectedPetId } = useSelectedPet();
  const { resetOnboarding, setPostPetCreationRoute } = useOnboarding();
  const queryClient = useQueryClient();

  const screenTokens = useMemo(() => getProfileScreenTokens(theme, isDarkMode), [theme, isDarkMode]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPhone, setEditingPhone] = useState("");
  const [editingAddress, setEditingAddress] = useState("");
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showPetPassportOnboarding, setShowPetPassportOnboarding] = useState(false);

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

  const handleSignOutPress = () => {
    setShowLogOutModal(true);
  };

  const handleConfirmSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setShowLogOutModal(false);
      router.replace("/");
    } catch (e: unknown) {
      console.error(e);
      Alert.alert("Error", "Failed to log out");
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    void (async () => {
      const hasSeen = await hasSeenPetPassportOnboarding();
      if (!hasSeen && !cancelled) {
        timeoutId = setTimeout(() => {
          if (!cancelled) setShowPetPassportOnboarding(true);
        }, 500);
      }
    })();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      const { error } = await invokeDeleteAccount(supabase);
      if (error) throw error;
      await signOut();
      router.replace("/");
    } catch (error: unknown) {
      console.error("Error deleting account:", error);
      const message = error instanceof Error ? error.message : "Failed to delete account. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const showFinalAccountDeletionConfirmation = () => {
    Alert.alert(
      "Final Confirmation",
      "This action cannot be undone. All your data will be permanently deleted and your pet email addresses will stop working immediately.\n\nAre you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete My Account", style: "destructive", onPress: performAccountDeletion },
      ]
    );
  };

  const showFirstAccountDeletionConfirmation = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account?\n\nThis will permanently delete:\n• All your pets and their health records\n• Pet email addresses (they will no longer receive emails)\n• All messages and conversations\n• Your profile and preferences",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Continue", style: "destructive", onPress: showFinalAccountDeletionConfirmation },
      ]
    );
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeletingAccount(true);
    try {
      const { data: pendingTransfers, error } = await supabase
        .from("pet_transfers")
        .select(
          `
          id,
          code,
          pets!inner(name)
        `
        )
        .eq("from_user_id", user.id)
        .eq("is_active", true);

      if (error) {
        throw new Error(error.message || "Failed to check pending transfers");
      }

      setIsDeletingAccount(false);

      if (pendingTransfers && pendingTransfers.length > 0) {
        const transfersList = pendingTransfers
          .map((t) => {
            const petName =
              (t as { pets?: { name?: string } }).pets?.name || "Unknown Pet";
            return `• ${petName} (Code: ${(t as { code?: string }).code})`;
          })
          .join("\n");

        Alert.alert(
          "Pending Pet Transfers",
          `You have ${pendingTransfers.length} active pet transfer(s) that will be cancelled:\n\n${transfersList}\n\nOnce your account is deleted, these transfer codes will no longer work and the recipients won't be able to claim the pets.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Continue Anyway", style: "destructive", onPress: showFirstAccountDeletionConfirmation },
          ]
        );
      } else {
        showFirstAccountDeletionConfirmation();
      }
    } catch (error: unknown) {
      setIsDeletingAccount(false);
      console.error("Error checking pending transfers:", error);
      showFirstAccountDeletionConfirmation();
    }
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
      "Your pet health data is protected by industry-standard security. For questions about data use, contact support from Help & Support."
    );
  };

  const settingsRowHandlers: Record<ProfileSettingsRowId, () => void> = {
    notifications: openNotificationsSettings,
    privacy: openPrivacyInfo,
    appearance: () => toggleTheme(),
  };

  const helpRowHandlers: Record<ProfileHelpRowId, () => void> = {
    contact: () => router.push("/(home)/contact"),
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
  const heroName = resolveProfileHeroDisplayName(profile?.full_name, user);
  const emailHero = profileEmailDisplayForHero(profile?.email ?? user?.email ?? null);

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

      <View className="px-5 pb-3" style={{ paddingTop: top + 8 }}>
        <Text className="text-3xl font-bold" style={{ color: theme.foreground }}>
          Profile
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <ProfileHeroCard
          profile={profile}
          displayName={heroName.displayName}
          hideNameLockedBadge={heroName.hideNameLockedBadge}
          emailDisplayPrimary={emailHero.primary}
          emailRelayRaw={emailHero.relayAddress}
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
              onPress={() => {
                if (row.id === "add") {
                  resetOnboarding();
                  setPostPetCreationRoute("/(home)/profile");
                  router.push(row.href);
                  return;
                }
                if (row.id === "details") {
                  if (pets.length === 0) {
                    Alert.alert("No pets yet", "Add a pet first to view and edit a pet profile.");
                    return;
                  }
                  router.push("/(home)/pet-profile");
                  return;
                }
                router.push(row.href);
              }}
            />
          ))}
        </ProfileListCard>

        <ProfileJournalReminderSection />

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
            onPress={handleSignOutPress}
          />
        </ProfileListCard>

        <View className="mt-8 px-1">
          <Text className="text-sm font-medium mb-3 uppercase tracking-wide" style={{ color: "#EF4444" }}>
            Danger zone
          </Text>
          <Pressable
            onPress={handleDeleteAccount}
            disabled={isDeletingAccount}
            className="rounded-2xl py-4 px-6 items-center justify-center active:opacity-80"
            style={{
              backgroundColor: isDeletingAccount ? "#FCA5A520" : "#EF444420",
              borderWidth: 1,
              borderColor: "#EF4444",
              opacity: isDeletingAccount ? 0.7 : 1,
            }}
          >
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <View className="flex-row items-center">
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
                <Text className="text-base font-semibold ml-2" style={{ color: "#EF4444" }}>
                  Delete account
                </Text>
              </View>
            )}
          </Pressable>
          <Text className="text-xs mt-2 text-center" style={{ color: theme.foreground, opacity: 0.55 }}>
            Permanently deletes your account and all associated data.
          </Text>
        </View>
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

      <LogOutConfirmModal
        visible={showLogOutModal}
        onClose={() => {
          if (!isSigningOut) setShowLogOutModal(false);
        }}
        onConfirm={handleConfirmSignOut}
        isSigningOut={isSigningOut}
      />

      <PetPassportOnboardingModal
        visible={showPetPassportOnboarding}
        onClose={() => setShowPetPassportOnboarding(false)}
      />
    </View>
  );
}
