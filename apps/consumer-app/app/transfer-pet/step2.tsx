import PrivateImage from "@/components/common/PrivateImage";
import { useAuth } from "@/context/authContext";
import { useSubscription } from "@/context/subscriptionContext";
import { useTheme } from "@/context/themeContext";
import { JOURNAL_DOMAIN_LABEL, subtypeLabel, type JournalDomain } from "@/constants/petJournal";
import {
  notifyPetTransferAccepted,
  notifyPetTransferDeclined,
} from "@/services/petTransferNotify";
import type { PetTransferPreviewPet, PetTransferPreviewPayload } from "@/services/petTransfers";
import {
  declinePetTransfer,
  fetchPetTransferPreview,
  PetTransferError,
  useTransferCode,
} from "@/services/petTransfers";
import { formatPetInboundEmail } from "@/utils/petEmail";
import { authResumeParamsForNavigation } from "@/utils/authResumeParams";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

function approximateAgeLabel(dob: string | null): string {
  if (!dob) return "";
  const birth = new Date(`${dob}T12:00:00Z`);
  if (Number.isNaN(birth.getTime())) return "";
  const diff = Date.now() - birth.getTime();
  const years = Math.floor(diff / (365.25 * 86400000));
  if (years < 1) {
    const months = Math.max(0, Math.floor(diff / (30.44 * 86400000)));
    return months <= 0 ? "Under 1 month" : `${months} mo`;
  }
  return `${years} yr`;
}

