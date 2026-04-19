import DocumentCard from "@/components/health/DocumentCard";
import { dashboardCareTeamCardChrome } from "@/constants/figmaHealthLayout";
import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useMiloUpload } from "@/hooks/useMiloUpload";
import { usePetDocuments } from "@/hooks/usePetDocuments";
import { pickPdfFile } from "@/utils/filePicker";
import { formatMicrochipDisplay } from "@/utils/microchipDisplay";
import { pickImageFromLibrary } from "@/utils/imagePicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/** Placeholder until `pets` / insurance table supports these fields — replace with API data. */
const INSURANCE_DEMO = {
  policyNumber: "PP-2024-8821",
  provider: "PetPlan Gold",
  coverage: "$15,000/yr",
  deductible: "$250",
  expiresDisplay: "May 15, 2026",
  monthlyPremium: "$48.50",
  /** Header subtitle: plan · renewal month */
  headerSubtitle: "PetPlan Gold · May 2026",
  documentTitle: "PetPlan Gold Policy",
};

/** Placeholder until pedigree columns exist — `breed` comes from `pet` when set. */
const PEDIGREE_DEMO = {
  registry: "AKC",
  regNumber: "DN-78432109",
  breedFallback: "Golden Retriever",
  documentTitle: "AKC Registration",
  documentDate: "Jun 10, 2024",
};

/** Placeholder until certificates are stored — replace with API data. */
const CERTIFICATES_DEMO = {
  spayNeuter: "Aug 3, 2025 · Dr. Johnson",
  cgcCertNumber: "CGC-2026-11290",
  documents: [
    { title: "Spay/Neuter Certificate", date: "Aug 3, 2025" },
    { title: "Canine Good Citizen", date: "Feb 20, 2026", subtitle: "AKC Certification" },
  ],
};

type Props = {
  pet: Pet | undefined;
};

/**
 * Health Records hub — Documents & ID (microchip + insurance in one card), Legal & Registration (pedigree, certificates, travel).
 */
