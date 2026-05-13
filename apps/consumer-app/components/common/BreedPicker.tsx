import {
  CAT_BREEDS,
  DOG_BREEDS,
  POPULAR_CAT_BREEDS_FOR_PICKER,
  POPULAR_DOG_BREEDS_FOR_PICKER,
} from "@/constants/onboarding";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
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
  const searchRef = useRef<TextInput>(null);

  const breeds = petType === "cat" ? CAT_BREEDS : DOG_BREEDS;
  const popularBreeds =
    petType === "cat" ? POPULAR_CAT_BREEDS_FOR_PICKER : POPULAR_DOG_BREEDS_FOR_PICKER;

  const q = searchQuery.toLowerCase().trim();
  const filteredBreeds = breeds.filter((breed) => breed.toLowerCase().includes(q));
  const listToShow = q.length > 0 ? filteredBreeds : popularBreeds;

  useEffect(() => {
    if (!visible) {
      setSearchQuery("");
      return;
    }
    const t = setTimeout(() => {
      searchRef.current?.focus();
    }, Platform.OS === "android" ? 280 : 80);
    return () => clearTimeout(t);
  }, [visible]);

  const handleSelect = (breed: string) => {
    onSelect(breed);
    setSearchQuery("");
    onClose();
  };

  const handleUseSearchAsCustom = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    handleSelect(trimmed);
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
            <View className="px-6 pb-3">
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
                  ref={searchRef}
                  className="flex-1 ml-2 text-start"
                  style={{ color: theme.foreground }}
                  placeholder="Type to search breeds…"
                  placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoCorrect={false}
                  autoCapitalize="words"
                  returnKeyType="search"
                  clearButtonMode="never"
                  editable={true}
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
              <Text
                className="text-sm mt-2"
                style={{ color: theme.foreground, opacity: 0.55 }}
              >
                {q.length === 0
                  ? "Popular breeds below — start typing to filter the full list."
                  : "Matching breeds — pick one or use a custom name at the bottom."}
              </Text>
            </View>

            {/* Breeds List */}
            <ScrollView
              className="px-6 pb-6"
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {listToShow.length > 0 ? (
                listToShow.map((breed) => {
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
                    {q.length > 0
                      ? `No breeds match "${searchQuery.trim()}"`
                      : "Type to search the breed list."}
                  </Text>
                  {q.length > 0 ? (
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

              {q.length > 0 && listToShow.length > 0 ? (
                <Pressable
                  onPress={handleUseSearchAsCustom}
                  className="rounded-xl py-4 px-4 mt-2 mb-2 active:opacity-80"
                  style={{
                    borderWidth: 1.5,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Use ${searchQuery.trim()} as breed`}
                >
                  <Text
                    className="text-center text-base font-semibold"
                    style={{ color: theme.primary }}
                  >
                    {`Use "${searchQuery.trim()}" as exact breed`}
                  </Text>
                  <Text
                    className="text-center text-sm mt-2"
                    style={{ color: theme.foreground, opacity: 0.5 }}
                  >
                    For mixes and rare breeds not in the list
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
