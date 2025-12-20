import Header from "@/components/Header";
import { useOnboarding } from "@/context/onboardingContext";
import { useTheme } from "@/context/themeContext";
import { checkEmailIdAvailable, validateEmailIdFormat } from "@/services/pets";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

const EMAIL_DOMAIN = "@pawbuck.com";

export default function OnboardingStep5b() {
  const router = useRouter();
  const { theme, mode } = useTheme();
  const { updatePetData, petData } = useOnboarding();
  const [emailId, setEmailId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  // Debounced availability check
  useEffect(() => {
    const trimmedEmailId = emailId.trim().toLowerCase();

    // Reset states
    setIsAvailable(null);
    setCheckError(null);

    // Validate format first
    const { isValid, error } = validateEmailIdFormat(trimmedEmailId);
    if (!isValid) {
      setValidationError(error || null);
      return;
    }
    setValidationError(null);

    // Check availability after a delay
    const timeoutId = setTimeout(async () => {
      setIsChecking(true);
      try {
        const available = await checkEmailIdAvailable(trimmedEmailId);
        setIsAvailable(available);
        if (!available) {
          setCheckError("This email ID is already taken");
        }
      } catch {
        setCheckError("Failed to check availability. Please try again.");
      } finally {
        setIsChecking(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [emailId]);

  const handleNext = useCallback(() => {
    const trimmedEmailId = emailId.trim().toLowerCase();
    if (trimmedEmailId && isAvailable && !validationError) {
      updatePetData({ email_id: trimmedEmailId });
      router.push("/onboarding/step6");
    }
  }, [emailId, isAvailable, validationError, updatePetData, router]);

  const canProceed =
    emailId.trim() && isAvailable && !validationError && !isChecking;
  const progressPercent = (4.5 / 9) * 100; // Updated progress

  const getStatusIcon = () => {
    if (isChecking) {
      return <ActivityIndicator size="small" color={theme.primary} />;
    }
    if (validationError || checkError) {
      return <Ionicons name="close-circle" size={24} color="#EF4444" />;
    }
    if (isAvailable) {
      return <Ionicons name="checkmark-circle" size={24} color="#22C55E" />;
    }
    return null;
  };

  const getStatusMessage = () => {
    if (validationError) return validationError;
    if (checkError) return checkError;
    if (isAvailable) return "This email ID is available!";
    return null;
  };

  const statusMessage = getStatusMessage();

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <Header />
      <View className="px-6 pt-14 pb-4">
        {/* Progress Indicator */}
        <View className="items-center mb-2">
          <Text
            className="text-start font-medium"
            style={{ color: theme.foreground }}
          >
            Question 5 of 9
          </Text>
        </View>

        {/* Progress Bar */}
        <View
          className="w-full h-2 rounded-full overflow-hidden"
          style={{ backgroundColor: theme.secondary }}
        >
          <View
            className="h-full rounded-full"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: theme.primary,
            }}
          />
        </View>
      </View>

      {/* Main Content */}
      <View className="flex-1 px-6 pt-8">
        {/* Back Button */}
        <Pressable
          onPress={() => router.back()}
          className="flex-row items-center mb-8 active:opacity-70"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={theme.foreground}
            style={{ opacity: 0.7 }}
          />
          <Text
            className="text-start ml-1"
            style={{ color: theme.foreground, opacity: 0.7 }}
          >
            Back
          </Text>
        </Pressable>

        {/* Question Heading */}
        <Text
          className="text-4xl font-bold text-center mb-4"
          style={{ color: theme.foreground }}
        >
          Choose an email for {petData?.name || "your pet"}
        </Text>

        {/* Subtitle */}
        <Text
          className="text-start text-center mb-8"
          style={{ color: theme.foreground, opacity: 0.6 }}
        >
          Your vet can send health records directly to this email address
        </Text>

        {/* Form */}
        <View className="w-full max-w-lg mx-auto">
          {/* Email ID Label */}
          <Text
            className="text-start font-medium mb-3"
            style={{ color: theme.foreground }}
          >
            Email ID
          </Text>

          {/* Email ID Input with Domain */}
          <View
            className="w-full rounded-xl mb-2 flex-row items-center"
            style={{
              backgroundColor: theme.background,
              borderWidth: 2,
              borderColor:
                validationError || checkError
                  ? "#EF4444"
                  : isAvailable
                    ? "#22C55E"
                    : theme.primary,
            }}
          >
            <TextInput
              className="flex-1 py-4 px-5 text-start"
              style={{
                color: theme.foreground,
              }}
              placeholder="e.g., buddy, max123"
              placeholderTextColor={mode === "dark" ? "#6B7280" : "#9CA3AF"}
              value={emailId}
              onChangeText={(text) => setEmailId(text.toLowerCase())}
              autoCorrect={false}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="next"
              onSubmitEditing={handleNext}
            />
            <Text
              className="pr-4"
              style={{ color: theme.foreground, opacity: 0.6 }}
            >
              {EMAIL_DOMAIN}
            </Text>
            <View className="pr-4">{getStatusIcon()}</View>
          </View>

          {/* Status Message */}
          {statusMessage && (
            <Text
              className="text-sm mb-6"
              style={{
                color:
                  validationError || checkError
                    ? "#EF4444"
                    : isAvailable
                      ? "#22C55E"
                      : theme.foreground,
              }}
            >
              {statusMessage}
            </Text>
          )}

          {!statusMessage && <View className="mb-6" />}

          {/* Full Email Preview */}
          {emailId.trim() && !validationError && (
            <View
              className="p-4 rounded-xl mb-8"
              style={{ backgroundColor: theme.card }}
            >
              <Text
                className="text-sm mb-1"
                style={{ color: theme.foreground, opacity: 0.6 }}
              >
                Your pet's email address will be:
              </Text>
              <Text
                className="text-lg font-semibold"
                style={{ color: theme.primary }}
              >
                {emailId.trim().toLowerCase()}
                {EMAIL_DOMAIN}
              </Text>
            </View>
          )}

          {/* Next Button */}
          <Pressable
            onPress={handleNext}
            disabled={!canProceed}
            className="w-full rounded-2xl py-4 px-8 items-center active:opacity-80"
            style={{
              backgroundColor: canProceed ? theme.primary : theme.secondary,
              opacity: canProceed ? 1 : 0.5,
            }}
          >
            <Text
              className="text-lg font-semibold"
              style={{
                color: canProceed
                  ? theme.primaryForeground
                  : theme.secondaryForeground,
              }}
            >
              Next
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
