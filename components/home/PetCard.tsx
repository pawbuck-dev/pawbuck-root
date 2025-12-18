import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { fetchClinicalExams } from "@/services/clinicalExams";
import { fetchLabResults } from "@/services/labResults";
import { fetchMedicines } from "@/services/medicines";
import { generateAndSharePetPassport } from "@/services/pdfGenerator";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { PetEditModal } from "./PetEditModal";
import PetImage from "./PetImage";

type PetCardProps = {
  pet: Pet;
};

export default function PetCard({ pet }: PetCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { updatePet, updatingPet } = usePets();
  const [showEditModal, setShowEditModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleUpdatePet = async (petId: string, petData: any) => {
    await updatePet(petId, petData);
  };

  const handleDownloadPassport = async () => {
    try {
      setGeneratingPDF(true);
      // Fetch all health records for this pet in parallel
      const [vaccinations, medicines, clinicalExams, labResults] = await Promise.all([
        getVaccinationsByPetId(pet.id),
        fetchMedicines(pet.id),
        fetchClinicalExams(pet.id),
        fetchLabResults(pet.id),
      ]);
      // Generate and share the PDF with all documents
      await generateAndSharePetPassport({
        pet,
        vaccinations: vaccinations || [],
        medicines: medicines || [],
        clinicalExams: clinicalExams || [],
        labResults: labResults || [],
      });
    } catch (error: any) {
      console.error("Error generating PDF:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to generate health passport"
      );
    } finally {
      setGeneratingPDF(false);
    }
  };

  const calculateAge = (dateOfBirth: string): number => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <View
      className="rounded-3xl p-6 relative"
      style={{
        backgroundColor: theme.card,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 5,
      }}
    >
      {/* Edit Button */}
      <TouchableOpacity
        className="absolute top-5 right-5 w-10 h-10 rounded-full items-center justify-center z-10"
        style={{
          backgroundColor: theme.dashedCard,
          borderWidth: 1,
          borderColor: theme.border,
        }}
        onPress={() => setShowEditModal(true)}
      >
        <Ionicons name="pencil-outline" size={16} color={theme.secondary} />
      </TouchableOpacity>

      {/* Photo Upload Area */}
      <PetImage pet={pet} />

      {/* Pet Info */}
      <View className="items-center mb-5">
        <Text
          className="text-3xl font-bold mb-2"
          style={{ color: theme.cardForeground, letterSpacing: -0.5 }}
        >
          {pet.name}
        </Text>
        <Text className="text-sm mb-2" style={{ color: theme.secondary }}>
          {pet.breed} • {calculateAge(pet.date_of_birth)} years • {pet.sex}
        </Text>
        {pet.microchip_number && (
          <View
            className="px-3 py-1.5 rounded-full mt-1"
            style={{ backgroundColor: theme.dashedCard }}
          >
            <Text
              className="text-xs font-medium"
              style={{ color: theme.secondary, letterSpacing: 0.5 }}
            >
              MICROCHIP {pet.microchip_number}
            </Text>
          </View>
        )}
      </View>

      {/* Health at a Glance */}
      <View
        className="rounded-2xl p-4 mb-4"
        style={{
          backgroundColor: theme.dashedCard,
          borderWidth: 1,
          borderColor: theme.border,
        }}
      >
        <Text
          className="text-sm font-bold mb-3"
          style={{ color: theme.cardForeground, letterSpacing: 0.5 }}
        >
          HEALTH AT A GLANCE
        </Text>
        <View className="gap-3">
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: theme.primary + "20" }}
            >
              <Ionicons name="medical" size={16} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-semibold mb-0.5"
                style={{ color: theme.cardForeground }}
              >
                Vaccines
              </Text>
              <Text className="text-xs" style={{ color: theme.secondary }}>
                Up-to-date • Next: None scheduled
              </Text>
            </View>
          </View>
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "#FF9800" + "20" }}
            >
              <Ionicons name="medkit" size={16} color="#FF9800" />
            </View>
            <View className="flex-1">
              <Text
                className="text-xs font-semibold mb-0.5"
                style={{ color: theme.cardForeground }}
              >
                Medicines
              </Text>
              <Text className="text-xs" style={{ color: theme.secondary }}>
                Next: None scheduled
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View className="gap-3">
        {/* Health Records Button */}
        <TouchableOpacity
          className="rounded-2xl py-4 items-center"
          style={{
            backgroundColor: theme.primary,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={() =>
            router.push(`/(home)/health-record/${pet.id}/(tabs)/vaccinations`)
          }
        >
          <View className="flex-row items-center gap-2">
            <Ionicons
              name="document-text-outline"
              size={20}
              color={theme.primaryForeground}
            />
            <Text
              className="font-semibold text-base"
              style={{ color: theme.primaryForeground }}
            >
              Health Records
            </Text>
          </View>
        </TouchableOpacity>

        {/* Download Passport Button */}
        <TouchableOpacity
          className="rounded-2xl py-4 items-center flex-row justify-center"
          style={{
            backgroundColor: theme.dashedCard,
            borderWidth: 1,
            borderColor: theme.primary,
          }}
          onPress={handleDownloadPassport}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons
                name="download-outline"
                size={20}
                color={theme.primary}
              />
              <Text
                className="font-semibold text-base"
                style={{ color: theme.primary }}
              >
                Download Passport
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Edit Modal */}
      {showEditModal && (
        <PetEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdatePet}
          pet={pet}
          loading={updatingPet}
        />
      )}
    </View>
  );
}
