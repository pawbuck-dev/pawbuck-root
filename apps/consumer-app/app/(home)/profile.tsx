import BottomNavBar from "@/components/home/BottomNavBar";
import PrivateImage from "@/components/common/PrivateImage";
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
import { useAddPetNavigation } from "@/hooks/useAddPetNavigation";
import { useSubscription } from "@/context/subscriptionContext";
import { usePets } from "@/context/petsContext";
import { useSelectedPet } from "@/context/selectedPetContext";
import PlanComparisonModal from "@/components/subscription/PlanComparisonModal";
import { themeModeLabel, useTheme } from "@/context/themeContext";
import { resolveProfileEditPhotoPreview } from "@/utils/profilePhotoPreview";
import { cancelAccountDeletion, getAccountDeletionStatus, invokeDeleteAccount } from "@/services/accountDeletion";
import { resolveAuthDisplayName, isPlausibleDisplayNameForGreeting } from "@/services/authDisplayName";
import { userHasEmailPasswordIdentity } from "@/services/authPasswordReset";
import { restoreRevenueCatPurchases } from "@/services/revenuecat";
import { getUserProfile, updateUserProfile } from "@/services/userProfile";
import { getPrivateImageUrl } from "@/utils/image";
import { pickImageFromLibrary, takePhoto } from "@/utils/imagePicker";
import { requestPrivacyExportWithAlerts } from "@/utils/privacyExportUi";
import { openStoreSubscriptionSettings } from "@/utils/storeSubscriptions";
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
  const { theme, mode, themeMode } = useTheme();
  const { top } = useSafeAreaInsets();
  const isDarkMode = mode === "dark";
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { setPostPetCreationRoute } = useOnboarding();
  const { navigateToAddPet } = useAddPetNavigation();
  const { pets } = usePets();
  const { selectedPet, selectedPetId, setSelectedPetId } = useSelectedPet();
  const { plan, isFoundingMember, openPaywall, refetchEntitlement } = useSubscription();
  const queryClient = useQueryClient();

  const planLabel =
    plan === "family" ? "Family" : plan === "individual" ? "Individual" : "Free";

  const screenTokens = useMemo(() => getProfileScreenTokens(theme, isDarkMode), [theme, isDarkMode]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");
  const [editingAddress, setEditingAddress] = useState("");
  const [pendingPhotoUri, setPendingPhotoUri] = useState<string | null>(null);
  const [storedPhotoPreviewUri, setStoredPhotoPreviewUri] = useState<string | null>(null);
  const [clearProfilePhoto, setClearProfilePhoto] = useState(false);
  const [showPetPicker, setShowPetPicker] = useState(false);
  const [showLogOutModal, setShowLogOutModal] = useState(false);
  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deletionScheduled, setDeletionScheduled] = useState(false);
  const [deletionPurgeAfter, setDeletionPurgeAfter] = useState<string | null>(null);
  const [isCancellingDeletion, setIsCancellingDeletion] = useState(false);
  const [isRestoringPurchases, setIsRestoringPurchases] = useState(false);
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

  const handleEdit = async () => {
    if (profile) {
      const fromPrefs = profile.full_name?.trim() ?? "";
      const fromAuth = resolveAuthDisplayName(user);
      const initial =
        (fromPrefs && isPlausibleDisplayNameForGreeting(fromPrefs) ? fromPrefs : "") ||
        (isPlausibleDisplayNameForGreeting(fromAuth) ? fromAuth : "");
      setEditingName(initial);
      setEditingPhone(profile.phone || "");
      setEditingAddress(profile.address || "");
      setPendingPhotoUri(null);
      setClearProfilePhoto(false);
      if (profile.profile_photo_path) {
        const signed = await getPrivateImageUrl(profile.profile_photo_path);
        setStoredPhotoPreviewUri(signed);
      } else {
        setStoredPhotoPreviewUri(null);
      }
      setShowEditModal(true);
    }
  };

  const handleChangePhoto = () => {
    Alert.alert("Profile photo", "Choose a source", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Take photo",
        onPress: () => {
          void (async () => {
            const asset = await takePhoto();
            if (asset?.uri) {
              setPendingPhotoUri(asset.uri);
              setClearProfilePhoto(false);
            }
          })();
        },
      },
      {
        text: "Photo library",
        onPress: () => {
          void (async () => {
            const asset = await pickImageFromLibrary();
            if (asset?.uri) {
              setPendingPhotoUri(asset.uri);
              setClearProfilePhoto(false);
            }
          })();
        },
      },
    ]);
  };

  const handleRemovePhoto = () => {
    setPendingPhotoUri(null);
    setStoredPhotoPreviewUri(null);
    setClearProfilePhoto(true);
  };

  const handleSave = () => {
    const trimmedName = editingName.trim();
    if (!trimmedName) {
      Alert.alert("Name required", "Enter your name to save profile changes.");
      return;
    }
    if (!isPlausibleDisplayNameForGreeting(trimmedName)) {
      Alert.alert(
        "Name",
        "Use a readable name (letters and spaces). Sign-in handles cannot be used as your display name."
      );
      return;
    }
    updateMutation.mutate({
      full_name: trimmedName,
      phone: editingPhone.trim() || null,
      address: editingAddress.trim() || null,
      ...(clearProfilePhoto ? { clear_profile_photo: true } : {}),
      ...(pendingPhotoUri ? { new_profile_photo_uri: pendingPhotoUri } : {}),
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

  const performAccountDeletion = async () => {
    setIsDeletingAccount(true);
    try {
      const { error, purgeAfter } = await invokeDeleteAccount(supabase);
      if (error) throw error;
      setDeletionScheduled(true);
      setDeletionPurgeAfter(purgeAfter ?? null);
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
      "Your account will be scheduled for deletion in 7 days. You can cancel anytime before then from Profile after signing back in.\n\nAfter the grace period, all data is permanently removed.\n\nAre you absolutely sure?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete My Account", style: "destructive", onPress: performAccountDeletion },
      ]
    );
  };

  const showFirstAccountDeletionConfirmation = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account?\n\nAfter a 7-day grace period we permanently delete:\n• All your pets and their health records\n• Pet email addresses\n• All messages and conversations\n• Your profile and preferences",
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

  const openPushPermissionsSettings = () => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        "Push permissions",
        "Open your device Settings app to manage notification permissions for PawBuck."
      );
    });
  };

  const handleRestorePurchases = async () => {
    setIsRestoringPurchases(true);
    try {
      const restoredPlan = await restoreRevenueCatPurchases();
      await refetchEntitlement();
      if (restoredPlan) {
        const label = restoredPlan === "family" ? "Family" : "Individual";
        Alert.alert("Purchases restored", `Your ${label} plan is active.`);
      } else {
        Alert.alert(
          "No purchases found",
          "We couldn't find an active subscription linked to this store account."
        );
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Could not restore purchases. Please try again.";
      Alert.alert("Restore failed", message);
    } finally {
      setIsRestoringPurchases(false);
    }
  };

  const settingsRowHandlers: Record<ProfileSettingsRowId, () => void> = {
    "notification-center": () => router.push("/(home)/notifications" as never),
    notifications: openPushPermissionsSettings,
    "download-data": () => void requestPrivacyExportWithAlerts(),
    privacy: () => router.push("/(home)/privacy-settings" as never),
    "change-password": () => router.push({ pathname: "/reset-password", params: { mode: "change" } }),
    appearance: () => router.push("/(home)/appearance-settings" as never),
  };

  const visibleSettingsRows = useMemo(
    () =>
      PROFILE_SETTINGS_ROWS.filter(
        (row) => row.id !== "change-password" || userHasEmailPasswordIdentity(user)
      ),
    [user]
  );

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

  useEffect(() => {
    if (!user?.id) return;
    void (async () => {
      const { data } = await getAccountDeletionStatus(supabase);
      setDeletionScheduled(Boolean(data?.scheduled));
      setDeletionPurgeAfter(data?.purge_after ?? null);
    })();
  }, [user?.id]);

  const handleCancelAccountDeletion = async () => {
    setIsCancellingDeletion(true);
    try {
      const { error, cancelled } = await cancelAccountDeletion(supabase);
      if (error) throw error;
      if (cancelled) {
        setDeletionScheduled(false);
        setDeletionPurgeAfter(null);
        Alert.alert("Deletion cancelled", "Your account will remain active.");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to cancel deletion. Please try again.";
      Alert.alert("Error", message);
    } finally {
      setIsCancellingDeletion(false);
    }
  };

  const showOAuthAvatar = !!rawAvatar && !avatarLoadFailed && !profile?.profile_photo_path;
  const photoPreviewUri = resolveProfileEditPhotoPreview({
    pendingPhotoUri,
    storedPhotoPreviewUri: clearProfilePhoto ? null : storedPhotoPreviewUri,
    oauthAvatarUrl: rawAvatar,
    showOAuthAvatar,
  });
  const showRemovePhoto =
    Boolean(profile?.profile_photo_path || pendingPhotoUri) && !clearProfilePhoto;
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
          profilePhotoPath={profile.profile_photo_path}
          oauthAvatarUrl={rawAvatar}
          showOAuthAvatar={showOAuthAvatar}
          onAvatarError={() => setAvatarLoadFailed(true)}
          onEditPress={() => void handleEdit()}
        />

        <ProfileSectionHeading>Subscription</ProfileSectionHeading>
        <ProfileListCard>
          <ProfileFigmaRow
            icon="sparkles-outline"
            title={isFoundingMember ? "Founding Member" : planLabel}
            subtitle={
              isFoundingMember
                ? "Lifetime access — thank you for building PawBuck with us"
                : plan === "free"
                  ? "Current plan: Free · Compare Individual or Family plans"
                  : `Current plan: ${planLabel} · Manage in App Store or Google Play`
            }
            onPress={() => {
              if (plan === "free") {
                setShowPlanComparison(true);
              } else {
                openStoreSubscriptionSettings();
                void refetchEntitlement();
              }
            }}
          />
          <ProfileFigmaRow
            icon="refresh-outline"
            title="Restore purchases"
            subtitle={
              isRestoringPurchases
                ? "Checking App Store or Google Play…"
                : "Recover a subscription bought on this device"
            }
            onPress={() => {
              if (!isRestoringPurchases) void handleRestorePurchases();
            }}
          />
        </ProfileListCard>

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
            subtitle="Switch active pet"
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
                  setPostPetCreationRoute("/(home)/profile");
                  navigateToAddPet(true);
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
          {visibleSettingsRows.map((row) => (
            <ProfileFigmaRow
              key={row.id}
              icon={row.icon}
              title={row.title}
              subtitle={row.id === "appearance" ? themeModeLabel(themeMode) : row.subtitle}
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
          {deletionScheduled ? (
            <>
              <Pressable
                onPress={handleCancelAccountDeletion}
                disabled={isCancellingDeletion}
                className="rounded-2xl py-4 px-6 items-center justify-center active:opacity-80"
                style={{
                  backgroundColor: "#F59E0B20",
                  borderWidth: 1,
                  borderColor: "#F59E0B",
                  opacity: isCancellingDeletion ? 0.7 : 1,
                }}
              >
                {isCancellingDeletion ? (
                  <ActivityIndicator size="small" color="#F59E0B" />
                ) : (
                  <Text className="text-base font-semibold" style={{ color: "#F59E0B" }}>
                    Cancel scheduled deletion
                  </Text>
                )}
              </Pressable>
              <Text className="text-xs mt-2 text-center" style={{ color: theme.foreground, opacity: 0.55 }}>
                Deletion scheduled
                {deletionPurgeAfter ? ` for ${new Date(deletionPurgeAfter).toLocaleDateString()}` : " in 7 days"}.
              </Text>
            </>
          ) : (
            <>
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
                Schedules deletion in 7 days; cancel anytime before then.
              </Text>
            </>
          )}
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
        editingName={editingName}
        setEditingName={setEditingName}
        editingPhone={editingPhone}
        setEditingPhone={setEditingPhone}
        editingAddress={editingAddress}
        setEditingAddress={setEditingAddress}
        photoPreviewUri={photoPreviewUri}
        onChangePhotoPress={handleChangePhoto}
        onRemovePhotoPress={handleRemovePhoto}
        showRemovePhoto={showRemovePhoto}
        onSave={handleSave}
        isSaving={updateMutation.isPending}
      />

      <PlanComparisonModal
        visible={showPlanComparison}
        onClose={() => setShowPlanComparison(false)}
        currentPlan={plan}
        readOnly={false}
        onSubscribe={(targetPlan) => {
          setShowPlanComparison(false);
          openPaywall({ source: "profile_plan_compare", requiredPlan: targetPlan });
        }}
      />

      <LogOutConfirmModal
        visible={showLogOutModal}
        onClose={() => {
          if (!isSigningOut) setShowLogOutModal(false);
        }}
        onConfirm={handleConfirmSignOut}
        isSigningOut={isSigningOut}
      />

    </View>
  );
}
