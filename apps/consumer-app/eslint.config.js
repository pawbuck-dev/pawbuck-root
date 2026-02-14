// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
    settings: {
      "import/resolver": {
        node: {
          extensions: [
            ".ts",
            ".tsx",
            ".android.ts",
            ".ios.ts",
            ".android.tsx",
            ".ios.tsx",
          ],
        },
      },
    },
    rules: {
      "react/no-unescaped-entities": "off",
    },
  },
]);
