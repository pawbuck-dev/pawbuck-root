import BottomNavBar from "@/components/home/BottomNavBar";
import { ChatProvider } from "@/context/chatContext";
import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import {
  createHouseholdInvite,
  deactivateInvite,
  getMyHouseholdInvites,
  HouseholdInvite,
  removeHouseholdMember,
  getMyHouseholdMembers,
  HouseholdMember,
} from "@/services/householdInvites";
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

export default function FamilyAccess() {
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showQRCode, setShowQRCode] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Fetch invites
  const { data: invites = [], isLoading: loadingInvites } = useQuery<HouseholdInvite[]>({
    queryKey: ["household_invites"],
    queryFn: getMyHouseholdInvites,
  });

  // Fetch household members
  const { data: members = [], isLoading: loadingMembers } = useQuery<HouseholdMember[]>({
    queryKey: ["household_members"],
    queryFn: getMyHouseholdMembers,
  });

  // Create invite mutation
  const createInviteMutation = useMutation({
    mutationFn: createHouseholdInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_invites"] });
      setGenerating(false);
      Alert.alert("Success", "Invite code generated successfully");
    },
    onError: (error: any) => {
      setGenerating(false);
      Alert.alert("Error", error.message || "Failed to generate invite code");
    },
  });

  // Deactivate invite mutation
  const deactivateInviteMutation = useMutation({
    mutationFn: deactivateInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_invites"] });
      Alert.alert("Success", "Invite code deactivated");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to deactivate invite code");
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: removeHouseholdMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["household_members"] });
      Alert.alert("Success", "Household member removed");
    },
    onError: (error: any) => {
      Alert.alert("Error", error.message || "Failed to remove household member");
    },
  });

  const handleGenerateInvite = async () => {
    setGenerating(true);
    createInviteMutation.mutate(30); // 30 days expiry
  };

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Alert.alert("Copied", "Invite code copied to clipboard");
  };

  const handleShowQRCode = (code: string) => {
    setShowQRCode(code);
  };

  const handleDeactivateInvite = (inviteId: string) => {
    Alert.alert(
      "Deactivate Invite",
      "Are you sure you want to deactivate this invite code?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: () => deactivateInviteMutation.mutate(inviteId),
        },
      ]
    );
  };

  const handleRemoveMember = (memberId: string) => {
    Alert.alert(
      "Remove Member",
      "Are you sure you want to remove this household member?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => removeMemberMutation.mutate(memberId),
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

  const activeInvites = invites.filter(
    (invite) => invite.is_active && !invite.used_at && !isExpired(invite.expires_at)
  );

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
        {/* Header */}
        <View className="px-6 pt-14 pb-4">
          <View className="flex-row items-center mb-4">
            <Pressable
              onPress={() => router.back()}
              className="mr-4 active:opacity-70"
            >
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
            </Pressable>
            <Text className="text-3xl font-bold flex-1" style={{ color: "#FFFFFF" }}>
              Family Access
            </Text>
          </View>
        </View>

        <ScrollView
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Generate Invite Section */}
          <View className="mb-6">
            <Pressable
              onPress={handleGenerateInvite}
              disabled={generating}
              className="w-full rounded-2xl py-5 px-6 flex-row items-center justify-center active:opacity-90"
              style={{ backgroundColor: "#5FC4C0" }}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add" size={24} color="#FFFFFF" />
                  <Text
                    className="text-lg font-semibold ml-2"
                    style={{ color: "#FFFFFF" }}
                  >
                    Generate Invite Code
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Active Invites Section */}
          <View className="mb-6">
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: "#FFFFFF" }}
            >
              Active Invite Codes
            </Text>
            {loadingInvites ? (
              <ActivityIndicator size="small" color="#5FC4C0" />
            ) : activeInvites.length === 0 ? (
              <Text className="text-base" style={{ color: "#9CA3AF" }}>
                No active invite codes. Generate one to share with family members.
              </Text>
            ) : (
              activeInvites.map((invite) => (
                <View
                  key={invite.id}
                  className="rounded-2xl p-4 mb-3"
                  style={{ backgroundColor: "#1F1F1F" }}
                >
                  <View className="flex-row items-center justify-between mb-3">
                    <Text
                      className="text-lg font-semibold"
                      style={{ color: "#FFFFFF" }}
                    >
                      {invite.code}
                    </Text>
                    <Pressable
                      onPress={() => handleDeactivateInvite(invite.id)}
                      className="active:opacity-70"
                    >
                      <Ionicons name="close-circle" size={24} color="#9CA3AF" />
                    </Pressable>
                  </View>
                  <Text className="text-sm mb-3" style={{ color: "#9CA3AF" }}>
                    Expires: {formatDate(invite.expires_at)}
                  </Text>
                  <View className="flex-row gap-2">
                    <Pressable
                      onPress={() => handleCopyCode(invite.code)}
                      className="flex-1 rounded-xl py-2 px-4 flex-row items-center justify-center active:opacity-70"
                      style={{ backgroundColor: "#374151" }}
                    >
                      <Ionicons name="copy-outline" size={18} color="#FFFFFF" />
                      <Text className="text-sm ml-2" style={{ color: "#FFFFFF" }}>
                        Copy
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleShowQRCode(invite.code)}
                      className="flex-1 rounded-xl py-2 px-4 flex-row items-center justify-center active:opacity-70"
                      style={{ backgroundColor: "#374151" }}
                    >
                      <MaterialCommunityIcons
                        name="qrcode"
                        size={18}
                        color="#FFFFFF"
                      />
                      <Text className="text-sm ml-2" style={{ color: "#FFFFFF" }}>
                        QR Code
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Household Members Section */}
          <View className="mb-6">
            <Text
              className="text-xl font-bold mb-4"
              style={{ color: "#FFFFFF" }}
            >
              Household Members
            </Text>
            {loadingMembers ? (
              <ActivityIndicator size="small" color="#5FC4C0" />
            ) : members.length === 0 ? (
              <Text className="text-base" style={{ color: "#9CA3AF" }}>
                No household members yet.
              </Text>
            ) : (
              members.map((member) => (
                <View
                  key={member.id}
                  className="rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                  style={{ backgroundColor: "#1F1F1F" }}
                >
                  <View className="flex-1">
                    <Text
                      className="text-base font-semibold"
                      style={{ color: "#FFFFFF" }}
                    >
                      {member.user_id}
                    </Text>
                    <Text className="text-sm" style={{ color: "#9CA3AF" }}>
                      Joined: {formatDate(member.joined_at)}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => handleRemoveMember(member.id)}
                    className="active:opacity-70"
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </Pressable>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* QR Code Modal */}
        {showQRCode && (
          <View
            className="absolute inset-0 items-center justify-center"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.9)" }}
          >
            <View
              className="rounded-2xl p-6 items-center"
              style={{ backgroundColor: "#1F1F1F" }}
            >
              <Text
                className="text-xl font-bold mb-4"
                style={{ color: "#FFFFFF" }}
              >
                Invite Code QR
              </Text>
              <QRCode value={showQRCode} size={200} color="#FFFFFF" backgroundColor="transparent" />
              <Text
                className="text-base mt-4 mb-4"
                style={{ color: "#9CA3AF" }}
              >
                {showQRCode}
              </Text>
              <Pressable
                onPress={() => setShowQRCode(null)}
                className="rounded-xl py-3 px-6 active:opacity-70"
                style={{ backgroundColor: "#5FC4C0" }}
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

