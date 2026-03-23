import { Text, View } from "react-native";

/**
 * Provider shell — extend with auth, `provider_profiles` onboarding, and job inbox.
 * RLS for marketplace tables is defined in root `supabase/migrations/*_marketplace_provider_domain.sql`.
 */
export default function ProviderHome() {
  return (
    <View style={{ flex: 1, padding: 24, justifyContent: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "600", marginBottom: 8 }}>PawBuck Provider</Text>
      <Text style={{ opacity: 0.8 }}>
        Configure EXPO_PUBLIC_PAWBUCK_API_URL and Supabase for the provider role. See docs/ARCHITECTURE.md.
      </Text>
    </View>
  );
}
