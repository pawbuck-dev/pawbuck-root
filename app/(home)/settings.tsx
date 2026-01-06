import BottomNavBar from "@/components/home/BottomNavBar";
import { useAuth } from "@/context/authContext";
import { ChatProvider } from "@/context/chatContext";
import { useTheme } from "@/context/themeContext";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Alert, Image, Pressable, ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function Settings() {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (error: any) {
            console.error("Error signing out:", error);
            Alert.alert("Error", error.message || "Failed to log out");
          }
        },
      },
    ]);
  };

  const SettingsOption = ({
    icon,
    title,
    subtitle,
    iconColor,
    onPress,
  }: {
    icon: string;
    title: string;
    subtitle: string;
    iconColor: string;
    onPress: () => void;
  }) => (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-4 px-4 mb-3 rounded-2xl active:opacity-80"
      style={{ backgroundColor: theme.card }}
    >
      <View
        className="w-12 h-12 rounded-xl items-center justify-center mr-4"
        style={{ backgroundColor: `${iconColor}20` }}
      >
        <MaterialCommunityIcons name={icon as any} size={24} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-base font-semibold mb-1" style={{ color: theme.foreground }}>
          {title}
        </Text>
        <Text className="text-sm" style={{ color: theme.secondary }}>
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.secondary} />
    </Pressable>
    );

  return (
    <ChatProvider>
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        <StatusBar style={mode === "dark" ? "light" : "dark"} />

        {/* Header */}
        <View className="px-6 pt-14 pb-4">
          <View className="flex-row items-center justify-between">
            {/* Back Button - Pawbuck Logo */}
            <Pressable
              onPress={() => router.back()}
              className="items-center justify-center active:opacity-70"
            >
              <Image
                source={require("@/assets/images/icon.png")}
                style={{ width: 40, height: 40 }}
                resizeMode="contain"
              />
            </Pressable>

            {/* Title */}
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Settings
            </Text>

            {/* Theme Toggle */}
            <TouchableOpacity
              onPress={toggleTheme}
              className="w-11 h-11 rounded-full items-center justify-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={mode === "dark" ? "moon" : "sunny"}
                size={20}
                color={theme.primary}
              />
            </TouchableOpacity>
          </View>
        </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
          {/* Settings Options */}
          <View className="mb-6">
            {/* Pet Profile */}
            <SettingsOption
              icon="paw"
              title="Pet Profile"
              subtitle="Manage your pet's information"
              iconColor="#60A5FA"
              onPress={() => {
                router.push("/(home)/pet-profile");
              }}
            />

            {/* User Profile */}
            <SettingsOption
              icon="account-outline"
              title="User Profile"
              subtitle="Your account details"
              iconColor="#4ADE80"
              onPress={() => {
                router.push("/(home)/profile");
              }}
            />

            {/* Care Team & Family Access */}
            <SettingsOption
              icon="account-group-outline"
              title="Care Team & Family Access"
              subtitle="Manage who can access your pets"
              iconColor="#A78BFA"
              onPress={() => {
                router.push("/(home)/family-access");
              }}
            />

            {/* Receive a Pet Transfer */}
            <SettingsOption
              icon="swap-horizontal"
              title="Receive a Pet Transfer"
              subtitle="Accept a pet from another user"
              iconColor="#F472B6"
              onPress={() => {
                router.push("/transfer-pet");
              }}
            />

            {/* Transfer Ownership */}
            <SettingsOption
              icon="account-plus-outline"
              title="Transfer Ownership"
              subtitle="Transfer a pet to a new owner"
              iconColor="#FF9500"
              onPress={() => {
                router.push("/(home)/transfer-pet");
              }}
            />
          </View>
         

          {/* Log Out Button */}
          <Pressable
            onPress={handleSignOut}
            className="flex-row items-center justify-center py-4 px-6 rounded-2xl active:opacity-80"
            style={{
              backgroundColor: "transparent",
              borderWidth: 1,
              borderColor: theme.secondary,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.foreground} />
            <Text className="text-base font-semibold ml-2" style={{ color: theme.foreground }}>
              Log Out
            </Text>
          </Pressable>
      </ScrollView>

        {/* Bottom Navigation */}
        <BottomNavBar activeTab="profile" />
    </View>
    </ChatProvider>
  );
}
