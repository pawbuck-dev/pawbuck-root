import BottomNavBar from "@/components/home/BottomNavBar";
import FAQAccordion from "@/components/faq/FAQAccordion";
import { FAQ_DATA } from "@/constants/faq";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Image, Pressable, ScrollView, Text, TextInput, View } from "react-native";

export default function FAQ() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  // Filter FAQ items based on search query
  const filteredFAQ = FAQ_DATA.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
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
            FAQ
          </Text>

          {/* Placeholder for alignment */}
          <View style={{ width: 40 }} />
        </View>
      </View>

      <ScrollView
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Search Bar */}
        <View
          className="flex-row items-center px-4 py-3 rounded-2xl mb-6"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={theme.secondary}
            style={{ marginRight: 12 }}
          />
          <TextInput
            placeholder="Search questions..."
            placeholderTextColor={theme.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            className="flex-1 text-base"
            style={{ color: theme.foreground }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons
                name="close-circle"
                size={20}
                color={theme.secondary}
              />
            </Pressable>
          )}
        </View>

        {/* FAQ Items */}
        {filteredFAQ.length > 0 ? (
          <View>
            {filteredFAQ.map((item) => (
              <FAQAccordion
                key={item.id}
                question={item.question}
                answer={item.answer}
                isExpanded={expandedItems.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </View>
        ) : (
          <View className="items-center justify-center py-12">
            <Ionicons
              name="search-outline"
              size={48}
              color={theme.secondary}
              style={{ opacity: 0.5, marginBottom: 16 }}
            />
            <Text
              className="text-base font-medium"
              style={{ color: theme.secondary }}
            >
              No results found
            </Text>
            <Text
              className="text-sm mt-2 text-center"
              style={{ color: theme.secondary, opacity: 0.7 }}
            >
              Try searching with different keywords
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNavBar activeTab="profile" />
    </View>
  );
}
