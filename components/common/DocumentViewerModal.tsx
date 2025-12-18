import { useTheme } from "@/context/themeContext";
import { getCachedSignedUrl } from "@/utils/image";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface DocumentViewerModalProps {
  visible: boolean;
  onClose: () => void;
  documentPath: string | null;
  title?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  visible,
  onClose,
  documentPath,
  title = "Document",
}) => {
  const { theme } = useTheme();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isPdf = documentPath?.toLowerCase().endsWith(".pdf");

  useEffect(() => {
    if (visible && documentPath) {
      loadDocument();
    } else {
      setSignedUrl(null);
      setLoading(true);
      setError(null);
    }
  }, [visible, documentPath]);

  const loadDocument = async () => {
    if (!documentPath) return;

    setLoading(true);
    setError(null);

    try {
      const url = await getCachedSignedUrl(documentPath);
      setSignedUrl(url);
    } catch (err) {
      console.error("Error loading document:", err);
      setError("Failed to load document");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInBrowser = async () => {
    if (signedUrl) {
      await WebBrowser.openBrowserAsync(signedUrl);
    }
  };

  if (!documentPath) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1" style={{ backgroundColor: theme.background }}>
        {/* Header */}
        <View
          className="px-6 pt-4 pb-4 border-b flex-row items-center justify-between"
          style={{
            backgroundColor: theme.card,
            borderBottomColor: theme.background,
          }}
        >
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.primary} />
          </TouchableOpacity>
          <Text
            className="text-lg font-semibold"
            style={{ color: theme.foreground }}
          >
            {title}
          </Text>
          <TouchableOpacity
            onPress={handleOpenInBrowser}
            disabled={!signedUrl}
          >
            <Ionicons
              name="open-outline"
              size={24}
              color={signedUrl ? theme.primary : theme.secondary}
            />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View className="flex-1 items-center justify-center">
          {loading && (
            <View className="items-center">
              <ActivityIndicator size="large" color={theme.primary} />
              <Text
                className="mt-4 text-sm"
                style={{ color: theme.secondary }}
              >
                Loading document...
              </Text>
            </View>
          )}

          {error && (
            <View className="items-center p-6">
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}
              >
                <Ionicons name="alert-circle" size={32} color="#FF3B30" />
              </View>
              <Text
                className="text-base font-medium text-center"
                style={{ color: theme.foreground }}
              >
                {error}
              </Text>
              <TouchableOpacity
                className="mt-4 px-6 py-3 rounded-xl"
                style={{ backgroundColor: theme.primary }}
                onPress={loadDocument}
              >
                <Text className="text-white font-medium">Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {!loading && !error && signedUrl && (
            <>
              {isPdf ? (
                // PDF View - show a button to open in browser
                <View className="items-center p-6">
                  <View
                    className="w-20 h-20 rounded-full items-center justify-center mb-4"
                    style={{ backgroundColor: "rgba(95, 196, 192, 0.15)" }}
                  >
                    <Ionicons
                      name="document-text"
                      size={40}
                      color={theme.primary}
                    />
                  </View>
                  <Text
                    className="text-lg font-semibold text-center mb-2"
                    style={{ color: theme.foreground }}
                  >
                    PDF Document
                  </Text>
                  <Text
                    className="text-sm text-center mb-6"
                    style={{ color: theme.secondary }}
                  >
                    Tap the button below to view the PDF document
                  </Text>
                  <TouchableOpacity
                    className="px-8 py-4 rounded-xl flex-row items-center"
                    style={{ backgroundColor: theme.primary }}
                    onPress={handleOpenInBrowser}
                  >
                    <Ionicons name="open-outline" size={20} color="white" />
                    <Text className="text-white font-semibold ml-2">
                      Open PDF
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Image View
                <View className="flex-1 w-full">
                  <Image
                    source={{ uri: signedUrl }}
                    style={{ flex: 1, width: "100%" }}
                    contentFit="contain"
                    transition={200}
                  />
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};
