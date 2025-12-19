import { Pet, usePets } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { Tables } from "@/database.types";
import { fetchClinicalExams } from "@/services/clinicalExams";
import { fetchLabResults } from "@/services/labResults";
import { fetchMedicines, Medicine } from "@/services/medicines";
import { generateAndSharePetPassport } from "@/services/pdfGenerator";
import { getVaccinationsByPetId } from "@/services/vaccinations";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { PetEditModal } from "./PetEditModal";
import PetImage from "./PetImage";

type PetCardProps = {
  pet: Pet;
};

// Status colors
const STATUS_COLORS = {
  upToDate: "#34C759", // Green
  dueSoon: "#F59E0B", // Orange
  dueToday: "#F59E0B", // Orange
  overdue: "#FF3B30", // Red
  active: "#34C759", // Green
  due: "#F59E0B", // Orange
  scheduled: "#3B82F6", // Blue
  completed: "#9CA3AF", // Gray
};

// Vaccination status helpers
type VaccinationStatus = "Up-to-date" | "Due Today" | "Due Soon" | "Overdue";

const getVaccinationStatus = (nextDueDate: string | null): VaccinationStatus => {
  if (!nextDueDate) return "Up-to-date";
  
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dueDate = new Date(nextDueDate);
  dueDate.setHours(0, 0, 0, 0);
  
  const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due Today";
  if (diffDays <= 7) return "Due Soon";
  return "Up-to-date";
};

const getVaccinationStatusColor = (status: VaccinationStatus): string => {
  switch (status) {
    case "Up-to-date": return STATUS_COLORS.upToDate;
    case "Due Today": return STATUS_COLORS.dueToday;
    case "Due Soon": return STATUS_COLORS.dueSoon;
    case "Overdue": return STATUS_COLORS.overdue;
  }
};

const getNearestUpcomingVaccination = (vaccinations: Tables<"vaccinations">[]): Tables<"vaccinations"> | null => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  // Filter vaccinations with next_due_date and sort by date
  const withDueDates = vaccinations
    .filter((v) => v.next_due_date)
    .sort((a, b) => {
      const dateA = new Date(a.next_due_date!);
      const dateB = new Date(b.next_due_date!);
      return dateA.getTime() - dateB.getTime();
    });
  
  if (withDueDates.length === 0) return null;
  
  // First check for overdue or due soon (within 30 days)
  const urgentVaccination = withDueDates.find((v) => {
    const dueDate = new Date(v.next_due_date!);
    const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // Include overdue and within 30 days
  });
  
  return urgentVaccination || withDueDates[0];
};

// Medication helpers
type MedicationStatus = "Active" | "Due" | "Scheduled" | "Completed";

const isTodayScheduledDay = (medicine: Medicine, now: Date): boolean => {
  const { frequency, scheduled_day } = medicine;
  
  if (scheduled_day === null || scheduled_day === undefined) {
    return true;
  }
  
  if (frequency === "Weekly") {
    return now.getDay() === scheduled_day;
  }
  
  if (frequency === "Monthly") {
    return now.getDate() === scheduled_day;
  }
  
  return true;
};

const getNextMedicationDose = (medicine: Medicine): Date | null => {
  const now = new Date();
  const { frequency, scheduled_times, scheduled_day, start_date, end_date } = medicine;
  
  // Skip "As Needed" medications
  if (frequency === "As Needed") return null;
  
  // Check if medication hasn't started yet
  if (start_date) {
    const startDate = new Date(start_date);
    startDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    if (startDate > todayStart) {
      return startDate;
    }
  }
  
  // Check if medication has ended
  if (end_date) {
    const endDate = new Date(end_date);
    endDate.setHours(23, 59, 59, 999);
    if (endDate < now) return null;
  }
  
  // No scheduled times
  if (!scheduled_times || scheduled_times.length === 0) return null;
  
  // Check if today is a scheduled day
  if (!isTodayScheduledDay(medicine, now)) {
    // Find next scheduled day
    if (frequency === "Weekly") {
      const targetDay = scheduled_day!;
      const currentDay = now.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      
      const nextDate = new Date(now);
      nextDate.setDate(now.getDate() + daysUntil);
      const [hours, minutes] = scheduled_times[0].split(":");
      nextDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return nextDate;
    }
    
    if (frequency === "Monthly") {
      const targetDay = scheduled_day!;
      const nextDate = new Date(now);
      if (now.getDate() >= targetDay) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      nextDate.setDate(targetDay);
      const [hours, minutes] = scheduled_times[0].split(":");
      nextDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return nextDate;
    }
  }
  
  // Find next dose time today
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
  
  for (const time of scheduled_times) {
    const [hours, minutes] = time.split(":");
    const timeMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
    
    if (timeMinutes > currentTimeMinutes) {
      const nextDose = new Date(now);
      nextDose.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return nextDose;
    }
  }
  
  // All doses passed today, return first dose tomorrow (or next scheduled day)
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (frequency === "Daily" || frequency === "Twice Daily" || frequency === "Three Times Daily") {
    const [hours, minutes] = scheduled_times[0].split(":");
    tomorrow.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    return tomorrow;
  }
  
  // For weekly/bi-weekly/monthly, recursively find next
  return getNextMedicationDose({ ...medicine, start_date: tomorrow.toISOString() });
};

