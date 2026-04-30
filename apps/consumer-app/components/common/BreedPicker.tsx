import { CAT_BREEDS, DOG_BREEDS } from "@/constants/onboarding";
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

interface BreedPickerProps {
  visible: boolean;
  selectedBreed: string;
  petType: "dog" | "cat" | "other";
  onSelect: (breed: string) => void;
  onClose: () => void;
}

export default function BreedPicker({
  visible,
  selectedBreed,
  petType,
  onSelect,
  onClose,
}: BreedPickerProps) {
  const { theme, mode } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");

  const breeds = petType === "cat" ? CAT_BREEDS : DOG_BREEDS;

  const filteredBreeds = breeds.filter((breed) =>
    breed.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const handleSelect = (breed: string) => {
    onSelect(breed);
    setSearchQuery("");
    onClose();
  };

  const handleUseSearchAsCustom = () => {
    const q = searchQuery.trim();
    if (!q) return;
    handleSelect(q);
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
                Select Breed
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
                  placeholder="Search breeds..."
                  placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="words"
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

            {/* Breeds List */}
            <ScrollView
              className="px-6 pb-6"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="none"
            >
              {filteredBreeds.length > 0 ? (
                filteredBreeds.map((breed) => {
                  const isSelected = selectedBreed === breed;
                  return (
                    <Pressable
                      key={breed}
                      onPress={() => handleSelect(breed)}
                      className="rounded-xl py-4 px-4 mb-2 active:opacity-70"
                      style={{
                        backgroundColor: isSelected
                          ? theme.primary
                          : "transparent",
                      }}
                    >
                      <Text
                        className="text-lg font-medium"
                        style={{
                          color: isSelected
                            ? theme.primaryForeground
                            : theme.foreground,
                        }}
                      >
                        {breed}
                      </Text>
                    </Pressable>
                  );
                })
              ) : (
                <View className="py-6 px-1">
                  <Text
                    className="text-center text-base mb-4"
                    style={{ color: theme.foreground, opacity: 0.55 }}
                  >
                    {searchQuery.trim()
                      ? `No breeds match "${searchQuery.trim()}"`
                      : "Type to search the breed list."}
                  </Text>
                  {searchQuery.trim().length > 0 ? (
                    <Pressable
                      onPress={handleUseSearchAsCustom}
                      className="rounded-xl py-4 px-4 mb-4 active:opacity-80"
                      style={{
                        borderWidth: 1.5,
                        borderColor: theme.primary,
                        backgroundColor: "transparent",
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Use ${searchQuery.trim()} as breed`}
                    >
                      <Text
                        className="text-center text-base font-semibold"
                        style={{ color: theme.primary }}
                      >
                        {`Use "${searchQuery.trim()}" as breed`}
                      </Text>
                      <Text
                        className="text-center text-sm mt-2"
                        style={{ color: theme.foreground, opacity: 0.5 }}
                      >
                        Custom or crossbreed — not in the list
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
