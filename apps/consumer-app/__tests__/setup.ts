// Jest + jest-expo: extend here (e.g. @testing-library/react-native matchers) as the app grows.

process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY || "test-anon-key-for-jest";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);
