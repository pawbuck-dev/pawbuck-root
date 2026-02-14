import { useTheme } from "@/context/themeContext";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageStyle,
  StyleProp,
  View,
} from "react-native";

type NetworkImageProps = {
  /** The image URL to display */
  uri: string;
  /** Optional className for NativeWind styling */
  className?: string;
  /** Optional inline style object for additional styling */
  style?: StyleProp<ImageStyle>;
  /** How the image should be resized to fit its container */
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
};

/**
 * NetworkImage Component
 *
 * Displays images from network URLs with automatic loading states.
 * Shows a loading indicator while the image is being fetched and handles errors gracefully.
 *
 * @example
 * ```tsx
 * <NetworkImage
 *   uri="https://example.com/image.jpg"
 *   className="w-full h-full"
 *   resizeMode="cover"
 * />
 * ```
 */
export default function NetworkImage({
  uri,
  className = "",
  style,
  resizeMode = "cover",
}: NetworkImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { theme } = useTheme();

  if (error) {
    return (
      <View className={`items-center justify-center ${className}`}>
        <Ionicons name="image-outline" size={40} color="#999" />
      </View>
    );
  }

  return (
    <View className={className} style={style}>
      {loading && (
        <View className="absolute inset-0 items-center justify-center">
          <ActivityIndicator size="small" color={theme.primary} />
        </View>
      )}
      <Image
        source={{ uri }}
        className={className}
        style={style}
        resizeMode={resizeMode}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={(e) => {
          console.error("Error loading image:", e.nativeEvent.error);
          setLoading(false);
          setError(true);
        }}
      />
    </View>
  );
}