export default function TransferPetStep2() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, mode } = useTheme();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { openPaywall } = useSubscription();
  const isDarkMode = mode === "dark";
  const { transferCode } = useLocalSearchParams<{ transferCode: string }>();
  const [transferring, setTransferring] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [previewPet, setPreviewPet] = useState<PetTransferPreviewPet | null>(null);
  const [previewFull, setPreviewFull] = useState<PetTransferPreviewPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [parentDisplayName, setParentDisplayName] = useState("");

  const defaultParentName = useMemo(() => {
    const meta = user?.user_metadata as { full_name?: string } | undefined;
    const fromMeta = typeof meta?.full_name === "string" ? meta.full_name.trim() : "";
    if (fromMeta) return fromMeta;
    const em = user?.email?.split("@")[0];
    return em ?? "";
  }, [user]);

  useEffect(() => {
    if (defaultParentName && !parentDisplayName) {
      setParentDisplayName(defaultParentName);
    }
  }, [defaultParentName, parentDisplayName]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated && transferCode) {
      Alert.alert(
        "Authentication Required",
        "You need to sign in or create an account to accept a pet transfer.",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => router.back(),
          },
          {
            text: "Sign Up",
            onPress: () => {
              router.replace({
                pathname: "/signup",
                params: authResumeParamsForNavigation({
                  returnTo: "/transfer-pet/step2",
                  transferCode,
                }),
              });
            },
          },
          {
            text: "Sign In",
            onPress: () => {
              router.replace({
                pathname: "/login",
                params: authResumeParamsForNavigation({
                  returnTo: "/transfer-pet/step2",
                  transferCode,
                }),
              });
            },
          },
        ]
      );
    }
  }, [isAuthenticated, authLoading, transferCode, router]);

  useEffect(() => {
    if (!transferCode || !isAuthenticated) {
      setPreviewLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const p = await fetchPetTransferPreview(transferCode);
        if (cancelled) return;
        if (!p) {
          setPreviewFull(null);
          setPreviewPet(null);
          setPreviewError("This transfer code is invalid or has expired.");
        } else {
          setPreviewFull(p);
          setPreviewPet(p.pet);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Error loading transfer preview:", error);
          setPreviewError(error instanceof Error ? error.message : "Could not load transfer");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transferCode, isAuthenticated]);

  const petEmail = previewPet
    ? formatPetInboundEmail(previewPet.email_id, previewPet.name)
    : "";

  const ageLabel = previewPet ? approximateAgeLabel(previewPet.date_of_birth) : "";

  const handleCancel = () => {
    router.back();
  };

  const handleDecline = () => {
    if (!transferCode) return;
    Alert.alert(
      "Decline transfer?",
      "The previous owner will need to send a new code if you change your mind.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setDeclining(true);
            try {
              await declinePetTransfer(transferCode);
              try {
                await notifyPetTransferDeclined(transferCode);
              } catch {
                /* non-blocking */
              }
              Alert.alert("Transfer declined", "You can close this screen.", [
                { text: "OK", onPress: () => router.replace("/(home)/profile") },
              ]);
            } catch (e: unknown) {
              Alert.alert(
                "Could not decline",
                e instanceof Error ? e.message : "Please try again."
              );
            } finally {
              setDeclining(false);
            }
          },
        },
      ]
    );
  };

  const handleTransferPet = () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Authentication Required",
        "Please sign in or create an account to accept the transfer."
      );
      return;
    }

    if (!transferCode) {
      Alert.alert("Error", "Transfer code is missing");
      return;
    }

    void (async () => {
        setTransferring(true);
        try {
          await useTransferCode(transferCode, parentDisplayName.trim() || null);
          try {
            await notifyPetTransferAccepted(transferCode);
          } catch {
            /* non-blocking */
          }
          await queryClient.invalidateQueries({ queryKey: ["pets"] });
          await queryClient.invalidateQueries({ queryKey: ["pet_transfer_history"] });
          await queryClient.invalidateQueries({ queryKey: ["pet_journal_transfer_highlights"] });
          router.replace({
            pathname: "/transfer-pet/step3",
            params: { transferCode },
          });
        } catch (error: unknown) {
          if (error instanceof PetTransferError) {
            if (error.code === "pet_limit") {
              openPaywall({ source: "pet_transfer_accept", requiredPlan: "family" });
              setTransferring(false);
              return;
            }
            if (error.code === "premium_required") {
              openPaywall({ source: "pet_transfer_accept", requiredPlan: "individual" });
              setTransferring(false);
              return;
            }
          }
          Alert.alert("Error", error instanceof Error ? error.message : "Failed to transfer pet");
          setTransferring(false);
        }
      })();
  };

  if (authLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      <View className="px-6 pt-14 pb-4">
        <View className="flex-row items-center justify-between mb-4">
          <Pressable
            onPress={handleCancel}
            className="flex-row items-center active:opacity-70"
          >
            <Ionicons name="close" size={24} color={theme.foreground} />
            <Text className="text-base ml-2" style={{ color: theme.foreground }}>
              Cancel
            </Text>
          </Pressable>
          <Text className="text-base" style={{ color: theme.foreground }}>
            Step 2 of 3
          </Text>
        </View>

        <View
          className="w-full h-1 rounded-full"
          style={{ backgroundColor: isDarkMode ? "#1F1F1F" : theme.border }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: "66.66%",
              backgroundColor: "#FF9500",
            }}
          />
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-6 py-6">
            <View className="items-center mb-6">
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-4"
                style={{
                  borderWidth: 2,
                  borderColor: "#FF9500",
                  backgroundColor: "rgba(255, 149, 0, 0.1)",
                }}
              >
                <MaterialCommunityIcons name="account-check" size={40} color="#FF9500" />
              </View>
              {previewPet?.photo_url ? (
                <View className="mb-4 h-28 w-28 overflow-hidden rounded-full">
                  <PrivateImage
                    bucketName="pets"
                    filePath={previewPet.photo_url}
                    className="h-28 w-28"
                    resizeMode="cover"
                  />
                </View>
              ) : null}
            </View>

            <Text
              className="text-3xl font-bold text-center mb-3"
              style={{ color: theme.foreground }}
            >
              Review transfer
            </Text>
            <Text className="text-base text-center mb-6" style={{ color: theme.secondary }}>
              {previewPet
                ? `You’re about to receive ${previewPet.name}${
                    previewPet.breed ? ` (${previewPet.breed})` : ""
                  }${ageLabel ? ` · ${ageLabel}` : ""}. After you accept, this pet appears on your dashboard with full access.`
                : previewLoading
                  ? "Loading pet summary…"
                  : "We could not load this transfer."}
            </Text>

            {previewLoading ? (
              <ActivityIndicator className="my-4" color={theme.primary} />
            ) : null}

            {previewError ? (
              <Text className="text-center mb-6 text-base" style={{ color: "#DC2626" }}>
                {previewError}
              </Text>
            ) : null}

            {previewFull && !previewError ? (
              <>
                {previewFull.highlights.length > 0 ? (
                  <View className="mb-6 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                    <Text className="text-sm font-semibold mb-3" style={{ color: theme.foreground }}>
                      Highlighted by previous owner
                    </Text>
                    {previewFull.highlights.map((h) => (
                      <View key={h.id} className="mb-3 border-b pb-3" style={{ borderBottomColor: theme.border }}>
                        <Text className="text-xs" style={{ color: theme.secondary }}>
                          {JOURNAL_DOMAIN_LABEL[h.domain as JournalDomain]} ·{" "}
                          {subtypeLabel(h.domain as JournalDomain, h.subtype)} · {h.entry_date}
                        </Text>
                        {h.note_preview ? (
                          <Text className="text-sm mt-1" style={{ color: theme.foreground }} numberOfLines={4}>
                            {h.note_preview}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                ) : null}

                <View className="mb-6 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                  <Text className="text-sm font-semibold mb-3" style={{ color: theme.foreground }}>
                    Health record summary
                  </Text>
                  <Text className="text-sm" style={{ color: theme.secondary }}>
                    Vaccinations on file: {previewFull.summary.vaccination_count}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: theme.secondary }}>
                    Active medication courses: {previewFull.summary.active_medication_count}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: theme.secondary }}>
                    Vet exams: {previewFull.summary.clinical_exam_count}
                  </Text>
                  <Text className="text-sm mt-1" style={{ color: theme.secondary }}>
                    Vault documents: {previewFull.summary.document_count}
                  </Text>
                </View>
              </>
            ) : null}

            {petEmail ? (
              <View className="mb-6 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
                <Text className="text-xs font-semibold mb-1" style={{ color: theme.secondary }}>
                  Pet email (permanent)
                </Text>
                <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
                  {petEmail}
                </Text>
                <Text className="text-xs mt-2" style={{ color: theme.secondary }}>
                  This address stays with the pet for inbound records. It cannot be changed.
                </Text>
              </View>
            ) : null}

            <View className="mb-6 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
              <Text className="text-sm font-semibold mb-2" style={{ color: theme.foreground }}>
                Pet parent display name
              </Text>
              <Text className="text-xs mb-2" style={{ color: theme.secondary }}>
                This is how your name appears on the pet profile. You can adjust it now; it stays fixed after
                acceptance.
              </Text>
              <TextInput
                value={parentDisplayName}
                onChangeText={setParentDisplayName}
                placeholder="Your name"
                placeholderTextColor={theme.secondary}
                style={{
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: Platform.OS === "ios" ? 12 : 8,
                  color: theme.foreground,
                  marginTop: 8,
                  backgroundColor: isDarkMode ? "rgba(255,255,255,0.06)" : theme.background,
                }}
              />
            </View>

            <View className="mb-4 rounded-xl p-4" style={{ backgroundColor: theme.card }}>
              <Text className="text-sm mb-2" style={{ color: theme.secondary }}>
                Transfer Code
              </Text>
              <Text className="text-lg font-semibold" style={{ color: theme.foreground }}>
                {transferCode}
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="px-6 pb-8 pt-4 gap-3">
        <Pressable
          onPress={handleTransferPet}
          disabled={transferring || declining || previewLoading || !!previewError || !previewFull}
          className="w-full rounded-2xl py-5 items-center active:opacity-90"
          style={{
            backgroundColor:
              transferring || declining || previewLoading || !!previewError || !previewFull
                ? isDarkMode
                  ? "#374151"
                  : theme.border
                : "#FF9500",
            opacity:
              transferring || declining || previewLoading || !!previewError || !previewFull ? 0.6 : 1,
          }}
        >
          {transferring ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-lg font-semibold" style={{ color: "#FFFFFF" }}>
              Accept Transfer
            </Text>
          )}
        </Pressable>
        <Pressable
          onPress={handleDecline}
          disabled={transferring || declining || previewLoading || !!previewError || !previewFull}
          className="w-full rounded-2xl py-4 items-center border active:opacity-90"
          style={{
            borderColor: theme.border,
            opacity:
              transferring || declining || previewLoading || !!previewError || !previewFull ? 0.5 : 1,
          }}
        >
          {declining ? (
            <ActivityIndicator size="small" color={theme.foreground} />
          ) : (
            <Text className="text-base font-semibold" style={{ color: theme.foreground }}>
              Decline
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
