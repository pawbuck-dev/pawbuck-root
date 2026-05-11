import BottomNavBar from "@/components/home/BottomNavBar";
import BreedPicker from "@/components/common/BreedPicker";
import CountryPicker from "@/components/common/CountryPicker";
import { ONBOARDING_COUNTRY_OPTIONS } from "@/constants/onboardingCountries";
import { usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import type { TablesInsert } from "@/database.types";
import { checkEmailIdAvailable, validateEmailIdFormat } from "@/services/pets";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AnimalType = "dog" | "cat";

function slugFromName(name: string): string {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 20);
  return s.length >= 3 ? s : "";
}

async function pickAvailableEmailId(base: string): Promise<string | null> {
  let root = slugFromName(base);
  if (root.length < 3) {
    root = `pet${Date.now().toString(36).slice(-6)}`.replace(/[^a-z0-9]/g, "").slice(0, 20);
    if (root.length < 3) root = `pet${Math.floor(Math.random() * 1e6)}`.slice(0, 20);
  }
  const candidates = [root, `${root}2`, `${root}3`, `${root}${Date.now().toString(36).slice(-4)}`];
  for (const c of candidates) {
    const v = validateEmailIdFormat(c);
    if (!v.isValid) continue;
    try {
      if (await checkEmailIdAvailable(c)) return c;
    } catch {
      /* try next */
    }
  }
  return null;
}

