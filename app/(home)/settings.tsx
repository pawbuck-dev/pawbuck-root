import { useAuth } from "@/context/authContext";
import { useTheme } from "@/context/themeContext";
import { useUserPreferences } from "@/context/userPreferencesContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Settings() {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const {
    preferences,
    loadingPreferences,
    updatePreferences,
    updatingPreferences,
  } = useUserPreferences();

  const [reminderDays, setReminderDays] = useState("14");
  const [hasChanges, setHasChanges] = useState(false);

  // Update local state when preferences are loaded
  useEffect(() => {
    if (preferences?.vaccination_reminder_days) {
      setReminderDays(preferences.vaccination_reminder_days.toString());
      setHasChanges(false);
    }
  }, [preferences]);

  // Handle save preferences
  const handleSavePreferences = async () => {
    try {
      const days = parseInt(reminderDays, 10);
      if (isNaN(days) || days < 1 || days > 90) {
        Alert.alert("Error", "Please enter a valid number between 1 and 90");
        return;
      }
      await updatePreferences({
        vaccination_reminder_days: days,
      });
      setHasChanges(false);
      Alert.alert("Success", "Preferences saved successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save preferences");
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (error: any) {
            console.error("Error signing out:", error);
            Alert.alert("Error", error.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const handleReminderDaysChange = (text: string) => {
    // Only allow numbers
    const filtered = text.replace(/[^0-9]/g, "");
    setReminderDays(filtered);
    setHasChanges(
      filtered !== preferences?.vaccination_reminder_days?.toString()
    );
  };

  if (loadingPreferences) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background }}
      >
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      {/* Header */}
      <View className="pt-12 pb-6 px-6">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full items-center justify-center mr-4"
            style={{ backgroundColor: theme.card }}
          >
            <Ionicons name="arrow-back" size={20} color={theme.foreground} />
          </TouchableOpacity>
          <Text
            className="text-3xl font-bold flex-1"
            style={{ color: theme.foreground }}
          >
            Settings
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Vaccination Settings Card */}
        <View
          className="rounded-3xl p-6 mb-6"
          style={{
            backgroundColor: theme.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Icon and Title */}
          <View className="flex-row items-center mb-6">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name="shield-checkmark"
                size={24}
                color={theme.primary}
              />
            </View>
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Vaccination Settings
            </Text>
          </View>

          {/* Vaccine Reminders */}
          <View className="mb-6">
            <Text
              className="text-base font-semibold mb-2"
              style={{ color: theme.foreground }}
            >
              Vaccine Reminders
            </Text>
            <Text className="text-sm mb-4" style={{ color: theme.secondary }}>
              Choose how many days before a vaccine is due to receive a reminder
            </Text>

            {/* Input with label */}
            <View className="flex-row items-center">
              <TextInput
                value={reminderDays}
                onChangeText={handleReminderDaysChange}
                keyboardType="number-pad"
                maxLength={2}
                className="font-semibold px-4 py-3 rounded-xl mr-3"
                style={{
                  backgroundColor: theme.background,
                  color: theme.foreground,
                  borderWidth: 1,
                  borderColor: theme.border,
                  width: 80,
                }}
              />
              <Text
                className="text-base flex-1"
                style={{ color: theme.secondary }}
              >
                days before due date
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            onPress={handleSavePreferences}
            disabled={updatingPreferences || !hasChanges}
            className="rounded-2xl py-4 flex-row items-center justify-center"
            style={{
              backgroundColor:
                hasChanges || updatingPreferences
                  ? theme.primary
                  : theme.border,
              opacity: hasChanges && !updatingPreferences ? 1 : 0.5,
            }}
          >
            {updatingPreferences ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={20} color="#fff" />
                <Text
                  className="text-base font-semibold ml-2"
                  style={{ color: "#fff" }}
                >
                  Save Preferences
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Theme Toggle */}
        <View
          className="rounded-3xl p-6 mb-6 flex-row items-center justify-between"
          style={{
            backgroundColor: theme.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View className="flex-row items-center flex-1">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: `${theme.primary}20` }}
            >
              <Ionicons
                name={mode === "dark" ? "moon" : "sunny"}
                size={24}
                color={theme.primary}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.foreground }}
              >
                Theme
              </Text>
              <Text className="text-sm" style={{ color: theme.secondary }}>
                {mode === "dark" ? "Dark Mode" : "Light Mode"}
              </Text>
            </View>
          </View>
          <Switch
            value={mode === "dark"}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primary }}
            thumbColor="#fff"
          />
        </View>

        {/* Account Settings Card */}
        <View
          className="rounded-3xl p-6"
          style={{
            backgroundColor: theme.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          {/* Icon and Title */}
          <View className="flex-row items-center mb-6">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: `${theme.secondary}20` }}
            >
              <Ionicons
                name="person-circle-outline"
                size={24}
                color={theme.secondary}
              />
            </View>
            <Text
              className="text-xl font-bold"
              style={{ color: theme.foreground }}
            >
              Account Settings
            </Text>
          </View>

          {/* User Email */}
          <View className="mb-4">
            <Text className="text-sm mb-2" style={{ color: theme.secondary }}>
              Signed in as
            </Text>
            <Text
              className="text-base font-medium"
              style={{ color: theme.foreground }}
            >
              {user?.email}
            </Text>
          </View>

          {/* Log Out Button */}
          <TouchableOpacity
            onPress={handleSignOut}
            className="rounded-2xl py-4 flex-row items-center justify-center"
            style={{
              backgroundColor: "transparent",
              borderWidth: 2,
              borderColor: theme.error,
            }}
          >
            <Ionicons name="log-out-outline" size={20} color={theme.error} />
            <Text
              className="text-base font-semibold ml-2"
              style={{ color: theme.error }}
            >
              Log Out
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}


