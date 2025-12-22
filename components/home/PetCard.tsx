import { useAuth } from "@/context/authContext";
import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { TablesInsert, TablesUpdate } from "@/database.types";
import { fetchClinicalExams } from "@/services/clinicalExams";
import { fetchLabResults } from "@/services/labResults";
import { fetchMedicines } from "@/services/medicines";
import { generateAndSharePetPassport } from "@/services/pdfGenerator";
import { linkVetToPet } from "@/services/pets";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import {
  createVetInformation,
  deleteVetInformation,
  getVetInformation,
  updateVetInformation,
} from "@/services/vetInformation";
import { formatDateWithRelative, formatTime } from "@/utils/dates";
import { getNearestMedicationDose } from "@/utils/medication";
import { getNearestUpcomingVaccination } from "@/utils/vaccinationHelpers";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { PetEditModal } from "./PetEditModal";
import PetImage from "./PetImage";
import { VetInfoModal } from "./VetInfoModal";

type PetCardProps = {
  pet: Pet;
  onPrevious?: () => void;
  onNext?: () => void;
  showNavigation?: boolean;
  onEditPress?: () => void;
};

export default function PetCard({
  pet,
  onPrevious,
  onNext,
  showNavigation = false,
  onEditPress,
}: PetCardProps) {
  const router = useRouter();
  const { theme, mode, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { updatePet, updatingPet, deletePet, deletingPet } = usePets();
  const queryClient = useQueryClient();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showVetModal, setShowVetModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            router.replace("/");
          } catch (error: any) {
            console.error("Error signing out:", error);
            Alert.alert("Error", error.message || "Failed to sign out");
          }
        },
      },
    ]);
  };

  const getUserInitial = () => {
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  // Fetch vaccinations for health at a glance
  const { data: vaccinations = [] } = useQuery({
    queryKey: ["vaccinations", pet.id],
    queryFn: () => getVaccinationsByPetId(pet.id),
  });

  // Fetch medications for health at a glance
  const { data: medicines = [] } = useQuery({
    queryKey: ["medicines", pet.id],
    queryFn: () => fetchMedicines(pet.id),
  });

  // Fetch vet information if pet has one linked
  const { data: vetInfo, isLoading: loadingVetInfo } = useQuery({
    queryKey: ["vet_information", pet.vet_information_id],
    queryFn: () => getVetInformation(pet.vet_information_id!),
    enabled: !!pet.vet_information_id,
  });

  // Mutation to create vet info and link to pet
  const createVetMutation = useMutation({
    mutationFn: async (vetData: TablesInsert<"vet_information">) => {
      const newVet = await createVetInformation(vetData);
      await linkVetToPet(pet.id, newVet.id);
      return newVet;
    },
    onSuccess: (newVet) => {
      queryClient.setQueryData(["vet_information", newVet.id], newVet);
      queryClient.invalidateQueries({ queryKey: ["pets"] });
    },
  });

  // Mutation to update vet info
  const updateVetMutation = useMutation({
    mutationFn: async (vetData: TablesUpdate<"vet_information">) => {
      if (!pet.vet_information_id) throw new Error("No vet info to update");
      return updateVetInformation(pet.vet_information_id, vetData);
    },
    onSuccess: (updatedVet) => {
      queryClient.setQueryData(["vet_information", updatedVet.id], updatedVet);
    },
  });

  // Mutation to delete vet info
  const deleteVetMutation = useMutation({
    mutationFn: async () => {
      if (!pet.vet_information_id) throw new Error("No vet info to delete");
      await deleteVetInformation(pet.vet_information_id);
      await linkVetToPet(pet.id, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pets"] });
      queryClient.removeQueries({
        queryKey: ["vet_information", pet.vet_information_id],
      });
    },
  });

  // Compute health at a glance data
  const healthData = useMemo(() => {
    const nearestVaccination = getNearestUpcomingVaccination(vaccinations);
    const nearestMedication = getNearestMedicationDose(medicines);

    return {
      nearestVaccination,
      nearestMedication,
    };
  }, [vaccinations, medicines]);

  const handleUpdatePet = async (petId: string, petData: any) => {
    await updatePet(petId, petData);
  };

  const handleDeletePet = async (petId: string) => {
    await deletePet(petId);
  };

  const handleSaveVetInfo = async (
    vetData: TablesInsert<"vet_information"> | TablesUpdate<"vet_information">
  ) => {
    if (pet.vet_information_id && vetInfo) {
      await updateVetMutation.mutateAsync(
        vetData as TablesUpdate<"vet_information">
      );
    } else {
      await createVetMutation.mutateAsync(
        vetData as TablesInsert<"vet_information">
      );
    }
  };

  const handleDeleteVetInfo = async () => {
    await deleteVetMutation.mutateAsync();
  };

  const handleCallVet = () => {
    if (vetInfo?.phone) {
      Linking.openURL(`tel:${vetInfo.phone}`);
    }
  };

  const handleDownloadPassport = async () => {
    try {
      setGeneratingPDF(true);
      const [vaccinations] = await Promise.all([
        getVaccinationsByPetId(pet.id),
        fetchMedicines(pet.id),
        fetchClinicalExams(pet.id),
        fetchLabResults(pet.id),
      ]);
      await generateAndSharePetPassport({
        pet,
        vaccinations: vaccinations || [],
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

  const handleEditPress = () => {
    if (onEditPress) {
      onEditPress();
    } else {
      setShowEditModal(true);
    }
  };

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        {/* Hero Card with Pet Photo */}
        <View
          className="rounded-3xl overflow-hidden mb-6"
          style={{
            backgroundColor: theme.card,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          {/* Pet Image with Overlay */}
          <View className="relative">
            <PetImage pet={pet} style="hero" />

            {/* Top Controls - Overlaid on Image */}
            <View className="absolute top-4 left-4 right-4 flex-row items-center justify-between z-10">
              {/* Left side - Theme and Profile */}
              <View className="flex-row items-center gap-2">
                <TouchableOpacity
                  onPress={toggleTheme}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
                >
                  <Ionicons
                    name={mode === "dark" ? "sunny" : "moon"}
                    size={18}
                    color="#000"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSignOut}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Text
                    className="text-base font-bold"
                    style={{ color: "#fff" }}
                  >
                    {getUserInitial()}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Right side - Edit */}
              <TouchableOpacity
                onPress={handleEditPress}
                className="px-4 py-2 rounded-full"
                style={{ backgroundColor: "rgba(255,255,255,0.9)" }}
              >
                <Text
                  className="text-base font-medium"
                  style={{ color: "#000" }}
                >
                  Edit
                </Text>
              </TouchableOpacity>
            </View>

            {/* Navigation Arrows */}
            {showNavigation && (
              <>
                {onPrevious && (
                  <TouchableOpacity
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    onPress={onPrevious}
                  >
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
                {onNext && (
                  <TouchableOpacity
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center"
                    style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
                    onPress={onNext}
                  >
                    <Ionicons name="chevron-forward" size={24} color="#fff" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Gradient Overlay for Text */}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.8)"]}
              className="absolute bottom-0 left-0 right-0 h-40"
            />

            {/* Pet Name and Info Overlay */}
            <View className="absolute bottom-0 left-0 right-0 p-5">
              <Text
                className="text-4xl font-bold mb-3"
                style={{ color: "#fff", letterSpacing: -0.5 }}
              >
                {pet.name}
              </Text>

              {/* Breed and Age Pills */}
              <View className="flex-row gap-2">
                <View
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: "#fff", letterSpacing: 1 }}
                  >
                    {pet.breed.toUpperCase()}
                  </Text>
                </View>
                <View
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: "#fff", letterSpacing: 1 }}
                  >
                    {calculateAge(pet.date_of_birth)} YEARS
                  </Text>
                </View>

                <View
                  className="px-4 py-2 rounded-lg"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)" }}
                >
                  <Text
                    className="text-xs font-bold"
                    style={{ color: "#fff", letterSpacing: 1 }}
                  >
                    {pet.weight_value}{" "}
                    {pet.weight_unit === "kilograms" ? "kg" : "lb"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Health at a Glance Section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-4">
            <Text
              className="text-lg font-bold"
              style={{ color: theme.foreground }}
            >
              Health at a Glance
            </Text>
            <TouchableOpacity>
              <Ionicons
                name="heart-outline"
                size={22}
                color={theme.secondary}
              />
            </TouchableOpacity>
          </View>

          {/* Vertical Stat Cards Row */}
          <View className="flex-row gap-3">
            {/* Next Vaccination Card */}
            <TouchableOpacity
              className="flex-1"
              onPress={() =>
                router.push(
                  `/(home)/health-record/${pet.id}/(tabs)/vaccinations`
                )
              }
            >
              <View
                className="rounded-2xl p-4 items-center"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center mb-3"
                  style={{ backgroundColor: "#22C55E20" }}
                >
                  <Ionicons name="shield-checkmark" size={24} color="#22C55E" />
                </View>
                <Text
                  className="text-xs mb-1"
                  style={{ color: theme.secondary }}
                >
                  Next Vaccination
                </Text>
                <Text
                  className="text-sm font-bold text-center"
                  style={{ color: theme.foreground }}
                  numberOfLines={2}
                >
                  {healthData.nearestVaccination
                    ? formatDateWithRelative(
                        new Date(healthData.nearestVaccination.next_due_date!),
                        true
                      )
                    : "Up to date"}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Next Medication Card */}
            <TouchableOpacity
              className="flex-1"
              onPress={() =>
                router.push(
                  `/(home)/health-record/${pet.id}/(tabs)/medications`
                )
              }
            >
              <View
                className="flex-1 rounded-2xl p-4 items-center"
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 1,
                  borderColor: theme.border,
                }}
              >
                <View
                  className="w-12 h-12 rounded-xl items-center justify-center mb-3"
                  style={{ backgroundColor: "#FF980020" }}
                >
                  <MaterialCommunityIcons
                    name="pill"
                    size={24}
                    color="#FF9800"
                  />
                </View>
                <Text
                  className="text-xs mb-1"
                  style={{ color: theme.secondary }}
                >
                  Next Medication
                </Text>
                <Text
                  className="text-sm font-bold text-center"
                  style={{ color: theme.foreground }}
                  numberOfLines={2}
                >
                  {healthData.nearestMedication
                    ? formatDateWithRelative(
                        healthData.nearestMedication.nextDose,
                        true
                      ) === "Today"
                      ? formatTime(healthData.nearestMedication.nextDose)
                      : formatDateWithRelative(
                          healthData.nearestMedication.nextDose
                        )
                    : "None"}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Veterinary Information Section */}
        <View className="mb-6">
          <Text
            className="text-lg font-bold mb-4"
            style={{ color: theme.foreground }}
          >
            Veterinary Information
          </Text>

          {loadingVetInfo ? (
            <View
              className="rounded-2xl p-4 items-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
            >
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : vetInfo ? (
            <TouchableOpacity
              className="rounded-2xl p-4 flex-row items-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              onPress={() => setShowVetModal(true)}
              activeOpacity={0.7}
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: theme.primary + "20" }}
              >
                <Ionicons name="add" size={24} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                >
                  {vetInfo.clinic_name}
                </Text>
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  {vetInfo.vet_name}
                </Text>
              </View>
              <TouchableOpacity
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: theme.primary }}
                onPress={handleCallVet}
              >
                <Ionicons name="call" size={20} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="rounded-2xl p-4 flex-row items-center"
              style={{
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
                borderStyle: "dashed",
              }}
              onPress={() => setShowVetModal(true)}
              activeOpacity={0.7}
            >
              <View
                className="w-12 h-12 rounded-xl items-center justify-center mr-4"
                style={{ backgroundColor: theme.primary + "20" }}
              >
                <Ionicons name="add" size={24} color={theme.primary} />
              </View>
              <View className="flex-1">
                <Text
                  className="text-base font-semibold"
                  style={{ color: theme.foreground }}
                >
                  Add Veterinary Info
                </Text>
                <Text className="text-sm" style={{ color: theme.secondary }}>
                  Add your vet's contact details
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Action Buttons */}
        <View className="gap-3">
          {/* View Full Health Records */}
          <TouchableOpacity
            className="rounded-2xl p-4 flex-row items-center"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={() =>
              router.push(`/(home)/health-record/${pet.id}/(tabs)/vaccinations`)
            }
          >
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: theme.primary + "20" }}
            >
              <Ionicons name="folder-open" size={22} color={theme.primary} />
            </View>
            <Text
              className="flex-1 text-base font-semibold"
              style={{ color: theme.foreground }}
            >
              View Full Health Records
            </Text>
            <Ionicons
              name="chevron-forward"
              size={22}
              color={theme.secondary}
            />
          </TouchableOpacity>

          {/* Download Passport */}
          <TouchableOpacity
            className="rounded-2xl p-4 flex-row items-center"
            style={{
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            onPress={handleDownloadPassport}
            disabled={generatingPDF}
          >
            <View
              className="w-12 h-12 rounded-xl items-center justify-center mr-4"
              style={{ backgroundColor: theme.primary + "20" }}
            >
              <Ionicons name="document-text" size={22} color={theme.primary} />
            </View>
            <Text
              className="flex-1 text-base font-semibold"
              style={{ color: theme.foreground }}
            >
              Download Passport (PDF)
            </Text>
            {generatingPDF ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons
                name="download-outline"
                size={22}
                color={theme.secondary}
              />
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      {showEditModal && (
        <PetEditModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleUpdatePet}
          onDelete={handleDeletePet}
          pet={pet}
          loading={updatingPet}
          deleting={deletingPet}
        />
      )}

      {/* Vet Info Modal */}
      {showVetModal && (
        <VetInfoModal
          visible={showVetModal}
          onClose={() => setShowVetModal(false)}
          onSave={handleSaveVetInfo}
          onDelete={vetInfo ? handleDeleteVetInfo : undefined}
          vetInfo={vetInfo}
          loading={createVetMutation.isPending || updateVetMutation.isPending}
        />
      )}
    </View>
  );
}
