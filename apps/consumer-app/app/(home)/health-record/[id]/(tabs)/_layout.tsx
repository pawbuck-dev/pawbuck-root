import BottomNavBar from "@/components/home/BottomNavBar";
import PetSelector from "@/components/home/PetSelector";
import HealthRecordsUploadSheet, {
  UploadSheetOption,
} from "@/components/health/HealthRecordsUploadSheet";
import { usePets } from "@/context/petsContext";
import { healthRecordTabCanvas } from "@/constants/figmaHealthLayout";
import { useTheme } from "@/context/themeContext";
import { petPossessiveLabel } from "@/utils/petCopy";
import { Ionicons } from "@expo/vector-icons";
import {
  MaterialTopTabNavigationEventMap,
  MaterialTopTabNavigationOptions,
  createMaterialTopTabNavigator,
} from "@react-navigation/material-top-tabs";
import { ParamListBase, TabNavigationState } from "@react-navigation/native";
import { useSelectedPet } from "@/context/selectedPetContext";
import { useDocumentUploadQuota } from "@/hooks/useDocumentUploadQuota";
import { useHealthRecordPetId } from "@/hooks/useHealthRecordPetId";
import {
  HealthRecordTab,
  healthRecordTabHref,
} from "@/utils/healthRecordNavigation";
import {
  Redirect,
  router,
  useSegments,
  withLayoutContext,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { Navigator } = createMaterialTopTabNavigator();

export const MaterialTopTabs = withLayoutContext<
  MaterialTopTabNavigationOptions,
  typeof Navigator,
  TabNavigationState<ParamListBase>,
  MaterialTopTabNavigationEventMap
>(Navigator);

/** Short labels combined with pet name in the header, e.g. "Max's Labs" */
const TAB_TITLE: Record<HealthRecordTab, string> = {
  vaccinations: "Vaccines",
  medications: "Medications",
  exams: "Exams",
  "lab-results": "Labs",
};

export default function HealthRecordsLayout() {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const routePetId = useHealthRecordPetId();
  const { selectedPetId, setSelectedPetId } = useSelectedPet();
  const { pets } = usePets();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<HealthRecordTab>("vaccinations");
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const { ensureDocumentUploadAllowed } = useDocumentUploadQuota();
  /** When set, <Redirect> remounts the stack with the new pet id (router.replace alone often no-ops here). */
  const [redirectPetId, setRedirectPetId] = useState<string | null>(null);

  const displayPetId = redirectPetId ?? selectedPetId ?? routePetId;
  const currentPet = useMemo(
    () => pets.find((p) => p.id === displayPetId),
    [pets, displayPetId]
  );

  useEffect(() => {
    if (redirectPetId && routePetId === redirectPetId) {
      setRedirectPetId(null);
    }
  }, [redirectPetId, routePetId]);

  const tabHeaderTitle = useMemo(
    () => petPossessiveLabel(currentPet?.name, TAB_TITLE[activeTab]),
    [currentPet?.name, activeTab]
  );
  const tabScreenTitles = useMemo(
    () => ({
      vaccinations: petPossessiveLabel(currentPet?.name, TAB_TITLE.vaccinations),
      medications: petPossessiveLabel(currentPet?.name, TAB_TITLE.medications),
      exams: petPossessiveLabel(currentPet?.name, TAB_TITLE.exams),
      "lab-results": petPossessiveLabel(currentPet?.name, TAB_TITLE["lab-results"]),
    }),
    [currentPet?.name]
  );

  useEffect(() => {
    const currentTab = segments[segments.length - 1] as HealthRecordTab;
    const validTabs: HealthRecordTab[] = ["vaccinations", "medications", "exams", "lab-results"];
    if (currentTab && validTabs.includes(currentTab)) {
      setActiveTab(currentTab);
    } else {
      setActiveTab("vaccinations");
    }
  }, [segments]);

  const sheetConfig = useMemo(() => {
    const pid = displayPetId;
    const opts: UploadSheetOption[] = [];
    let title = "Upload";

    const go = (route: string, skipQuota = false) => {
      const nav = () => router.push(route as any);
      if (skipQuota) nav();
      else ensureDocumentUploadAllowed(nav);
    };

    switch (activeTab) {
      case "vaccinations":
        title = "Upload Vaccine Document";
        opts.push(
          {
            id: "cam",
            label: "Take Photo",
            icon: "camera-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/vaccination-upload-modal?upload=camera`),
          },
          {
            id: "lib",
            label: "Choose From Photos",
            icon: "images-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/vaccination-upload-modal?upload=library`),
          },
          {
            id: "pdf",
            label: "Choose PDF File",
            icon: "document-text-outline",
            usePdfBadge: true,
            onPress: () =>
              go(`/(home)/health-record/${pid}/vaccination-upload-modal?upload=pdf`),
          },
          {
            id: "man",
            label: "Add Manually",
            icon: "create-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/vaccination-upload-modal?mode=manual`, true),
          }
        );
        break;
      case "medications":
        title = "Add Medication";
        opts.push(
          {
            id: "cam",
            label: "Take Photo",
            icon: "camera-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/medication-upload-modal?upload=camera`),
          },
          {
            id: "lib",
            label: "Choose From Photos",
            icon: "images-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/medication-upload-modal?upload=library`),
          },
          {
            id: "pdf",
            label: "Choose PDF File",
            icon: "document-text-outline",
            usePdfBadge: true,
            onPress: () =>
              go(`/(home)/health-record/${pid}/medication-upload-modal?upload=pdf`),
          },
          {
            id: "man",
            label: "Add Manually",
            icon: "create-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/medication-upload-modal?mode=manual`, true),
          }
        );
        break;
      case "exams":
        title = "Upload Exam Documents";
        opts.push(
          {
            id: "cam",
            label: "Take Photo",
            icon: "camera-outline",
            onPress: () => go(`/(home)/health-record/${pid}/exam-upload-modal`),
          },
          {
            id: "lib",
            label: "Choose From Photos",
            icon: "images-outline",
            onPress: () => go(`/(home)/health-record/${pid}/exam-upload-modal`),
          },
          {
            id: "pdf",
            label: "Choose PDF File",
            icon: "document-text-outline",
            usePdfBadge: true,
            onPress: () => go(`/(home)/health-record/${pid}/exam-upload-modal`),
          }
        );
        break;
      case "lab-results":
        title = "Upload Lab Result";
        opts.push(
          {
            id: "cam",
            label: "Take Photo",
            icon: "camera-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/lab-result-upload-modal?upload=camera`),
          },
          {
            id: "lib",
            label: "Choose From Photos",
            icon: "images-outline",
            onPress: () =>
              go(`/(home)/health-record/${pid}/lab-result-upload-modal?upload=library`),
          },
          {
            id: "pdf",
            label: "Choose PDF File",
            icon: "document-text-outline",
            usePdfBadge: true,
            onPress: () =>
              go(`/(home)/health-record/${pid}/lab-result-upload-modal?upload=pdf`),
          }
        );
        break;
      default:
        break;
    }

    return { title, options: opts };
  }, [activeTab, displayPetId, ensureDocumentUploadAllowed]);

  const handleFabPress = () => {
    setShowUploadSheet((s) => !s);
  };

  const tabCanvas = healthRecordTabCanvas(theme, isDark);

  if (redirectPetId && redirectPetId !== routePetId) {
    return <Redirect href={healthRecordTabHref(redirectPetId, activeTab)} />;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: tabCanvas }}>
      <StatusBar style={mode === "dark" ? "light" : "dark"} />

      {/* Header */}
      <View style={{ paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <TouchableOpacity
            onPress={() =>
              displayPetId && router.replace(`/(home)/health-record/${displayPetId}` as any)
            }
            activeOpacity={0.7}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)",
            }}
          >
            <Ionicons name="chevron-back" size={22} color={theme.foreground} />
          </TouchableOpacity>
          <Text
            style={{ fontSize: 20, fontWeight: "700", color: theme.foreground }}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.75}
          >
            {tabHeaderTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </View>

      {/* Pet selector (multi-pet) */}
      {pets.length > 1 && (
        <View style={{ marginBottom: 8 }}>
          <PetSelector
            pets={pets}
            selectedPetId={displayPetId ?? null}
            onSelectPet={(nextPetId) => {
              if (!nextPetId || nextPetId === displayPetId) return;
              setSelectedPetId(nextPetId);
              setRedirectPetId(nextPetId);
            }}
            notificationCounts={{}}
          />
        </View>
      )}

      <View key={displayPetId} className="flex-1" style={{ backgroundColor: tabCanvas }}>
        <MaterialTopTabs
          initialRouteName="vaccinations"
          tabBarPosition="top"
          screenOptions={{
            swipeEnabled: true,
            tabBarStyle: { height: 0, opacity: 0 },
            tabBarIndicatorStyle: { height: 0 },
            tabBarShowLabel: false,
            tabBarShowIcon: false,
          }}
        >
          <MaterialTopTabs.Screen name="vaccinations" options={{ title: tabScreenTitles.vaccinations }} />
          <MaterialTopTabs.Screen name="medications" options={{ title: tabScreenTitles.medications }} />
          <MaterialTopTabs.Screen name="exams" options={{ title: tabScreenTitles.exams }} />
          <MaterialTopTabs.Screen name="lab-results" options={{ title: tabScreenTitles["lab-results"] }} />
        </MaterialTopTabs>
      </View>

      <BottomNavBar activeTab="records" selectedPetId={displayPetId} />

      <TouchableOpacity
        onPress={handleFabPress}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          right: 20,
          bottom: 88 + insets.bottom,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: theme.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 8,
          elevation: 6,
        }}
      >
        <Ionicons name={showUploadSheet ? "close" : "add"} size={28} color="#FFFFFF" />
      </TouchableOpacity>

      <HealthRecordsUploadSheet
        visible={showUploadSheet}
        title={sheetConfig.title}
        options={sheetConfig.options}
        onClose={() => setShowUploadSheet(false)}
      />

    </View>
  );
}
