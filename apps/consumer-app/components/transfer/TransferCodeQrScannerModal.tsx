import { extractTransferCodeFromQrPayload } from "@/utils/transferCodeFromQr";
import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCodeScanned: (code: string) => void;
};

export function TransferCodeQrScannerModal({ visible, onClose, onCodeScanned }: Props) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanError, setScanError] = useState<string | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      handledRef.current = false;
      setScanError(null);
      return;
    }
    if (permission && !permission.granted && permission.canAskAgain) {
      void requestPermission();
    }
  }, [visible, permission, requestPermission]);

  const handleBarcode = useCallback(
    (result: BarcodeScanningResult) => {
      if (handledRef.current) return;
      const code = extractTransferCodeFromQrPayload(result.data ?? "");
      if (!code) {
        setScanError("That QR code doesn’t look like a PawBuck transfer code.");
        return;
      }
      handledRef.current = true;
      setScanError(null);
      onCodeScanned(code);
      onClose();
    },
    [onClose, onCodeScanned],
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: "#000", paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close scanner"
            hitSlop={12}
            style={styles.closeBtn}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Scan transfer QR</Text>
          <View style={{ width: 40 }} />
        </View>

        {!permission ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : !permission.granted ? (
          <View style={styles.center}>
            <Ionicons name="camera-outline" size={48} color="#FFFFFF" />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionBody}>
              Allow camera access to scan the transfer QR code from the previous owner.
            </Text>
            {permission.canAskAgain ? (
              <Pressable
                onPress={() => void requestPermission()}
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.primaryBtnText, { color: theme.primaryForeground }]}>
                  Allow camera
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => void Linking.openSettings()}
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={[styles.primaryBtnText, { color: theme.primaryForeground }]}>
                  Open Settings
                </Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.cameraWrap}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarcode}
            />
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>Point at the transfer QR code</Text>
              {scanError ? <Text style={styles.error}>{scanError}</Text> : null}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "600" },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  permissionTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "700", textAlign: "center" },
  permissionBody: { color: "rgba(255,255,255,0.7)", fontSize: 15, textAlign: "center", lineHeight: 22 },
  primaryBtn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "600" },
  cameraWrap: { flex: 1, position: "relative" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 80,
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    backgroundColor: "transparent",
  },
  hint: {
    marginTop: 24,
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  error: {
    marginTop: 12,
    color: "#FF6B6B",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
