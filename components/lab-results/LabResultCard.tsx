import { DocumentViewerModal } from "@/components/common/DocumentViewerModal";
import { useLabResults } from "@/context/labResultsContext";
import { useTheme } from "@/context/themeContext";
import { LabResult } from "@/services/labResults";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LabResultEditModal } from "./LabResultEditModal";

interface LabResultCardProps {
  labResult: LabResult;
}

export function LabResultCard({ labResult }: LabResultCardProps) {
  const { theme } = useTheme();
  const { updateLabResultMutation, deleteLabResultMutation } = useLabResults();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showAllResults, setShowAllResults] = useState(false);

  const hasDocument = !!labResult.document_url;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Date not specified";
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewDocument = () => {
    setShowDocumentModal(true);
  };

  const handleLongPress = () => {
    const options: Array<{
      text: string;
      onPress?: () => void;
      style?: "cancel" | "destructive";
    }> = [];

    if (hasDocument) {
      options.push({
        text: "View Document",
        onPress: handleViewDocument,
      });
    }

    options.push(
      {
        text: "Edit",
        onPress: () => setShowEditModal(true),
      },
      {
        text: "Delete",
        onPress: () => handleDelete(),
        style: "destructive",
      },
      {
        text: "Cancel",
        style: "cancel",
      }
    );

    Alert.alert(
      labResult.test_type,
      "Choose an action",
      options,
      { cancelable: true }
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete Lab Result",
      `Are you sure you want to delete ${labResult.test_type}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteLabResultMutation.mutate(labResult.id);
          },
        },
      ]
    );
  };

  const handleSaveEdit = (id: string, updates: Partial<LabResult>) => {
    updateLabResultMutation.mutate(
      { id, updates },
      {
        onSuccess: () => {
          setShowEditModal(false);
        },
      }
    );
  };

  // Count abnormal results
  const abnormalCount = labResult.results.filter(
    (r) => r.status !== "normal"
  ).length;
  const totalCount = labResult.results.length;

  return (
    <>
      <TouchableOpacity
        className="mb-4 p-4 rounded-2xl"
        style={{ backgroundColor: theme.card }}
        onLongPress={handleLongPress}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.2)" }}
            >
              <Ionicons name="flask" size={20} color={theme.primary} />
            </View>
            <View className="flex-1">
              <Text
                className="text-base font-semibold"
                style={{ color: theme.foreground }}
                numberOfLines={1}
              >
                {labResult.test_type}
              </Text>
              <View className="flex-row items-center gap-2 mt-1">
                {abnormalCount > 0 ? (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: "#ef4444" }}
                    >
                      {abnormalCount} Abnormal
                    </Text>
                  </View>
                ) : (
                  <View
                    className="px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(34, 197, 94, 0.2)" }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: "#22c55e" }}
                    >
                      All Normal
                    </Text>
                  </View>
                )}
                <Text className="text-xs" style={{ color: theme.secondary }}>
                  {totalCount} test{totalCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          </View>
          {hasDocument && (
            <TouchableOpacity
              className="w-9 h-9 rounded-full items-center justify-center ml-2"
              style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
              onPress={handleViewDocument}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="document-attach" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Details */}
        <View className="ml-13">
          {/* Test Date */}
          {labResult.test_date && (
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="calendar-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                {formatDate(labResult.test_date)}
              </Text>
            </View>
          )}

          {/* Lab Name */}
          {labResult.lab_name && (
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="business-outline"
                size={14}
                color={theme.secondary}
              />
              <Text
                className="text-sm ml-2"
                style={{ color: theme.secondary }}
                numberOfLines={1}
              >
                {labResult.lab_name}
              </Text>
            </View>
          )}

          {/* Ordered By */}
          {labResult.ordered_by && (
            <View className="flex-row items-center mb-2">
              <Ionicons
                name="person-outline"
                size={14}
                color={theme.secondary}
              />
              <Text className="text-sm ml-2" style={{ color: theme.secondary }}>
                {labResult.ordered_by}
              </Text>
            </View>
          )}

          {/* Sample of Results */}
          {labResult.results.length > 0 && (
            <View className="mt-2 pt-2 border-t" style={{ borderTopColor: theme.background }}>
              {showAllResults ? (
                <>
                  <View 
                    style={{ 
                      maxHeight: 300,
                      borderRadius: 8,
                      backgroundColor: theme.background,
                      padding: 8,
                    }}
                  >
                    <ScrollView 
                      showsVerticalScrollIndicator={true}
                      nestedScrollEnabled={true}
                      scrollEnabled={true}
                      contentContainerStyle={{ paddingBottom: 4 }}
                    >
                      {labResult.results.map((result, index) => (
                        <View key={index} className="flex-row items-center justify-between mb-2">
                          <Text
                            className="text-xs flex-1"
                            style={{ color: theme.secondary }}
                            numberOfLines={1}
                          >
                            {result.testName}
                          </Text>
                          <View className="flex-row items-center gap-1">
                            <Text
                              className="text-xs font-medium"
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
                                size={12}
                                color="#ef4444"
                              />
                            )}
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setShowAllResults(false)}
                    className="mt-2 py-1"
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{ color: theme.primary }}
                    >
                      Show less
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {labResult.results.slice(0, 3).map((result, index) => (
                    <View key={index} className="flex-row items-center justify-between mb-1">
                      <Text
                        className="text-xs flex-1"
                        style={{ color: theme.secondary }}
                        numberOfLines={1}
                      >
                        {result.testName}
                      </Text>
                      <View className="flex-row items-center gap-1">
                        <Text
                          className="text-xs font-medium"
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
                            size={12}
                            color="#ef4444"
                          />
                        )}
                      </View>
                    </View>
                  ))}
                  {labResult.results.length > 3 && (
                    <TouchableOpacity 
                      onPress={() => setShowAllResults(true)}
                      className="mt-1 py-1"
                    >
                      <Text
                        className="text-xs font-medium"
                        style={{ color: theme.primary }}
                      >
                        +{labResult.results.length - 3} more
                      </Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          )}
        </View>

        {/* Long press hint */}
        <Text
          className="text-xs text-center mt-3"
          style={{ color: theme.secondary, opacity: 0.6 }}
        >
          Long press to edit or delete
        </Text>
      </TouchableOpacity>

      <LabResultEditModal
        visible={showEditModal}
        labResult={labResult}
        onClose={() => setShowEditModal(false)}
        onSave={handleSaveEdit}
        loading={updateLabResultMutation.isPending}
      />

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        visible={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documentPath={labResult.document_url || null}
        title="Lab Result Document"
      />
    </>
  );
}

