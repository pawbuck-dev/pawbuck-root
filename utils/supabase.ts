import { Database } from "@/database.types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import "react-native-url-polyfill/auto";

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  }
);

// Upload file using standard upload
export async function uploadFile(
  file: ImagePicker.ImagePickerAsset,
  path: string
) {
  const { data, error } = await supabase.storage
    .from("pets")
    .upload(path, file.uri, {
      contentType: file.mimeType,
      upsert: true,
    });
  if (error) {
    throw error;
  } else {
    console.log("File uploaded successfully", data);
    return data;
  }
}
