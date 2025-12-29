import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
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

interface Country {
  name: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { name: "United States", flag: "🇺🇸" },
  { name: "Canada", flag: "🇨🇦" },
  { name: "United Kingdom", flag: "🇬🇧" },
  // { name: "Argentina", flag: "🇦🇷" },
  // { name: "Australia", flag: "🇦🇺" },
  // { name: "Austria", flag: "🇦🇹" },
  // { name: "Belgium", flag: "🇧🇪" },
  // { name: "Brazil", flag: "🇧🇷" },
  // { name: "Bulgaria", flag: "🇧🇬" },
  // { name: "Chile", flag: "🇨🇱" },
  // { name: "China", flag: "🇨🇳" },
  // { name: "Colombia", flag: "🇨🇴" },
  // { name: "Croatia", flag: "🇭🇷" },
  // { name: "Czech Republic", flag: "🇨🇿" },
  // { name: "Denmark", flag: "🇩🇰" },
  // { name: "Egypt", flag: "🇪🇬" },
  // { name: "Estonia", flag: "🇪🇪" },
  // { name: "Finland", flag: "🇫🇮" },
  // { name: "France", flag: "🇫🇷" },
  // { name: "Germany", flag: "🇩🇪" },
  // { name: "Greece", flag: "🇬🇷" },
  // { name: "Hungary", flag: "🇭🇺" },
  // { name: "India", flag: "🇮🇳" },
  // { name: "Indonesia", flag: "🇮🇩" },
  // { name: "Ireland", flag: "🇮🇪" },
  // { name: "Israel", flag: "🇮🇱" },
  // { name: "Italy", flag: "🇮🇹" },
  // { name: "Japan", flag: "🇯🇵" },
  // { name: "Kenya", flag: "🇰🇪" },
  // { name: "Latvia", flag: "🇱🇻" },
  // { name: "Lithuania", flag: "🇱🇹" },
  // { name: "Malaysia", flag: "🇲🇾" },
  // { name: "Mexico", flag: "🇲🇽" },
  // { name: "Netherlands", flag: "🇳🇱" },
  // { name: "New Zealand", flag: "🇳🇿" },
  // { name: "Nigeria", flag: "🇳🇬" },
  // { name: "Norway", flag: "🇳🇴" },
  // { name: "Peru", flag: "🇵🇪" },
  // { name: "Philippines", flag: "🇵🇭" },
  // { name: "Poland", flag: "🇵🇱" },
  // { name: "Portugal", flag: "🇵🇹" },
  // { name: "Romania", flag: "🇷🇴" },
  // { name: "Russia", flag: "🇷🇺" },
  // { name: "Saudi Arabia", flag: "🇸🇦" },
  // { name: "Singapore", flag: "🇸🇬" },
  // { name: "Slovakia", flag: "🇸🇰" },
  // { name: "Slovenia", flag: "🇸🇮" },
  // { name: "South Africa", flag: "🇿🇦" },
  // { name: "South Korea", flag: "🇰🇷" },
  // { name: "Spain", flag: "🇪🇸" },
  // { name: "Sweden", flag: "🇸🇪" },
  // { name: "Switzerland", flag: "🇨🇭" },
  // { name: "Thailand", flag: "🇹🇭" },
  // { name: "Turkey", flag: "🇹🇷" },
  // { name: "Ukraine", flag: "🇺🇦" },
  // { name: "United Arab Emirates", flag: "🇦🇪" },

  // { name: "Vietnam", flag: "🇻🇳" }
];

interface CountryPickerProps {
  visible: boolean;
  selectedCountry: string;
  onSelect: (country: string) => void;
  onClose: () => void;
}

export default function CountryPicker({
  visible,
  selectedCountry,
  onSelect,
  onClose,
}: CountryPickerProps) {
  const { theme, mode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCountries = COUNTRIES.filter((country) =>
    country.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
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
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <View className="flex-1 justify-end">
          {/* Backdrop */}
          <Pressable
            className="flex-1"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
            onPress={onClose}
          />

          {/* Modal Content */}
          <View
            className="rounded-t-3xl"
            style={{
              backgroundColor: theme.card,
              maxHeight: "80%",
            }}
          >
            {/* Header */}
            <View className="flex-row justify-between items-center px-6 pt-6 pb-4">
              <Text
                className="text-2xl font-bold"
                style={{ color: theme.foreground }}
              >
                Select Country
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

            {/* Search Input */}
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
                  autoFocus={true}
                  returnKeyType="search"
                  clearButtonMode="never"
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={20}
                      color={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Countries List */}
            <ScrollView
              className="px-6 pb-6"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
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
                        backgroundColor: isSelected
                          ? theme.primary
                          : "transparent",
                      }}
                    >
                      <View className="flex-row items-center">
                        <Text className="text-2xl mr-3">{country.flag}</Text>
                        <Text
                          className="text-lg font-medium"
                          style={{
                            color: isSelected
                              ? theme.primaryForeground
                              : theme.foreground,
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
                  <Text
                    className="text-start"
                    style={{ color: theme.foreground, opacity: 0.5 }}
                  >
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
