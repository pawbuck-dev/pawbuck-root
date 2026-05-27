/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|native-base|react-native-svg|moment)",
  ],
  collectCoverageFrom: [
    "services/{vaccinations,medicines,clinicalExams,labResults,medicationDoses,failedEmails,pendingEmailApprovals,petEmailList,healthBriefing,bookingsApi,vetBookings}.ts",
    "utils/{mailResolveApi,duplicateDetection,clinicalMutationErrors,medicalRecordExtraction,reviewMedication,healthHubAttention,healthBriefingUi,petEmail,validateEmail}.ts",
    "components/messages/**/*.{ts,tsx}",
    "components/health/**/*.{ts,tsx}",
    "components/email-approval/**/*.{ts,tsx}",
    "!**/*.d.ts",
  ],
};
