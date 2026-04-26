import BottomNavBar from "@/components/home/BottomNavBar";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { usePets } from "@/context/petsContext";
import {
  cancelPetTransfer,
  createPetTransfer,
  getMyPetTransfers,
  getTransferPrepSnapshot,
  PetTransferWithPreview,
} from "@/services/petTransfers";
import { notifyPetTransferCreated } from "@/services/petTransferNotify";
import { fetchAllJournalEntriesForPet } from "@/services/petJournal";
import { subtypeLabel, type JournalDomain } from "@/constants/petJournal";
import { useSelectedPet } from "@/context/selectedPetContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TRANSFER_REASONS = [
  { id: "rehoming", label: "Rehoming" },
  { id: "family_transfer", label: "Family Transfer" },
  { id: "rescue_adoption", label: "Rescue / Adoption" },
  { id: "other", label: "Other" },
] as const;

type TransferReasonId = (typeof TRANSFER_REASONS)[number]["id"];
type FlowStep = "list" | "reason" | "verify" | "journal" | "share";

/** Incoming transfer codes remain valid for 14 days (product spec). */
const TRANSFER_EXPIRES_IN_DAYS = 14;

/** Figma Button/disable — "Yes, Generate Code" glass pill */
const MODAL_PRIMARY_GLASS_BG = "rgba(255, 255, 255, 0.1)";
const MODAL_PRIMARY_GLASS_INSET = "rgba(255, 255, 255, 0.08)";
const MODAL_PRIMARY_GLASS_RADIUS = 100;

/** Confirm Transfer modal — Figma --2xl / --modal-stroke / --modal-bg */
const CONFIRM_MODAL_RADIUS = 24;
const CONFIRM_MODAL_STROKE = "rgba(255, 255, 255, 0.06)";
const CONFIRM_MODAL_BG = "rgba(255, 255, 255, 0.1)";

/** Confirm modal Cancel — Figma --100 / Button-Outline-stroke */
const MODAL_CANCEL_BTN_RADIUS = 100;
const MODAL_CANCEL_OUTLINE_STROKE = "rgba(255, 255, 255, 0.2)";
const MODAL_CANCEL_OUTLINE_STROKE_LIGHT = "rgba(0, 0, 0, 0.2)";

function formatExpiryRemaining(expiresAt: string | null): string {
  if (!expiresAt) return "";
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  if (days >= 1) {
    return days === 1 ? "Expires in 1 day" : `Expires in ${days} days`;
  }
  const h = Math.floor(totalSec / 3600);
  if (h >= 1) return `Expires in ${h}h`;
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m <= 0) return `Expires in ${s}s`;
  return `Expires in ${m}m ${s.toString().padStart(2, "0")}s`;
}

const TRANSFER_INCLUDES = [
  "Medical records, vaccinations, labs, and visit history",
  "Pet Passport (breed, DOB, microchip, weight history)",
  "Behavioral profile and pet journal",
  "Uploaded documents (labs, certificates, etc.)",
  "Medication schedules",
  "Vet invoices and receipts (payment amounts redacted for the new owner)",
] as const;

const TRANSFER_EXCLUDES = [
  "Payment and billing history",
  "Insurance enrollment and policy details on your account",
  "Family sharing permissions (reset for the new owner)",
  "Notification preferences",
  "Milo AI conversation history",
  "Connected groomer / walker / sitter links",
] as const;

