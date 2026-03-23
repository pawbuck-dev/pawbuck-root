/**
 * Node/ts-jest preset until jest-expo is bumped to SDK 54 for React Native component tests.
 * Pet-walker UI tests can switch back to `preset: 'jest-expo'` once aligned with consumer-app.
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^@pawbuck/api-client$": "<rootDir>/../../packages/pawbuck-api-client/src/index.ts",
  },
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: { esModuleInterop: true },
      },
    ],
  },
};
