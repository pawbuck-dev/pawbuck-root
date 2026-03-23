import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: true, title: "PawBuck Provider" }}>
      <Stack.Screen name="index" options={{ title: "Provider" }} />
    </Stack>
  );
}
