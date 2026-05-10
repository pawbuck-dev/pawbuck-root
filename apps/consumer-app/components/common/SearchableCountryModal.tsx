import { useTheme } from "@/context/themeContext";
import type { OnboardingCountryOption } from "@/constants/onboardingCountries";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type SearchableCountryModalProps = {
  visible: boolean;
  countries: OnboardingCountryOption[];
  selectedCountry: string;
  onSelect: (country: string) => void;
  onClose: () => void;
  title?: string;
};

export default function SearchableCountryModal({
  visible,
  countries,
  selectedCountry,
  onSelect,
  onClose,
  title = "Select country",
}: SearchableCountryModalProps) {
  const { theme, mode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = useMemo(
    () =>
      countries.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
      ),
    [countries, searchQuery]
  );

  const handleSelect = (country: string) => {
    onSelect(country);
    setSearchQuery("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          <Pressable
            className="flex-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onPress={onClose}
          />

          <View
            className="rounded-t-3xl"
            style={{
              backgroundColor: theme.card,
              maxHeight: "80%",
            }}
          >
            <View className="flex-row justify-between items-center px-6 pt-6 pb-4">
              <Text className="text-2xl font-bold" style={{ color: theme.foreground }}>
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 items-center justify-center active:opacity-70"
              >
                <Ionicons
                  name="close"
                  size={28}
                  color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>

            <View className="px-6 pb-4">
              <View
                className="flex-row items-center rounded-xl px-4 py-3"
                style={{
                  backgroundColor: theme.background,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <Ionicons
                  name="search"
                  size={20}
                  color={mode === "dark" ? "#9CA3AF" : "#6B7280"}
                />
                <TextInput
                  className="flex-1 ml-2 text-start"
                  style={{ color: theme.foreground }}
                  placeholder="Search countries..."
                  placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="none"
                  autoFocus
                  returnKeyType="search"
                  clearButtonMode="never"
                />
                {searchQuery.length > 0 ? (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                    />
                  </Pressable>
                ) : null}
              </View>
            </View>

            <ScrollView
              className="px-6 pb-6"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => {
                  const isSelected = selectedCountry === country.name;
                  return (
                    <Pressable
                      key={country.name}
                      onPress={() => handleSelect(country.name)}
                      className="rounded-xl py-4 px-4 mb-2 active:opacity-70"
                      style={{
                        backgroundColor: isSelected ? theme.primary : "transparent",
                      }}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">{country.flag}</Text>
                        <Text
                          className="text-lg font-medium"
                          style={{
                            color: isSelected ? theme.primaryForeground : theme.foreground,
                          }}
                        >
                          {country.name}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : (
                <View className="py-8 items-center">
                  <Text className="text-start" style={{ color: theme.foreground, opacity: 0.5 }}>
                    No countries found
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
