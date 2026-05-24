// Jest + jest-expo: extend here (e.g. @testing-library/react-native matchers) as the app grows.
//
// Auth: this file only sets public Supabase env vars — it does **not** mock `supabase.auth.getSession`
// or `onAuthStateChange` with a permanent user. Negative auth tests must supply their own Supabase
// mocks so sessions are not “stuck logged in” across the suite.

process.env.EXPO_PUBLIC_SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "http://localhost:54321";
process.env.EXPO_PUBLIC_SUPABASE_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_KEY || "test-anon-key-for-jest";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    setLogLevel: jest.fn(),
    logIn: jest.fn().mockResolvedValue({ customerInfo: {} }),
    logOut: jest.fn().mockResolvedValue({ customerInfo: {} }),
    getCustomerInfo: jest.fn().mockResolvedValue({ entitlements: { active: {} } }),
  },
  LOG_LEVEL: { VERBOSE: "VERBOSE", ERROR: "ERROR" },
}));

jest.mock("react-native-purchases-ui", () => ({
  __esModule: true,
  default: {
    presentPaywall: jest.fn(),
  },
  PAYWALL_RESULT: {
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
    CANCELLED: "CANCELLED",
    NOT_PRESENTED: "NOT_PRESENTED",
    ERROR: "ERROR",
  },
}));
