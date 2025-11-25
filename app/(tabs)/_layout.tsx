import { Tabs } from "expo-router";
import { useTheme } from "@/context/themeContext";

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.foreground + "20",
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.foreground + "60",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarLabel: "Home",
        }}
      />
    </Tabs>
  );
}

