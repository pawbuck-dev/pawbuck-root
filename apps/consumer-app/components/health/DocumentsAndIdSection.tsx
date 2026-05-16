import DocumentCard from "@/components/health/DocumentCard";
import FinancialInvoicesSection from "@/components/health/FinancialInvoicesSection";
import { dashboardCareTeamCardChrome } from "@/constants/figmaHealthLayout";
import type { Pet } from "@/context/petsContext";
import { useTheme } from "@/context/themeContext";
import { useMiloUpload } from "@/hooks/useMiloUpload";
import { usePetDocuments } from "@/hooks/usePetDocuments";
import { invalidateClinicalQueries } from "@/utils/invalidateClinicalQueries";
import { formatClinicalSyncMessage } from "@/utils/medicalRecordExtraction";
import { pickPdfFile } from "@/utils/filePicker";
import { formatMicrochipDisplay } from "@/utils/microchipDisplay";
import { pickImageFromLibrary } from "@/utils/imagePicker";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import React, { useMemo, useState } from "react";
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

type Props = {
  pet: Pet | undefined;
};

/**
 * Health Records hub — Documents & ID (microchip + insurance in one card), Legal & Registration (pedigree, certificates, travel), Financial (invoices via FinancialInvoicesSection).
 */
export default function DocumentsAndIdSection({ pet }: Props) {
  const { theme, mode } = useTheme();
  const isDark = mode === "dark";
  const queryClient = useQueryClient();
  const { data: vaultDocs = [], isLoading: loadingVault } = usePetDocuments(pet?.id);
  const { uploadAndAnalyze, status: miloUploadStatus } = useMiloUpload();

  const insuranceDocs = useMemo(
    () => vaultDocs.filter((d) => d.document_type === "insurance_policy"),
    [vaultDocs]
  );
  const pedigreeDocs = useMemo(
    () => vaultDocs.filter((d) => d.document_type === "pedigree"),
    [vaultDocs]
  );
  const travelDocs = useMemo(
    () => vaultDocs.filter((d) => d.document_type === "travel_certificate"),
    [vaultDocs]
  );
  /** Vault rows shown at top (subsections list insurance / pedigree / travel separately). */
  const otherVaultDocs = useMemo(
    () =>
      vaultDocs.filter(
        (d) =>
          !["insurance_policy", "pedigree", "travel_certificate", "billing_invoice"].includes(
            d.document_type
          )
      ),
    [vaultDocs]
  );

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
              const row = await uploadAndAnalyze(pet.id, pet.name, img);
              await invalidateClinicalQueries(queryClient, pet.id);
              const syncMsg = formatClinicalSyncMessage(row.clinicalSync);
              Alert.alert("Saved", syncMsg ?? "Document analyzed and saved.");
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
              const row = await uploadAndAnalyze(pet.id, pet.name, pdf);
              await invalidateClinicalQueries(queryClient, pet.id);
              const syncMsg = formatClinicalSyncMessage(row.clinicalSync);
              Alert.alert("Saved", syncMsg ?? "Document analyzed and saved.");
            } catch (e) {
              Alert.alert("Error", e instanceof Error ? e.message : "Upload failed");
            }
          },
        },
      ]
    );
  };
  const [microExpanded, setMicroExpanded] = useState(false);
  const [insuranceExpanded, setInsuranceExpanded] = useState(false);
  const [pedigreeExpanded, setPedigreeExpanded] = useState(false);
  const [certificatesExpanded, setCertificatesExpanded] = useState(false);
  const [travelExpanded, setTravelExpanded] = useState(false);

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

  const toggleTravel = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setTravelExpanded((e) => !e);
  };

  const breedDisplay = pet?.breed?.trim() || "—";
  const pedigreeRegistered = pedigreeDocs.length > 0;

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
        {otherVaultDocs.length > 0 ? (
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
            {otherVaultDocs.map((d) => (
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
                {insuranceDocs.length > 0
                  ? `${insuranceDocs.length} polic${insuranceDocs.length === 1 ? "y" : "ies"} on file`
                  : "No policy on file"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  insuranceDocs.length > 0
                    ? isDark
                      ? "#4ADE80"
                      : "#15803D"
                    : theme.secondary,
              }}
            >
              {insuranceDocs.length > 0 ? "On file" : "None"}
            </Text>
            <Ionicons
              name={insuranceExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {insuranceExpanded ? (
          <View style={{ marginTop: 14 }}>
            {insuranceDocs.length > 0 ? (
              insuranceDocs.map((d) => <DocumentCard key={d.id} row={d} />)
            ) : (
              <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 20 }}>
                Upload an insurance policy document. Milo will extract details and save it here.
              </Text>
            )}

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
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }} numberOfLines={2}>
                {pedigreeDocs.length > 0
                  ? `${pedigreeDocs.length} registration document${pedigreeDocs.length === 1 ? "" : "s"} on file`
                  : "No pedigree document on file"}
              </Text>
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
              {pedigreeRegistered ? "On file" : "None"}
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
              <View style={[fieldBox, { width: "100%" }]}>
                <Text style={labelStyle}>BREED</Text>
                <Text style={valueStyle}>{breedDisplay}</Text>
              </View>
            </View>

            {pedigreeDocs.length > 0 ? (
              pedigreeDocs.map((d) => <DocumentCard key={d.id} row={d} />)
            ) : (
              <Text
                style={{
                  fontSize: 13,
                  color: theme.secondary,
                  lineHeight: 20,
                  marginTop: 12,
                }}
              >
                No pedigree document on file. Upload a registration or pedigree PDF or photo and Milo will save
                it here.
              </Text>
            )}

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
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: theme.secondary,
              }}
            >
              None
            </Text>
            <Ionicons
              name={certificatesExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {certificatesExpanded ? (
          <View style={{ marginTop: 14 }}>
            <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 20 }}>
              Upload certificates or other records with + Add document. Classified files appear under Saved
              documents above.
            </Text>

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
          onPress={toggleTravel}
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
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.foreground }}>Travel Docs</Text>
              <Text style={{ fontSize: 13, color: theme.secondary, marginTop: 4 }} numberOfLines={2}>
                {travelDocs.length > 0
                  ? `${travelDocs.length} travel document${travelDocs.length === 1 ? "" : "s"} on file`
                  : "No travel certificate on file"}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text
              style={{
                fontSize: 12,
                fontWeight: "700",
                color:
                  travelDocs.length > 0 ? (isDark ? "#4ADE80" : "#15803D") : theme.secondary,
              }}
            >
              {travelDocs.length > 0 ? "On file" : "None"}
            </Text>
            <Ionicons
              name={travelExpanded ? "chevron-up" : "chevron-down"}
              size={22}
              color={theme.secondary}
            />
          </View>
        </TouchableOpacity>

        {travelExpanded ? (
          <View style={{ marginTop: 14 }}>
            {travelDocs.length > 0 ? (
              travelDocs.map((d) => <DocumentCard key={d.id} row={d} />)
            ) : (
              <Text style={{ fontSize: 13, color: theme.secondary, lineHeight: 20 }}>
                Upload a travel certificate when you have one. Milo will classify and store it here.
              </Text>
            )}
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

      <FinancialInvoicesSection pet={pet} />
    </View>
  );
}
