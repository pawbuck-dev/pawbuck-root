import { PetsProvider } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Tabs } from "expo-router";

export default function TabsLayout() {
  const { theme } = useTheme();

  return (
    <PetsProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.foreground + "20",
            display: "none", // Hide tab bar for now
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
    </PetsProvider>
  );
}