export default function TransferPet() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { user } = useAuth();
  const { pets } = usePets();
  const { setSelectedPetId: setGlobalSelectedPetId } = useSelectedPet();
  const queryClient = useQueryClient();

  const [flow, setFlow] = useState<FlowStep>("list");
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [selectedReason, setSelectedReason] = useState<TransferReasonId | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [activeTransfer, setActiveTransfer] = useState<PetTransferWithPreview | null>(null);
  const [tick, setTick] = useState(0);
  const [recipientContact, setRecipientContact] = useState("");
  const [priorOwnerShowName, setPriorOwnerShowName] = useState(true);
  const [highlightEntryIds, setHighlightEntryIds] = useState<string[]>([]);
  const [excludedEntryIds, setExcludedEntryIds] = useState<string[]>([]);

  const { data: transfers = [] } = useQuery<PetTransferWithPreview[]>({
    queryKey: ["pet_transfers"],
    queryFn: getMyPetTransfers,
    enabled: !!user,
  });

  const { data: transferPrep } = useQuery({
    queryKey: ["pet_transfer_prep", selectedPetId],
    queryFn: () => getTransferPrepSnapshot(selectedPetId!),
    enabled: !!user && flow === "verify" && !!selectedPetId,
  });

  const { data: journalEntriesForTransfer = [], isLoading: journalLoading } = useQuery({
    queryKey: ["pet_transfer_journal_pick", selectedPetId],
    queryFn: () => fetchAllJournalEntriesForPet(selectedPetId!),
    enabled: !!user && flow === "journal" && !!selectedPetId,
  });

  const activeForPet = useCallback(
    (petId: string) =>
      transfers.find(
        (t) =>
          t.pet_id === petId &&
          t.is_active &&
          !t.used_at &&
          (!t.expires_at || new Date(t.expires_at) > new Date())
      ),
    [transfers]
  );

  const createTransferMutation = useMutation({
    mutationFn: async ({
      petId,
      reason,
      recipientContact: rc,
      priorOwnerShowName: showName,
      journalHighlightEntryIds,
      excludedJournalEntryIds,
    }: {
      petId: string;
      reason: string;
      recipientContact: string;
      priorOwnerShowName: boolean;
      journalHighlightEntryIds: string[];
      excludedJournalEntryIds: string[];
    }) =>
      createPetTransfer(petId, {
        expiresInDays: TRANSFER_EXPIRES_IN_DAYS,
        transferReason: reason,
        recipientContact: rc.trim() || undefined,
        priorOwnerShowName: showName,
        journalHighlightEntryIds,
        excludedJournalEntryIds,
      }),
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["pet_transfers"] });
      setConfirmVisible(false);
      setActiveTransfer(data);
      setFlow("share");
      try {
        await notifyPetTransferCreated(data.id);
      } catch {
        /* non-blocking */
      }
    },
    onError: (error: Error) => {
      setConfirmVisible(false);
      Alert.alert("Error", error.message || "Failed to generate transfer code");
    },
  });

  const cancelTransferMutation = useMutation({
    mutationFn: cancelPetTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_transfers"] });
      setActiveTransfer(null);
      setFlow("list");
      setSelectedPetId(null);
      setSelectedReason(null);
      setRecipientContact("");
      setPriorOwnerShowName(true);
      setHighlightEntryIds([]);
      setExcludedEntryIds([]);
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to cancel transfer");
    },
  });

  useEffect(() => {
    if (flow !== "share" || !activeTransfer?.expires_at) return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [flow, activeTransfer?.expires_at]);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) ?? null,
    [pets, selectedPetId]
  );

  const expiryLabel = useMemo(() => {
    void tick;
    return formatExpiryRemaining(activeTransfer?.expires_at ?? null);
  }, [activeTransfer?.expires_at, tick]);

  const openReasonFlow = (petId: string) => {
    const existing = activeForPet(petId);
    if (existing) {
      setActiveTransfer(existing);
      setSelectedPetId(petId);
      setFlow("share");
      return;
    }
    setSelectedPetId(petId);
    setSelectedReason("rehoming");
    setRecipientContact("");
    setPriorOwnerShowName(true);
    setHighlightEntryIds([]);
    setExcludedEntryIds([]);
    setFlow("reason");
  };

  const handleContinueReason = () => {
    if (!selectedReason) return;
    setFlow("verify");
  };

  const handleContinueVerify = () => {
    setFlow("journal");
  };

  const handleContinueJournal = () => {
    setConfirmVisible(true);
  };

  const toggleJournalHighlight = (entryId: string) => {
    setExcludedEntryIds((ex) => ex.filter((x) => x !== entryId));
    setHighlightEntryIds((prev) => {
      if (prev.includes(entryId)) return prev.filter((x) => x !== entryId);
      if (prev.length >= 5) return prev;
      return [...prev, entryId];
    });
  };

  const toggleJournalExclude = (entryId: string, vetFlagged: boolean) => {
    if (vetFlagged) return;
    setHighlightEntryIds((h) => h.filter((x) => x !== entryId));
    setExcludedEntryIds((prev) =>
      prev.includes(entryId) ? prev.filter((x) => x !== entryId) : [...prev, entryId]
    );
  };

  const handleConfirmGenerate = () => {
    if (!selectedPetId || !selectedReason) return;
    createTransferMutation.mutate({
      petId: selectedPetId,
      reason: selectedReason,
      recipientContact,
      priorOwnerShowName,
      journalHighlightEntryIds: highlightEntryIds,
      excludedJournalEntryIds: excludedEntryIds,
    });
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", "Transfer code copied to clipboard");
  };

  const handleShareCode = async (code: string) => {
    try {
      await Share.share({
        message: `PawBuck pet transfer code: ${code}\n\nEnter this code in PawBuck within ${TRANSFER_EXPIRES_IN_DAYS} days to accept the transfer.`,
      });
    } catch {
      /* dismissed */
    }
  };

  const handleCancelTransferPress = () => {
    if (!activeTransfer) return;
    Alert.alert(
      "Cancel transfer",
      "This will invalidate the code. The new owner will not be able to use it.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel transfer",
          style: "destructive",
          onPress: () => cancelTransferMutation.mutate(activeTransfer.id),
        },
      ]
    );
  };

  const goBackFromReason = () => {
    setFlow("list");
    setSelectedPetId(null);
    setSelectedReason(null);
    setRecipientContact("");
    setPriorOwnerShowName(true);
    setHighlightEntryIds([]);
    setExcludedEntryIds([]);
  };

  const goBackFromShare = () => {
    setFlow("list");
    setActiveTransfer(null);
    setSelectedPetId(null);
    setSelectedReason(null);
    setRecipientContact("");
    setPriorOwnerShowName(true);
    setHighlightEntryIds([]);
    setExcludedEntryIds([]);
  };

  const goBackFromVerify = () => {
    setFlow("reason");
  };

  const goBackFromJournal = () => {
    setFlow("verify");
  };

  const muted = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.45)";
  const cardBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
  const radioOuter = isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.25)";
  /** Clear `BottomNavBar` (~64px bar + Milo + safe area) */
  const footerLift = 88 + insets.bottom;

  const headerTitle = "Transfer Ownership";

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      {flow === "list" && (
        <>
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={[
                styles.backFab,
                {
                  backgroundColor: isDark ? theme.card : theme.background,
                  borderWidth: isDark ? 0 : 1,
                  borderColor: isDark ? "transparent" : theme.border,
                },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={theme.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>{headerTitle}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.listPad, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.sectionTitle, { color: theme.foreground }]}>Select a pet</Text>
            <Text style={[styles.sectionSub, { color: muted }]}>
              Choose which pet you want to transfer to a new owner.
            </Text>

            {pets.length === 0 ? (
              <Text style={{ color: theme.secondary, marginTop: 16 }}>You don&apos;t have any pets yet.</Text>
            ) : (
              pets.map((pet) => {
                const active = activeForPet(pet.id);
                return (
                  <Pressable
                    key={pet.id}
                    onPress={() => openReasonFlow(pet.id)}
                    style={[styles.petCard, { backgroundColor: theme.card }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.petName, { color: theme.foreground }]}>{pet.name}</Text>
                      <Text style={[styles.petSub, { color: theme.secondary }]}>{pet.breed}</Text>
                      {active && (
                        <Text style={[styles.activePill, { color: theme.primary }]}>Code active — tap to view</Text>
                      )}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
                  </Pressable>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {flow === "reason" && selectedPet && (
        <>
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={goBackFromReason}
              hitSlop={12}
              style={[
                styles.backFab,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>{headerTitle}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.reasonContent, { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.heroTitle, { color: theme.foreground }]}>
              Why Are You Transferring This Pet?
            </Text>
            <Text style={[styles.heroSub, { color: muted }]}>Helps us maintain accurate records</Text>

            <View style={{ marginTop: 28, gap: 12 }}>
              {TRANSFER_REASONS.map((r) => {
                const selected = selectedReason === r.id;
                return (
                  <Pressable
                    key={r.id}
                    onPress={() => setSelectedReason(r.id)}
                    style={[styles.reasonRow, { backgroundColor: cardBg }]}
                  >
                    <Text style={[styles.reasonLabel, { color: theme.foreground }]}>{r.label}</Text>
                    <View
                      style={[
                        styles.radioOuter,
                        {
                          borderColor: selected ? theme.primary : radioOuter,
                        },
                      ]}
                    >
                      {selected && (
                        <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { bottom: footerLift, paddingBottom: 8 }]}>
            <Pressable
              onPress={handleContinueReason}
              disabled={!selectedReason}
              style={({ pressed }) => ({
                opacity: !selectedReason ? 0.45 : pressed ? 0.9 : 1,
              })}
            >
              <LinearGradient
                colors={[theme.primary, theme.ring]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaPrimary}
              >
                <Text style={[styles.ctaPrimaryText, { color: theme.primaryForeground }]}>Continue</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {flow === "verify" && selectedPet && (
        <>
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={goBackFromVerify}
              hitSlop={12}
              style={[
                styles.backFab,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>{headerTitle}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.reasonContent, { paddingBottom: 140 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.heroTitle, { color: theme.foreground }]}>Verify & recipient</Text>
            <Text style={[styles.heroSub, { color: muted }]}>
              Confirm health basics are current, optionally note who should receive the code, and choose whether
              your name appears in transfer history.
            </Text>

            <Text style={[styles.fieldLabel, { color: theme.foreground }]}>Recipient (optional)</Text>
            <TextInput
              value={recipientContact}
              onChangeText={setRecipientContact}
              placeholder="Email or @username on PawBuck"
              placeholderTextColor={muted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[
                styles.textField,
                {
                  borderColor: theme.border,
                  color: theme.foreground,
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : theme.card,
                },
              ]}
            />
            <Text style={[styles.helperHint, { color: muted }]}>
              This is a reminder for you when sharing the code. The transfer still uses the secure code.
            </Text>

            <View style={[styles.switchRow, { marginTop: 22 }]}>
              <Text style={[styles.switchLabel, { color: theme.foreground }]}>
                Show my name in transfer history to the new owner
              </Text>
              <Switch value={priorOwnerShowName} onValueChange={setPriorOwnerShowName} />
            </View>

            {transferPrep && (
              <View style={[styles.snapshotCard, { backgroundColor: cardBg }]}>
                <Text style={[styles.snapshotTitle, { color: theme.foreground }]}>Current status</Text>
                <Text style={[styles.snapshotLine, { color: theme.secondary }]}>
                  Weight: {transferPrep.weightLabel}
                </Text>
                <Text style={[styles.snapshotLine, { color: theme.secondary, marginTop: 6 }]}>
                  Active medication courses: {transferPrep.activeMedicationCount}
                </Text>
                <Text style={[styles.snapshotLine, { color: theme.secondary, marginTop: 6 }]}>
                  Last vet visit: {transferPrep.lastVetVisitDate ?? "None on file"}
                </Text>
                {transferPrep.vetVisitOlderThan12Months && (
                  <Text style={[styles.softWarn, { marginTop: 10 }]}>
                    Last visit was over 12 months ago. Consider updating records before transferring.
                  </Text>
                )}
              </View>
            )}

            <Pressable
              onPress={() => {
                setGlobalSelectedPetId(selectedPet.id);
                router.push("/(home)/pet-profile");
              }}
              style={{ marginTop: 20, paddingVertical: 8 }}
            >
              <Text style={[styles.linkText, { color: theme.primary }]}>
                Update weight or medications in Pet Profile →
              </Text>
            </Pressable>
          </ScrollView>

          <View style={[styles.footer, { bottom: footerLift, paddingBottom: 8 }]}>
            <Pressable onPress={handleContinueVerify} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
              <LinearGradient
                colors={[theme.primary, theme.ring]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaPrimary}
              >
                <Text style={[styles.ctaPrimaryText, { color: theme.primaryForeground }]}>Continue</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {flow === "journal" && selectedPet && (
        <>
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={goBackFromJournal}
              hitSlop={12}
              style={[
                styles.backFab,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>{headerTitle}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.reasonContent, { paddingBottom: 140 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.heroTitle, { color: theme.foreground }]}>Journal highlights & exclusions</Text>
            <Text style={[styles.heroSub, { color: muted }]}>
              Pin up to 5 journal notes for the new owner. Exclude sensitive entries you do not want to share
              (vet-flagged records always transfer).
            </Text>
            {excludedEntryIds.length > 0 && (
              <Text style={[styles.excludeCount, { color: theme.secondary }]}>
                {excludedEntryIds.length} journal entr
                {excludedEntryIds.length === 1 ? "y" : "ies"} excluded from transfer
              </Text>
            )}
            {journalLoading ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={theme.primary} />
            ) : (
              journalEntriesForTransfer.map((entry) => {
                const pinned = highlightEntryIds.includes(entry.id);
                const excluded = excludedEntryIds.includes(entry.id);
                const vf = Boolean(entry.vet_flagged);
                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.journalRow,
                      {
                        backgroundColor: cardBg,
                        borderColor: pinned ? theme.primary : "transparent",
                        borderWidth: pinned ? 1 : 0,
                      },
                    ]}
                  >
                    <Text style={[styles.journalMeta, { color: theme.foreground }]}>
                      {subtypeLabel(entry.domain as JournalDomain, entry.subtype)} · {entry.entry_date}
                    </Text>
                    <Text style={[styles.journalNote, { color: theme.secondary }]} numberOfLines={3}>
                      {entry.note?.trim() ? entry.note : "(No note text)"}
                    </Text>
                    {vf ? (
                      <Text style={[styles.vetFlaggedHint, { color: theme.primary }]}>
                        Vet-flagged — always included in transfer
                      </Text>
                    ) : null}
                    <View style={styles.journalActions}>
                      <Pressable
                        onPress={() => toggleJournalHighlight(entry.id)}
                        style={[
                          styles.journalChip,
                          {
                            borderColor: pinned ? theme.primary : theme.border,
                            backgroundColor: pinned ? `${theme.primary}22` : "transparent",
                          },
                        ]}
                      >
                        <Text style={{ color: theme.foreground, fontFamily: "Poppins_500Medium", fontSize: 13 }}>
                          {pinned ? "Pinned" : "Pin"} ({highlightEntryIds.length}/5)
                        </Text>
                      </Pressable>
                      <Pressable
                        disabled={vf}
                        onPress={() => toggleJournalExclude(entry.id, vf)}
                        style={[
                          styles.journalChip,
                          {
                            borderColor: excluded ? "#FF3B30" : theme.border,
                            opacity: vf ? 0.35 : 1,
                          },
                        ]}
                      >
                        <Text style={{ color: excluded ? "#FF3B30" : theme.foreground, fontFamily: "Poppins_500Medium", fontSize: 13 }}>
                          {excluded ? "Excluded" : "Exclude"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
            {!journalLoading && journalEntriesForTransfer.length === 0 && (
              <Text style={[styles.heroSub, { color: theme.secondary, marginTop: 16 }]}>
                No journal entries yet. You can continue — this step is optional.
              </Text>
            )}
          </ScrollView>

          <View style={[styles.footer, { bottom: footerLift, paddingBottom: 8 }]}>
            <Pressable onPress={handleContinueJournal} style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}>
              <LinearGradient
                colors={[theme.primary, theme.ring]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaPrimary}
              >
                <Text style={[styles.ctaPrimaryText, { color: theme.primaryForeground }]}>Review summary</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </>
      )}

      {flow === "share" && activeTransfer && (
        <>
          <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={goBackFromShare}
              hitSlop={12}
              style={[
                styles.backFab,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
                },
              ]}
            >
              <Ionicons name="arrow-back" size={20} color={theme.foreground} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: theme.foreground }]}>{headerTitle}</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.shareContent, { paddingBottom: 140 }]}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.heroTitle, { color: theme.foreground }]}>Share Transfer Code</Text>
            <Text style={[styles.shareHint, { color: muted }]}>
              Share this code with the new owner. It stays valid for {TRANSFER_EXPIRES_IN_DAYS} days or until
              you cancel it.
            </Text>

            <View style={styles.qrFrame}>
              <View style={[styles.cornerTL, { borderColor: theme.border }]} />
              <View style={[styles.cornerTR, { borderColor: theme.border }]} />
              <View style={[styles.cornerBL, { borderColor: theme.border }]} />
              <View style={[styles.cornerBR, { borderColor: theme.border }]} />
              <QRCode
                value={activeTransfer.code}
                size={200}
                color={theme.primary}
                backgroundColor="transparent"
              />
            </View>

            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: muted }]}>Or Enter The Code</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <View style={[styles.codeRow, { backgroundColor: cardBg }]}>
              <Text
                style={[styles.codeText, { color: theme.foreground }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {activeTransfer.code}
              </Text>
              <Pressable
                onPress={() => handleCopyCode(activeTransfer.code)}
                style={[styles.copyBtn, { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : theme.border }]}
              >
                <Ionicons name="copy-outline" size={20} color={theme.foreground} />
              </Pressable>
            </View>

            <View style={styles.expiryRow}>
              <Ionicons name="time-outline" size={16} color={theme.secondary} />
              <Text style={[styles.expiryText, { color: theme.secondary }]}>{expiryLabel}</Text>
            </View>
          </ScrollView>

          <View style={[styles.shareFooter, { bottom: footerLift, paddingBottom: 8 }]}>
            <Pressable
              onPress={() => handleShareCode(activeTransfer.code)}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <LinearGradient
                colors={[theme.primary, theme.ring]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaPrimary}
              >
                <Ionicons name="share-outline" size={22} color={theme.primaryForeground} />
                <Text style={[styles.ctaPrimaryText, { color: theme.primaryForeground, marginLeft: 10 }]}>
                  Share Code
                </Text>
              </LinearGradient>
            </Pressable>

            <Pressable
              onPress={handleCancelTransferPress}
              disabled={cancelTransferMutation.isPending}
              style={[
                styles.ghostBtn,
                {
                  borderColor: theme.foreground,
                  opacity: cancelTransferMutation.isPending ? 0.5 : 1,
                },
              ]}
            >
              {cancelTransferMutation.isPending ? (
                <ActivityIndicator color={theme.foreground} />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle-outline" size={22} color={theme.foreground} />
                  <Text style={[styles.ghostBtnText, { color: theme.foreground }]}>Cancel Transfer</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}

      {/* Figma 1340:31914 — confirm generate transfer code */}
      <Modal visible={confirmVisible} transparent animationType="fade" onRequestClose={() => setConfirmVisible(false)}>
        <View style={{ flex: 1 }}>
          <BlurView
            intensity={Platform.OS === "ios" ? 56 : 32}
            tint={isDark ? "dark" : "light"}
            style={StyleSheet.absoluteFill}
          />
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => !createTransferMutation.isPending && setConfirmVisible(false)}
          >
            <Pressable
              style={[
                styles.modalCard,
                isDark
                  ? {
                      backgroundColor: CONFIRM_MODAL_BG,
                      borderWidth: 1,
                      borderColor: CONFIRM_MODAL_STROKE,
                    }
                  : {
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "rgba(0, 0, 0, 0.06)",
                    },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.shieldWell,
                  isDark
                    ? { backgroundColor: "rgba(95, 196, 192, 0.22)" }
                    : { backgroundColor: "rgba(43, 168, 158, 0.18)" },
                ]}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={28}
                  color={isDark ? "#FFFFFF" : theme.primary}
                />
              </View>
              <Text style={[styles.modalTitle, { color: theme.foreground }]}>Confirm Transfer</Text>
              <Text
                style={[
                  styles.modalBody,
                  { color: isDark ? "rgba(255,255,255,0.55)" : theme.secondary },
                ]}
              >
                Review what travels with this pet. Nothing is transferred until the recipient accepts the
                code.
              </Text>

              <ScrollView
                style={styles.modalSummaryScroll}
                showsVerticalScrollIndicator
                nestedScrollEnabled
              >
                <Text style={[styles.modalSummaryHeading, { color: theme.foreground }]}>Will transfer</Text>
                {TRANSFER_INCLUDES.map((line) => (
                  <Text
                    key={line}
                    style={[styles.modalSummaryLine, { color: theme.secondary }]}
                  >
                    {"\u2022 "}
                    {line}
                  </Text>
                ))}
                <Text
                  style={[
                    styles.modalSummaryHeading,
                    { color: theme.foreground, marginTop: 14 },
                  ]}
                >
                  Will not transfer
                </Text>
                {TRANSFER_EXCLUDES.map((line) => (
                  <Text
                    key={line}
                    style={[styles.modalSummaryLine, { color: theme.secondary }]}
                  >
                    {"\u2022 "}
                    {line}
                  </Text>
                ))}
              </ScrollView>

              {/*
               * Figma: border-radius 100px, background rgba(255,255,255,0.10),
               * inset box-shadow approximated (RN has no CSS inset shadow).
               * Full-width row: View establishes width so nested Pressable + glass View
               * match Cancel (Pressable alone can shrink-wrap % width).
               */}
              <View style={styles.modalActions}>
                <Pressable
                  onPress={handleConfirmGenerate}
                  disabled={createTransferMutation.isPending}
                  style={({ pressed }) => ({
                    opacity: createTransferMutation.isPending ? 1 : pressed ? 0.92 : 1,
                    width: "100%",
                  })}
                >
                  <View
                    style={[
                      styles.modalPrimaryGlass,
                      {
                        backgroundColor: isDark
                          ? MODAL_PRIMARY_GLASS_BG
                          : "rgba(0, 0, 0, 0.06)",
                        borderRadius: MODAL_PRIMARY_GLASS_RADIUS,
                      },
                    ]}
                  >
                    {isDark ? (
                      <>
                        <LinearGradient
                          colors={[MODAL_PRIMARY_GLASS_INSET, "transparent"]}
                          locations={[0, 1]}
                          style={styles.modalPrimaryGlassInsetTop}
                          pointerEvents="none"
                        />
                        <LinearGradient
                          colors={["transparent", MODAL_PRIMARY_GLASS_INSET]}
                          locations={[0, 1]}
                          style={styles.modalPrimaryGlassInsetBottom}
                          pointerEvents="none"
                        />
                      </>
                    ) : (
                      <>
                        <LinearGradient
                          colors={["rgba(0, 0, 0, 0.08)", "transparent"]}
                          locations={[0, 1]}
                          style={styles.modalPrimaryGlassInsetTop}
                          pointerEvents="none"
                        />
                        <LinearGradient
                          colors={["transparent", "rgba(0, 0, 0, 0.08)"]}
                          locations={[0, 1]}
                          style={styles.modalPrimaryGlassInsetBottom}
                          pointerEvents="none"
                        />
                      </>
                    )}
                    <View style={styles.modalPrimaryGlassContent} pointerEvents="box-none">
                      {createTransferMutation.isPending ? (
                        <ActivityIndicator color={theme.foreground} />
                      ) : (
                        <Text
                          style={[styles.modalPrimaryText, { color: theme.foreground }]}
                          numberOfLines={1}
                        >
                          Yes, Generate Code
                        </Text>
                      )}
                    </View>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setConfirmVisible(false)}
                  disabled={createTransferMutation.isPending}
                  style={[
                    styles.modalGhost,
                    {
                      borderColor: isDark
                        ? MODAL_CANCEL_OUTLINE_STROKE
                        : MODAL_CANCEL_OUTLINE_STROKE_LIGHT,
                      opacity: createTransferMutation.isPending ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.modalGhostText, { color: theme.foreground }]}>Cancel</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </View>
      </Modal>

      <BottomNavBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backFab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
  },
  listPad: { paddingHorizontal: 20 },
  sectionTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 20,
    marginTop: 8,
  },
  sectionSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  petCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  petName: { fontFamily: "Poppins_600SemiBold", fontSize: 17 },
  petSub: { fontFamily: "Poppins_400Regular", fontSize: 14, marginTop: 2 },
  activePill: { fontFamily: "Poppins_500Medium", fontSize: 12, marginTop: 6 },
  reasonContent: { paddingHorizontal: 24, paddingTop: 8 },
  fieldLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    marginTop: 20,
  },
  textField: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
  },
  helperHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  switchLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    flex: 1,
    lineHeight: 22,
  },
  snapshotCard: {
    marginTop: 22,
    borderRadius: 16,
    padding: 16,
  },
  snapshotTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    marginBottom: 4,
  },
  snapshotLine: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  softWarn: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    lineHeight: 19,
    color: "#FF9500",
  },
  linkText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  excludeCount: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
    marginTop: 12,
  },
  journalRow: {
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
  },
  journalMeta: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  journalNote: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  vetFlaggedHint: {
    fontFamily: "Poppins_500Medium",
    fontSize: 12,
    marginTop: 8,
  },
  journalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  journalChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  heroTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 26,
    lineHeight: 32,
  },
  heroSub: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    marginTop: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  reasonLabel: { fontFamily: "Poppins_500Medium", fontSize: 16, flex: 1 },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    backgroundColor: "transparent",
  },
  ctaPrimary: {
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  ctaPrimaryText: { fontFamily: "Poppins_600SemiBold", fontSize: 17 },
  shareContent: { paddingHorizontal: 24, paddingTop: 8, alignItems: "center" },
  shareHint: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 8,
  },
  qrFrame: {
    marginTop: 32,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cornerTL: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 28,
    height: 28,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 28,
    height: 28,
    borderRightWidth: 2,
    borderTopWidth: 2,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 28,
    height: 28,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderBottomRightRadius: 8,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginTop: 28,
    gap: 12,
  },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Poppins_500Medium", fontSize: 13 },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    gap: 12,
  },
  codeText: { flex: 1, fontFamily: "Poppins_700Bold", fontSize: 18 },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    gap: 6,
  },
  expiryText: { fontFamily: "Poppins_400Regular", fontSize: 13 },
  shareFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    gap: 12,
  },
  ghostBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 14,
    gap: 8,
  },
  ghostBtnText: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    maxHeight: "88%",
    borderRadius: CONFIRM_MODAL_RADIUS,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: "center",
  },
  shieldWell: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 22,
    letterSpacing: -0.2,
    textAlign: "center",
    marginBottom: 12,
  },
  modalBody: {
    fontFamily: "Poppins_400Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  modalSummaryScroll: {
    width: "100%",
    maxHeight: 240,
    marginBottom: 20,
    alignSelf: "stretch",
  },
  modalSummaryHeading: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
    marginBottom: 8,
  },
  modalSummaryLine: {
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 6,
    paddingRight: 4,
  },
  modalActions: {
    width: "100%",
    alignSelf: "stretch",
    gap: 16,
  },
  modalPrimaryGlass: {
    width: "100%",
    overflow: "hidden",
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
  },
  modalPrimaryGlassInsetTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderTopLeftRadius: MODAL_PRIMARY_GLASS_RADIUS,
    borderTopRightRadius: MODAL_PRIMARY_GLASS_RADIUS,
  },
  modalPrimaryGlassInsetBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 18,
    borderBottomLeftRadius: MODAL_PRIMARY_GLASS_RADIUS,
    borderBottomRightRadius: MODAL_PRIMARY_GLASS_RADIUS,
  },
  modalPrimaryGlassContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  modalPrimaryText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
    lineHeight: 22,
    textAlign: "center",
    ...(Platform.OS === "android" ? { includeFontPadding: false } : {}),
  },
  modalGhost: {
    width: "100%",
    borderRadius: MODAL_CANCEL_BTN_RADIUS,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    backgroundColor: "transparent",
  },
  modalGhostText: { fontFamily: "Poppins_600SemiBold", fontSize: 16 },
});