const getMedicationStatus = (medicine: Medicine): MedicationStatus => {
  const now = new Date();
  
  // Check if medication hasn't started yet (Scheduled)
  if (medicine.start_date) {
    const startDate = new Date(medicine.start_date);
    startDate.setHours(0, 0, 0, 0);
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    if (startDate > todayStart) return "Scheduled";
  }
  
  // Check if medication has ended (Completed)
  if (medicine.end_date) {
    const endDate = new Date(medicine.end_date);
    endDate.setHours(23, 59, 59, 999);
    if (endDate < now) return "Completed";
  }
  
  // Check if dose is due
  if (medicine.frequency !== "As Needed" && medicine.scheduled_times?.length) {
    if (isTodayScheduledDay(medicine, now)) {
      const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
      
      for (const time of medicine.scheduled_times) {
        const [hours, minutes] = time.split(":");
        const scheduledMinutes = parseInt(hours, 10) * 60 + parseInt(minutes, 10);
        
        if (scheduledMinutes <= currentTimeMinutes && currentTimeMinutes - scheduledMinutes <= 30) {
          return "Due";
        }
      }
    }
  }
  
  return "Active";
};

const getMedicationStatusColor = (status: MedicationStatus): string => {
  switch (status) {
    case "Active": return STATUS_COLORS.active;
    case "Due": return STATUS_COLORS.due;
    case "Scheduled": return STATUS_COLORS.scheduled;
    case "Completed": return STATUS_COLORS.completed;
  }
};

const getNearestMedicationDose = (medicines: Medicine[]): { medicine: Medicine; nextDose: Date } | null => {
  let nearest: { medicine: Medicine; nextDose: Date } | null = null;
  
  for (const medicine of medicines) {
    // Skip completed medications
    if (getMedicationStatus(medicine) === "Completed") continue;
    
    const nextDose = getNextMedicationDose(medicine);
    if (nextDose) {
      if (!nearest || nextDose < nearest.nextDose) {
        nearest = { medicine, nextDose };
      }
    }
  }
  
  return nearest;
};

// Format helpers
const formatDate = (date: Date, includeYear: boolean = false): string => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  now.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);
  
  if (targetDate.getTime() === now.getTime()) return "Today";
  if (targetDate.getTime() === tomorrow.getTime()) return "Tomorrow";
  
  const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (includeYear) {
    options.year = "numeric";
  }
  return date.toLocaleDateString("en-US", options);
};

const formatTime = (date: Date): string => {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

export default function PetCard({ pet }: PetCardProps) {
  const router = useRouter();
  const { theme } = useTheme();
  const { updatePet, updatingPet } = usePets();
  const [showEditModal, setShowEditModal] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  // Compute health at a glance data
  const healthData = useMemo(() => {
    const nearestVaccination = getNearestUpcomingVaccination(vaccinations);
    const vaccinationStatus = nearestVaccination
      ? getVaccinationStatus(nearestVaccination.next_due_date)
      : "Up-to-date";
    const vaccinationStatusColor = getVaccinationStatusColor(vaccinationStatus);

    const nearestMedication = getNearestMedicationDose(medicines);
    const medicationStatus = nearestMedication
      ? getMedicationStatus(nearestMedication.medicine)
      : null;
    const medicationStatusColor = medicationStatus
      ? getMedicationStatusColor(medicationStatus)
      : null;

    return {
      nearestVaccination,
      vaccinationStatus,
      vaccinationStatusColor,
      nearestMedication,
      medicationStatus,
      medicationStatusColor,
    };
  }, [vaccinations, medicines]);

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
          {/* Vaccines */}
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: healthData.vaccinationStatusColor + "20" }}
            >
              <Ionicons name="medical" size={16} color={healthData.vaccinationStatusColor} />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.cardForeground }}
                >
                  Vaccines
                </Text>
                <View
                  className="px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: healthData.vaccinationStatusColor + "20" }}
                >
                  <Text
                    className="text-[10px] font-semibold"
                    style={{ color: healthData.vaccinationStatusColor }}
                  >
                    {healthData.vaccinationStatus}
                  </Text>
                </View>
              </View>
              <Text className="text-xs" style={{ color: theme.secondary }}>
                {healthData.nearestVaccination
                  ? `Next: ${healthData.nearestVaccination.name} on ${formatDate(new Date(healthData.nearestVaccination.next_due_date!), true)}`
                  : "No upcoming vaccinations"}
              </Text>
            </View>
          </View>

          {/* Medicines */}
          <View className="flex-row items-center">
            <View
              className="w-8 h-8 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor: (healthData.medicationStatusColor || "#FF9800") + "20",
              }}
            >
              <Ionicons
                name="medkit"
                size={16}
                color={healthData.medicationStatusColor || "#FF9800"}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-0.5">
                <Text
                  className="text-xs font-semibold"
                  style={{ color: theme.cardForeground }}
                >
                  Medicines
                </Text>
                {healthData.medicationStatus && healthData.medicationStatusColor && (
                  <View
                    className="px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: healthData.medicationStatusColor + "20" }}
                  >
                    <Text
                      className="text-[10px] font-semibold"
                      style={{ color: healthData.medicationStatusColor }}
                    >
                      {healthData.medicationStatus}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-xs" style={{ color: theme.secondary }}>
                {healthData.nearestMedication
                  ? `Next: ${healthData.nearestMedication.medicine.name} ${formatDate(healthData.nearestMedication.nextDose) === "Today" ? "at" : "on"} ${formatDate(healthData.nearestMedication.nextDose) === "Today" ? formatTime(healthData.nearestMedication.nextDose) : formatDate(healthData.nearestMedication.nextDose)}`
                  : "No active medications"}
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