export default function DocumentsAndIdSection({ pet }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const queryClient = useQueryClient();
  const { data: vaultDocs = [], isLoading: loadingVault } = usePetDocuments(pet?.id);
  const { uploadAndAnalyze, status: miloUploadStatus } = useMiloUpload();

  const handleAddDocument = () => {
    if (!pet?.id) {
      Alert.alert("Error", "No pet selected");
      return;
    }
    Alert.alert(
      "Add document",
      "Upload a photo or PDF. Milo will classify and extract key details.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Photo library",
          onPress: async () => {
            try {
              const img = await pickImageFromLibrary();
              if (!img) return;
              await uploadAndAnalyze(pet.id, pet.name, img);
              await queryClient.invalidateQueries({ queryKey: ["pet_documents", pet.id] });
              Alert.alert("Saved", "Document analyzed and saved.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
            }
          },
        },
        {
          text: "PDF",
          onPress: async () => {
            try {
              const pdf = await pickPdfFile();
              if (!pdf) return;
              await uploadAndAnalyze(pet.id, pet.name, pdf);
              await queryClient.invalidateQueries({ queryKey: ["pet_documents", pet.id] });
              Alert.alert("Saved", "Document analyzed and saved.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
            }
          },
        },
      ]
    );
  };
  const [microExpanded, setMicroExpanded] = useState(true);
  const [insuranceExpanded, setInsuranceExpanded] = useState(true);
  const [pedigreeExpanded, setPedigreeExpanded] = useState(true);
  const [certificatesExpanded, setCertificatesExpanded] = useState(true);

  const warnOrange = isDark ? "#FB923C" : "#EA580C";

  const microchip = pet?.microchip_number?.trim();
  const registered = !!microchip;

  const toggleMicro = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMicroExpanded((e) => !e);
  };

  const toggleInsurance = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInsuranceExpanded((e) => !e);
  };

  const togglePedigree = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPedigreeExpanded((e) => !e);
  };

  const toggleCertificates = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCertificatesExpanded((e) => !e);
  };

  const breedDisplay = pet?.breed?.trim() || PEDIGREE_DEMO.breedFallback;
  const pedigreeRegistered = !!(PEDIGREE_DEMO.registry && PEDIGREE_DEMO.regNumber);

  const surface = {
    ...dashboardCareTeamCardChrome(isDark),
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
  };

  const innerWell = {
    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    borderRadius: 12,
    padding: 10,
  };

  const fieldBox = {
    flexGrow: 1,
    flexBasis: 0,
    minWidth: 140,
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F3F4F6",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
  };

  const labelStyle = { fontSize: 10, fontWeight: "600" as const, color: theme.secondary, letterSpacing: 0.3 };
  const valueStyle = { fontSize: 13, fontWeight: "600" as const, color: theme.foreground, marginTop: 4 };

  return (
    <View style={{ marginTop: 6, marginBottom: 4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <MaterialCommunityIcons name="folder-outline" size={18} color={theme.secondary} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: theme.secondary,
            letterSpacing: 1.2,
          }}
        >
          {"DOCUMENTS & ID"}
        </Text>
      </View>

      <View style={surface}>
        {loadingVault ? (
          <ActivityIndicator style={{ marginBottom: 12 }} color={theme.primary} />
        ) : null}
        {miloUploadStatus === "uploading" || miloUploadStatus === "analyzing" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <ActivityIndicator color={theme.primary} />
            <Text style={{ fontSize: 13, color: theme.secondary }}>
              {miloUploadStatus === "uploading" ? "Uploading…" : "Analyzing with Milo…"}
            </Text>
          </View>
        ) : null}
        {vaultDocs.length > 0 ? (
          <View style={{ marginBottom: 16 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: theme.secondary,
                marginBottom: 8,
              }}
            >
              Saved documents
            </Text>
            {vaultDocs.map((d) => (
              <DocumentCard key={d.id} row={d} />
            ))}
          </View>
        ) : null}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleMicro}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(167,139,250,0.2)" : "rgba(124,58,237,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="chip" size={22} color={isDark ? "#C4B5FD" : "#6D28D9"} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>{"Microchip & ID"}</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: registered ? (isDark ? "#4ADE80" : "#15803D") : theme.secondary,
              }}
            >
              {registered ? "Registered" : "Not registered"}
            </Text>
            <Ionicons
              name={microExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {microExpanded ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={fieldBox}>
                <Text style={labelStyle}>CHIP #</Text>
                <Text style={valueStyle} numberOfLines={2}>
                  {formatMicrochipDisplay(pet?.microchip_number)}
                </Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>REGISTRY</Text>
                <Text style={valueStyle}>—</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>IMPLANT DATE</Text>
                <Text style={valueStyle}>—</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>EMERGENCY CONTACT</Text>
                <Text style={valueStyle}>—</Text>
              </View>
            </View>

            <View style={[innerWell, { marginTop: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="document-text-outline" size={22} color={theme.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                    Microchip certificate
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                    {registered
                      ? `Linked to chip ${formatMicrochipDisplay(pet?.microchip_number)}`
                      : "Add your chip number in profile, then attach a document"}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAddDocument}
              activeOpacity={0.85}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primary }}>+ Add document</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.border,
            marginVertical: 14,
          }}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleInsurance}
          style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="shield-checkmark" size={22} color={isDark ? "#4ADE80" : "#15803D"} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Insurance</Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }} numberOfLines={2}>
                {INSURANCE_DEMO.headerSubtitle}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: warnOrange }}>Expiring Soon</Text>
            <Ionicons
              name={insuranceExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {insuranceExpanded ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={fieldBox}>
                <Text style={labelStyle}>POLICY #</Text>
                <Text style={valueStyle}>{INSURANCE_DEMO.policyNumber}</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>PROVIDER</Text>
                <Text style={valueStyle}>{INSURANCE_DEMO.provider}</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>COVERAGE</Text>
                <Text style={valueStyle}>{INSURANCE_DEMO.coverage}</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>DEDUCTIBLE</Text>
                <Text style={valueStyle}>{INSURANCE_DEMO.deductible}</Text>
              </View>
              <View
                style={[
                  fieldBox,
                  {
                    borderWidth: 1,
                    borderColor: warnOrange,
                    backgroundColor: isDark ? "rgba(251,146,60,0.08)" : "rgba(234,88,12,0.06)",
                  },
                ]}
              >
                <Text style={labelStyle}>EXPIRES</Text>
                <Text style={[valueStyle, { color: warnOrange }]}>{INSURANCE_DEMO.expiresDisplay}</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>MONTHLY PREMIUM</Text>
                <Text style={valueStyle}>{INSURANCE_DEMO.monthlyPremium}</Text>
              </View>
            </View>

            <View style={[innerWell, { marginTop: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="document-text-outline" size={22} color={theme.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                    {INSURANCE_DEMO.documentTitle}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }}>
                    Expires {INSURANCE_DEMO.expiresDisplay}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                    Policy #{INSURANCE_DEMO.policyNumber}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAddDocument}
              activeOpacity={0.85}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primary }}>+ Add document</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, marginTop: 20 }}>
        <MaterialCommunityIcons name="gavel" size={18} color={theme.secondary} />
        <Text
          style={{
            fontSize: 12,
            fontWeight: "700",
            color: theme.secondary,
            letterSpacing: 1.2,
          }}
        >
          {"LEGAL & REGISTRATION"}
        </Text>
      </View>

      <View style={surface}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={togglePedigree}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(234,179,8,0.2)" : "rgba(234,179,8,0.15)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="crown" size={22} color={isDark ? "#FBBF24" : "#B45309"} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Pedigree</Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: pedigreeRegistered ? (isDark ? "#4ADE80" : "#15803D") : theme.secondary,
              }}
            >
              {pedigreeRegistered ? "Registered" : "Not registered"}
            </Text>
            <Ionicons
              name={pedigreeExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {pedigreeExpanded ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={fieldBox}>
                <Text style={labelStyle}>REGISTRY</Text>
                <Text style={valueStyle}>{PEDIGREE_DEMO.registry}</Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>REG #</Text>
                <Text style={valueStyle}>{PEDIGREE_DEMO.regNumber}</Text>
              </View>
              <View style={[fieldBox, { width: "100%" }]}>
                <Text style={labelStyle}>BREED</Text>
                <Text style={valueStyle}>{breedDisplay}</Text>
              </View>
            </View>

            <View style={[innerWell, { marginTop: 12 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Ionicons name="document-text-outline" size={22} color={theme.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>
                    {PEDIGREE_DEMO.documentTitle}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }}>
                    {PEDIGREE_DEMO.documentDate}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 2 }}>
                    Reg #{PEDIGREE_DEMO.regNumber} · {breedDisplay}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleAddDocument}
              activeOpacity={0.85}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primary }}>+ Add document</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.border,
            marginVertical: 14,
          }}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={toggleCertificates}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(236,72,153,0.15)" : "rgba(236,72,153,0.1)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons name="certificate-outline" size={22} color={isDark ? "#F472B6" : "#DB2777"} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Certificates</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: isDark ? "#4ADE80" : "#15803D" }}>Current</Text>
            <Ionicons
              name={certificatesExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {certificatesExpanded ? (
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <View style={fieldBox}>
                <Text style={labelStyle}>SPAY/NEUTER</Text>
                <Text style={valueStyle} numberOfLines={3}>
                  {CERTIFICATES_DEMO.spayNeuter}
                </Text>
              </View>
              <View style={fieldBox}>
                <Text style={labelStyle}>CGC CERT #</Text>
                <Text style={valueStyle}>{CERTIFICATES_DEMO.cgcCertNumber}</Text>
              </View>
            </View>

            {CERTIFICATES_DEMO.documents.map((doc, index) => (
              <View
                key={`${doc.title}-${index}`}
                style={[
                  innerWell,
                  {
                    marginTop: index === 0 ? 12 : 8,
                  },
                ]}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
                  <Ionicons name="document-text-outline" size={22} color={theme.secondary} style={{ marginTop: 2 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: theme.foreground }}>{doc.title}</Text>
                    <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }}>{doc.date}</Text>
                    {doc.subtitle ? (
                      <Text style={{ fontSize: 12, color: theme.secondary, marginTop: 4 }}>{doc.subtitle}</Text>
                    ) : null}
                  </View>
                </View>
              </View>
            ))}

            <TouchableOpacity
              onPress={handleAddDocument}
              activeOpacity={0.85}
              style={{ marginTop: 12, alignSelf: "flex-start" }}
            >
              <Text style={{ fontSize: 15, fontWeight: "600", color: theme.primary }}>+ Add document</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View
          style={{
            height: StyleSheet.hairlineWidth,
            backgroundColor: theme.border,
            marginVertical: 14,
          }}
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAddDocument}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: isDark ? "rgba(45,212,191,0.15)" : "rgba(13,148,136,0.08)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="airplane-outline" size={22} color={isDark ? "#2DD4BF" : "#0D9488"} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Travel Docs</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: warnOrange }}>Expiring</Text>
            <Ionicons name="chevron-forward" size={22} color={theme.secondary} />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}
