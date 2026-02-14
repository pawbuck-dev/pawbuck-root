/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Outfit_400Regular"],
        thin: ["Outfit_100Thin"],
        extralight: ["Outfit_200ExtraLight"],
        light: ["Outfit_300Light"],
        normal: ["Outfit_400Regular"],
        medium: ["Outfit_500Medium"],
        semibold: ["Outfit_600SemiBold"],
        bold: ["Outfit_700Bold"],
        extrabold: ["Outfit_800ExtraBold"],
        black: ["Outfit_900Black"],
      },
    },
  },
  plugins: [],
};
