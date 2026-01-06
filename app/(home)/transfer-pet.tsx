import BottomNavBar from "@/components/home/BottomNavBar";
import { ChatProvider } from "@/context/chatContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { usePets } from "@/context/petsContext";
import {
  createPetTransfer,
  cancelPetTransfer,
  getMyPetTransfers,
  PetTransfer,
} from "@/services/petTransfers";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { useState } from "react";
import * as Clipboard from "expo-clipboard";
import QRCode from "react-native-qrcode-svg";

export default function TransferPet() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { pets } = usePets();
  const queryClient = useQueryClient();
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [selectedPetId, setSelectedPetId] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch transfers
  const { data: transfers = [], isLoading: loadingTransfers } = useQuery<PetTransfer[]>({
    queryKey: ["pet_transfers"],
    queryFn: getMyPetTransfers,
  });

  // Create transfer mutation
  const createTransferMutation = useMutation({
    mutationFn: (petId: string) => createPetTransfer(petId, 30),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_transfers"] });
      setGenerating(false);
      setSelectedPetId(null);
      Alert.alert("Success", "Transfer code generated successfully");
    },
    onError: (error: any) => {
      setGenerating(false);
      Alert.alert("Error", error.message || "Failed to generate transfer code");
    },
  });

  // Cancel transfer mutation
  const cancelTransferMutation = useMutation({
    mutationFn: cancelPetTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pet_transfers"] });
      Alert.alert("Success", "Transfer code cancelled");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to cancel transfer code");
    },
  });

  const handleGenerateTransfer = async (petId: string) => {
    setSelectedPetId(petId);
    setGenerating(true);
    createTransferMutation.mutate(petId);
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", "Transfer code copied to clipboard");
  };

  const handleShowQRCode = (code: string) => {
    setShowQRCode(code);
  };

  const handleCancelTransfer = (transferId: string) => {
    Alert.alert(
      "Cancel Transfer",
      "Are you sure you want to cancel this transfer code?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Cancel Transfer",
          style: "destructive",
          onPress: () => cancelTransferMutation.mutate(transferId),
        },
      ]
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const activeTransfers = transfers.filter(
    (transfer) => transfer.is_active && !transfer.used_at && !isExpired(transfer.expires_at)
  );

  // Get pet details for transfers
  const getPetForTransfer = (transfer: PetTransfer) => {
    return pets.find((p) => p.id === transfer.pet_id);
  };

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <View className="px-6 pt-14 pb-4">
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => router.back()}
              className="mr-4 active:opacity-70"
            >
              <Ionicons name="chevron-back" size={24} color={theme.foreground} />
            </Pressable>
            <Text className="text-3xl font-bold flex-1" style={{ color: theme.foreground }}>
              Transfer Pet
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Pet Selection Section */}
          <View className="mb-6">
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: theme.foreground }}
            >
              Select Pet to Transfer
            </Text>
            {pets.length === 0 ? (
              <Text className="text-base" style={{ color: theme.secondary }}>
                You don't have any pets to transfer.
              </Text>
            ) : (
              pets.map((pet) => {
                const hasActiveTransfer = activeTransfers.some(
                  (t) => t.pet_id === pet.id
                );
                return (
                  <View
                    key={pet.id}
                    className="rounded-2xl p-4 mb-3"
                    style={{ backgroundColor: theme.card }}
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text
                          className="text-lg font-semibold"
                          style={{ color: theme.foreground }}
                        >
                          {pet.name}
                        </Text>
                        <Text className="text-sm" style={{ color: theme.secondary }}>
                          {pet.breed}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => handleGenerateTransfer(pet.id)}
                        disabled={generating || hasActiveTransfer}
                        className="rounded-xl py-2 px-4 active:opacity-70"
                        style={{
                          backgroundColor:
                            hasActiveTransfer || generating
                              ? (isDarkMode ? "#374151" : theme.border)
                              : "#FF9500",
                          opacity: hasActiveTransfer || generating ? 0.5 : 1,
                        }}
                      >
                        {generating && selectedPetId === pet.id ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Text
                            className="text-sm font-semibold"
                            style={{ color: "#FFFFFF" }}
                          >
                            {hasActiveTransfer ? "Active" : "Generate Code"}
                          </Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })
            )}
          </View>

          {/* Active Transfer Codes Section */}
          {activeTransfers.length > 0 && (
            <View className="mb-6">
              <Text
                className="text-xl font-bold mb-4"
                style={{ color: theme.foreground }}
              >
                Active Transfer Codes
              </Text>
              {loadingTransfers ? (
                <ActivityIndicator size="small" color="#FF9500" />
              ) : (
                activeTransfers.map((transfer) => {
                  const pet = getPetForTransfer(transfer);
                  return (
                    <View
                      key={transfer.id}
                      className="rounded-2xl p-4 mb-3"
                      style={{ backgroundColor: theme.card }}
                    >
                      <View className="flex-row items-center justify-between mb-3">
                        <View className="flex-1">
                          <Text
                            className="text-base font-semibold"
                            style={{ color: theme.foreground }}
                          >
                            {pet?.name || "Unknown Pet"}
                          </Text>
                          <Text
                            className="text-lg font-bold mt-2"
                            style={{ color: "#FF9500" }}
                          >
                            {transfer.code}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => handleCancelTransfer(transfer.id)}
                          className="active:opacity-70"
                        >
                          <Ionicons name="close-circle" size={24} color={theme.secondary} />
                        </Pressable>
                      </View>
                      <Text className="text-sm mb-3" style={{ color: theme.secondary }}>
                        Expires: {formatDate(transfer.expires_at)}
                      </Text>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={() => handleCopyCode(transfer.code)}
                          className="flex-1 rounded-xl py-2 px-4 flex-row items-center justify-center active:opacity-70"
                          style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}
                        >
                          <Ionicons name="copy-outline" size={18} color={theme.foreground} />
                          <Text className="text-sm ml-2" style={{ color: theme.foreground }}>
                            Copy
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => handleShowQRCode(transfer.code)}
                          className="flex-1 rounded-xl py-2 px-4 flex-row items-center justify-center active:opacity-70"
                          style={{ backgroundColor: isDarkMode ? "#374151" : theme.border }}
                        >
                          <MaterialCommunityIcons
                            name="qrcode"
                            size={18}
                            color={theme.foreground}
                          />
                          <Text className="text-sm ml-2" style={{ color: theme.foreground }}>
                            QR Code
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        {/* QR Code Modal */}
        {showQRCode && (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          >
            <View
              className="rounded-2xl p-6 items-center"
              style={{ backgroundColor: theme.card }}
            >
              <Text
                className="text-xl font-bold mb-4"
                style={{ color: theme.foreground }}
              >
                Transfer Code QR
              </Text>
              <QRCode value={showQRCode} size={200} color={isDarkMode ? "#FFFFFF" : "#000000"} backgroundColor="transparent" />
              <Text
                className="text-base mt-4 mb-4"
                style={{ color: theme.secondary }}
              >
                {showQRCode}
              </Text>
              <Pressable
                onPress={() => setShowQRCode(null)}
                className="rounded-xl py-3 px-6 active:opacity-70"
                style={{ backgroundColor: "#FF9500" }}
              >
                <Text className="text-base font-semibold" style={{ color: "#FFFFFF" }}>
                  Close
                </Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="profile" />
      </View>
    </ChatProvider>
  );
}

