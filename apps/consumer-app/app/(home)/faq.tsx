import BottomNavBar from "@/components/home/BottomNavBar";
import FAQAccordion from "@/components/faq/FAQAccordion";
import { FAQ_DATA } from "@/constants/faq";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const PAGE_BG_LIGHT = "#F5F7F8";

const tileBorder = (isDark: boolean) =>
  Platform.OS === "android"
    ? {}
    : {
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
      };

export default function FAQ() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const pageBg = isDark ? theme.background : PAGE_BG_LIGHT;
  const titleColor = isDark ? theme.foreground : "#111111";
  const backFabBg = isDark ? theme.card : "#FFFFFF";

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQ = FAQ_DATA.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const emptyMuted = isDark ? "rgba(255,255,255,0.6)" : "#5A5F6A";

  return (
    <View className="flex-1" style={{ backgroundColor: pageBg }}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View
        style={{
          paddingTop: insets.top + 8,
          paddingBottom: 16,
          paddingHorizontal: 20,
          position: "relative",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[
            {
              position: "absolute",
              left: 20,
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: backFabBg,
              borderWidth: isDark ? 0 : 1,
              borderColor: isDark ? "transparent" : "#E8E8E8",
            },
            !isDark && {
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={22} color={titleColor} />
        </Pressable>
        <Text
          style={{
            fontFamily: "Poppins_600SemiBold",
            fontSize: 18,
            color: titleColor,
          }}
        >
          FAQ
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        <View
          style={[
            {
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
              borderRadius: 24,
              marginBottom: 16,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#FFFFFF",
              ...tileBorder(isDark),
            },
          ]}
        >
          <Ionicons name="search-outline" size={20} color={theme.secondary} style={{ marginRight: 12 }} />
          <TextInput
            placeholder="Search questions..."
            placeholderTextColor={theme.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={{
              flex: 1,
              fontSize: 16,
              color: theme.foreground,
              paddingVertical: 4,
            }}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={22} color={theme.secondary} />
            </Pressable>
          )}
        </View>

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
              style={{ opacity: 0.45, marginBottom: 16 }}
            />
            <Text style={{ fontSize: 16, fontWeight: "600", color: theme.foreground }}>No results found</Text>
            <Text style={{ fontSize: 14, marginTop: 8, textAlign: "center", color: emptyMuted, lineHeight: 20 }}>
              Try searching with different keywords
            </Text>
          </View>
        )}
      </ScrollView>

      <BottomNavBar activeTab="profile" />
    </View>
  );
}