export default function AddPetScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const { addPet, addingPet } = usePets();

  const [name, setName] = useState("");
  const [animalType, setAnimalType] = useState<AnimalType>("dog");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState("male");
  const [country, setCountry] = useState(ONBOARDING_COUNTRY_OPTIONS[0]?.name ?? "United States");
  const [emailId, setEmailId] = useState("");
  const [weightValue, setWeightValue] = useState("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [showBreed, setShowBreed] = useState(false);
  const [showCountry, setShowCountry] = useState(false);

  const breedPickerType = useMemo(() => (animalType === "cat" ? "cat" : "dog"), [animalType]);

  const handleSuggestEmail = useCallback(async () => {
    const id = await pickAvailableEmailId(name || "pet");
    if (id) setEmailId(id);
    else Alert.alert("Pet email", "Could not suggest an address. Enter a unique local part (3–30 chars).");
  }, [name]);

  const handleSave = async () => {
    const n = name.trim();
    if (!n) {
      Alert.alert("Missing name", "Enter your pet's name.");
      return;
    }
    if (!breed.trim()) {
      Alert.alert("Missing breed", "Choose a breed.");
      return;
    }
    let local = emailId.trim().toLowerCase();
    if (!local) {
      local = (await pickAvailableEmailId(n)) ?? "";
      if (local) setEmailId(local);
    }
    const ev = validateEmailIdFormat(local);
    if (!ev.isValid) {
      Alert.alert("Pet email", ev.error ?? "Invalid pet email local part.");
      return;
    }
    try {
      const taken = !(await checkEmailIdAvailable(local));
      if (taken) {
        Alert.alert("Pet email", "That address is taken. Try another.");
        return;
      }
    } catch (e) {
      Alert.alert("Pet email", e instanceof Error ? e.message : "Could not verify availability.");
      return;
    }

    const wRaw = weightValue.trim();
    let weightNum: number | undefined;
    if (wRaw) {
      const w = parseFloat(wRaw);
      if (Number.isNaN(w) || w <= 0) {
        Alert.alert("Weight", "Enter a positive number or leave weight empty.");
        return;
      }
      weightNum = w;
    }

    const dobRaw = dateOfBirth.trim();
    let dob: string | undefined;
    if (dobRaw) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dobRaw)) {
        Alert.alert("Birth date", "Use YYYY-MM-DD or leave empty.");
        return;
      }
      dob = dobRaw;
    }

    if ((weightNum != null && !weightUnit) || (weightNum == null && weightValue.trim())) {
      Alert.alert("Weight", "Set both value and unit, or clear weight.");
      return;
    }

    const row: Record<string, unknown> = {
      name: n,
      animal_type: animalType,
      breed: breed.trim(),
      sex,
      country: country.trim(),
      email_id: local,
    };
    if (dob) row.date_of_birth = dob;
    if (weightNum != null) {
      row.weight_value = weightNum;
      row.weight_unit = weightUnit;
    }

    try {
      await addPet(row as TablesInsert<"pets">);
      router.replace("/(home)/home");
    } catch (e) {
      Alert.alert("Could not add pet", e instanceof Error ? e.message : "Try again.");
    }
  };

  const muted = isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)";
  const card = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? theme.card : "rgba(0,0,0,0.06)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="arrow-back" size={22} color={theme.foreground} />
          </TouchableOpacity>
          <Text style={{ flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700", color: theme.foreground }}>
            Add pet
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontSize: 14, color: muted, marginBottom: 16 }}>
            Pet email is the local part only (e.g. buddy) for buddy@pawbuck.app.
          </Text>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Pet name"
            placeholderTextColor={muted}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 14,
              color: theme.foreground,
              marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>Type</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            {(["dog", "cat"] as const).map((t) => (
              <Pressable
                key={t}
                onPress={() => {
                  setAnimalType(t);
                  setBreed("");
                }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: animalType === t ? "#3BD0D2" : card,
                  borderWidth: 1,
                  borderColor: animalType === t ? "#3BD0D2" : theme.border,
                }}
              >
                <Text style={{ fontWeight: "700", color: animalType === t ? "#fff" : theme.foreground }}>
                  {t === "dog" ? "Dog" : "Cat"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>Breed</Text>
          <Pressable
            onPress={() => setShowBreed(true)}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: breed ? theme.foreground : muted }}>{breed || "Tap to choose breed"}</Text>
          </Pressable>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>Sex</Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
            {(["male", "female"] as const).map((s) => (
              <Pressable
                key={s}
                onPress={() => setSex(s)}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  backgroundColor: sex === s ? "#3BD0D2" : card,
                  borderWidth: 1,
                  borderColor: sex === s ? "#3BD0D2" : theme.border,
                }}
              >
                <Text style={{ fontWeight: "700", color: sex === s ? "#fff" : theme.foreground }}>
                  {s === "male" ? "Male" : "Female"}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>Country</Text>
          <Pressable
            onPress={() => setShowCountry(true)}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ color: theme.foreground }}>{country}</Text>
          </Pressable>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>
            Pet email (local part)
          </Text>
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            <TextInput
              value={emailId}
              onChangeText={(t) => setEmailId(t.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="e.g. maxpaw"
              placeholderTextColor={muted}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 14,
                color: theme.foreground,
              }}
            />
            <TouchableOpacity
              onPress={() => void handleSuggestEmail()}
              style={{
                justifyContent: "center",
                paddingHorizontal: 14,
                borderRadius: 12,
                backgroundColor: card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <Text style={{ fontWeight: "600", color: theme.foreground }}>Suggest</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>
            Birth date (optional)
          </Text>
          <TextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={muted}
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 12,
              padding: 14,
              color: theme.foreground,
              marginBottom: 16,
            }}
          />

          <Text style={{ fontSize: 13, fontWeight: "600", color: theme.foreground, marginBottom: 6 }}>
            Weight (optional)
          </Text>
          <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
            <TextInput
              value={weightValue}
              onChangeText={setWeightValue}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={muted}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: theme.border,
                borderRadius: 12,
                padding: 14,
                color: theme.foreground,
              }}
            />
            {(["kg", "lbs"] as const).map((u) => (
              <Pressable
                key={u}
                onPress={() => setWeightUnit(u)}
                style={{
                  paddingHorizontal: 16,
                  justifyContent: "center",
                  borderRadius: 12,
                  backgroundColor: weightUnit === u ? "#3BD0D2" : card,
                  borderWidth: 1,
                  borderColor: weightUnit === u ? "#3BD0D2" : theme.border,
                }}
              >
                <Text style={{ fontWeight: "700", color: weightUnit === u ? "#fff" : theme.foreground }}>{u}</Text>
              </Pressable>
            ))}
          </View>

          <TouchableOpacity
            onPress={() => void handleSave()}
            disabled={addingPet}
            style={{
              backgroundColor: "#3BD0D2",
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              opacity: addingPet ? 0.7 : 1,
            }}
          >
            {addingPet ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#fff" }}>Save pet</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <BreedPicker
        visible={showBreed}
        selectedBreed={breed}
        petType={breedPickerType}
        onSelect={(b) => {
          setBreed(b);
          setShowBreed(false);
        }}
        onClose={() => setShowBreed(false)}
      />
      <CountryPicker
        visible={showCountry}
        selectedCountry={country}
        onSelect={(c) => {
          setCountry(c);
          setShowCountry(false);
        }}
        onClose={() => setShowCountry(false)}
      />

      <BottomNavBar activeTab="home" />
    </View>
  );
}
