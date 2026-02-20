import { useTheme } from "@/context/themeContext";
import { getCachedSignedUrl } from "@/utils/image";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ActivityIndicator, ImageStyle, StyleProp, View } from "react-native";
import NetworkImage from "./NetworkImage";

type PrivateImageProps = {
  /** The Supabase storage bucket name (e.g., "pets") */
  bucketName: string;
  /** The file path within the bucket (e.g., "userId/pet-profile-photos/petId.jpg") */
  filePath: string;
  /** Optional className for NativeWind styling */
  className?: string;
  /** Optional inline style object for additional styling */
  style?: StyleProp<ImageStyle>;
  /** How the image should be resized to fit its container */
  resizeMode?: "cover" | "contain" | "stretch" | "repeat" | "center";
  /** Expiration time for the signed URL in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
};

/**
 * PrivateImage Component
 *
 * Displays images from private Supabase storage buckets by automatically fetching signed URLs.
 * Handles loading states and errors with a static fallback icon.
 *
 * @example
 * ```tsx
 * <PrivateImage
 *   bucketName="pets"
 *   filePath="userId/pet-profile-photos/petId.jpg"
 *   className="w-40 h-40 rounded-full"
 *   resizeMode="cover"
 * />
 * ```
 */
export default function PrivateImage({
  bucketName,
  filePath,
  className = "",
  style,
  resizeMode = "cover",
  expiresIn = 3600,
}: PrivateImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const { theme } = useTheme();

  useEffect(() => {
    const fetchSignedUrl = async () => {
      if (!filePath) {
        setLoading(false);
        setError(true);
        return;
      }

      setLoading(true);
      setError(false);
      setImageUrl(null);
      try {
        const url = await getCachedSignedUrl(filePath, expiresIn);
        setImageUrl(url);
        setError(false);
      } catch (err) {
        console.error("Error fetching signed URL:", err);
        setError(true);
        setImageUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [filePath, expiresIn]);

  if (loading) {
    return (
      <View className={`items-center justify-center ${className}`}>
        <ActivityIndicator size="small" color={theme.primary} />
      </View>
    );
  }

  if (error || !imageUrl) {
    return (
      <View className={`items-center justify-center ${className}`}>
        <Ionicons name="image-outline" size={40} color="#999" />
      </View>
    );
  }

  return (
    <NetworkImage
      uri={imageUrl}
      className={className}
      style={style}
      resizeMode={resizeMode}
    />
  );
}
