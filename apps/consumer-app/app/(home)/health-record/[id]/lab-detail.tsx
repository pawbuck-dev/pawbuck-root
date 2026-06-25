import { DomainCategoryIconWell } from "@/components/ui/IconWell";
import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import {
  OverflowAction,
  RecordOverflowSheet,
} from "@/components/health/RecordOverflowSheet";
import { LabResultEditModal } from "@/components/lab-results/LabResultEditModal";
import { useTheme } from "@/context/themeContext";
import { useLabResults } from "@/context/labResultsContext";
import { LabResult } from "@/services/labResults";
import { shareStorageDocument, shareTextSummary } from "@/utils/documentShare";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function LabDetailScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { labResults, updateLabResultMutation, deleteLabResultMutation } =
    useLabResults();

  const params = useLocalSearchParams<{ id: string; labId?: string }>();
  const rawLid = params.labId;
  const labId = Array.isArray(rawLid) ? rawLid[0] : rawLid;

  const [menuOpen, setMenuOpen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDoc, setShowDoc] = useState(false);

  const labResult = useMemo(
    () => labResults.find((l) => l.id === labId),
    [labResults, labId]
  );

  const hasDocument = !!labResult?.document_url;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not specified";
    return new Date(dateString).toLocaleDateString();
  };

  const handleShare = () => {
    if (!labResult) return;
    const lines = labResult.results.map(
      (r) =>
        `${r.testName}: ${r.value} ${r.unit} (${r.status}) ref ${r.referenceRange}`
    );
    const body = [
      labResult.test_date ? `Test date: ${formatDate(labResult.test_date)}` : null,
      labResult.lab_name ? `Lab: ${labResult.lab_name}` : null,
      labResult.ordered_by ? `Ordered by: ${labResult.ordered_by}` : null,
      "",
      ...lines,
    ]
      .filter((x) => x !== null && x !== "")
      .join("\n");

    if (labResult.document_url) {
      void shareStorageDocument(
        labResult.document_url,
        `${labResult.test_type.replace(/\s+/g, "_")}_lab`
      );
    } else {
      void shareTextSummary(labResult.test_type, body);
    }
  };

  const handleDownload = () => {
    if (!labResult?.document_url) {
      Alert.alert("Download", "No document is attached to this record.");
      return;
    }
    void shareStorageDocument(
      labResult.document_url,
      `${labResult.test_type.replace(/\s+/g, "_")}_lab`
    );
  };

  const handleDelete = () => {
    if (!labResult) return;
    Alert.alert(
      "Delete Lab Result",
      `Are you sure you want to delete ${labResult.test_type}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLabResultMutation.mutate(labResult.id, {
              onSuccess: () => router.back(),
            });
          },
        },
      ]
    );
  };

  const handleSaveEdit = (id: string, updates: Partial<LabResult>) => {
    updateLabResultMutation.mutate(
      { id, updates },
      {
        onSuccess: () => setShowEdit(false),
      }
    );
  };

  const menuActions: OverflowAction[] = [
    { label: "Edit", onPress: () => setShowEdit(true) },
    { label: "Share", onPress: handleShare },
    { label: "Download", onPress: handleDownload },
    { label: "Delete", onPress: handleDelete, destructive: true },
  ];

  if (!labId) {
    return (
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: theme.background, paddingTop: insets.top }}
      >
        <Text style={{ color: theme.secondary }}>Missing lab result id.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text style={{ color: theme.primary, fontWeight: "600" }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!labResult) {
    return (
      <View
        className="flex-1 items-center justify-center"
        style={{ backgroundColor: theme.background, paddingTop: insets.top }}
      >
        <ActivityIndicator color={theme.primary} />
        <Text className="mt-3" style={{ color: theme.secondary }}>
          Loading…
        </Text>
      </View>
    );
  }

  const abnormalCount = labResult.results.filter((r) => r.status !== "normal").length;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.background }}>
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 20,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={12}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="chevron-back" size={22} color={theme.foreground} />
        </TouchableOpacity>
        <Text
          className="text-base font-semibold flex-1 text-center mx-2"
          style={{ color: theme.foreground }}
          numberOfLines={1}
        >
          Lab result
        </Text>
        <TouchableOpacity
          onPress={() => setMenuOpen(true)}
          hitSlop={12}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: theme.card }}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={theme.foreground} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="p-5 rounded-2xl mb-4"
          style={{ backgroundColor: theme.card }}
        >
          <View className="flex-row items-start">
            <View className="mr-3">
              <DomainCategoryIconWell category="labs" size="xl" />
            </View>
            <View className="flex-1">
              <Text
                className="text-xl font-bold"
                style={{ color: theme.foreground }}
              >
                {labResult.test_type}
              </Text>
              <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                {abnormalCount > 0 ? (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: "#ef4444" }}>
                      {abnormalCount} abnormal
                    </Text>
                  </View>
                ) : (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: "#22c55e" }}>
                      All normal
                    </Text>
                  </View>
                )}
                <Text className="text-xs" style={{ color: theme.secondary }}>
                  {labResult.results.length} test
                  {labResult.results.length !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-5 gap-3">
            {labResult.test_date && (
              <Row
                icon="calendar-outline"
                label="Test date"
                value={formatDate(labResult.test_date)}
                theme={theme}
              />
            )}
            {labResult.lab_name && (
              <Row
                icon="business-outline"
                label="Lab"
                value={labResult.lab_name}
                theme={theme}
              />
            )}
            {labResult.ordered_by && (
              <Row
                icon="person-outline"
                label="Ordered by"
                value={labResult.ordered_by}
                theme={theme}
              />
            )}
          </View>

          {labResult.results.length > 0 && (
            <View className="mt-6">
              <Text className="text-xs font-semibold mb-3" style={{ color: theme.primary }}>
                RESULTS
              </Text>
              {labResult.results.map((result, index) => (
                <View
                  key={`${result.testName}-${index}`}
                  className="flex-row items-center justify-between py-2 border-b"
                  style={{ borderBottomColor: theme.background }}
                >
                  <Text
                    className="text-sm flex-1 pr-2"
                    style={{ color: theme.foreground }}
                    numberOfLines={2}
                  >
                    {result.testName}
                  </Text>
                  <View className="items-end">
                    <View className="flex-row items-center gap-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color:
                            result.status === "high" || result.status === "low"
                              ? "#ef4444"
                              : theme.foreground,
                        }}
                      >
                        {result.value} {result.unit}
                      </Text>
                      {result.status !== "normal" && (
                        <Ionicons
                          name={result.status === "high" ? "arrow-up" : "arrow-down"}
                          size={14}
                          color="#ef4444"
                        />
                      )}
                    </View>
                    {result.referenceRange ? (
                      <Text className="text-xs mt-0.5" style={{ color: theme.secondary }}>
                        Ref: {result.referenceRange}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          )}

          {hasDocument && (
            <TouchableOpacity
              onPress={() => setShowDoc(true)}
              className="mt-6 py-3 rounded-xl items-center flex-row justify-center gap-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
            >
              <Ionicons name="document-attach" size={20} color={theme.primary} />
              <Text className="font-semibold" style={{ color: theme.primary }}>
                View document
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <RecordOverflowSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        actions={menuActions}
      />

      <LabResultEditModal
        visible={showEdit}
        labResult={labResult}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveEdit}
        loading={updateLabResultMutation.isPending}
      />

      <DocumentViewerModal
        visible={showDoc}
        onClose={() => setShowDoc(false)}
        documentPath={labResult.document_url || null}
        title="Lab Result Document"
      />
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  theme: { secondary: string; foreground: string };
}) {
  return (
    <View className="flex-row items-start">
      <Ionicons name={icon} size={16} color={theme.secondary} style={{ marginTop: 2 }} />
      <View className="ml-2 flex-1">
        <Text className="text-xs" style={{ color: theme.secondary }}>
          {label}
        </Text>
        <Text
          className="text-base font-medium mt-0.5"
          style={{ color: theme.foreground }}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}
