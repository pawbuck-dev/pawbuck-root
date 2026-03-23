import WelcomeScreen from "@/components/onboarding/WelcomeScreen";
import { StatusBar } from "expo-status-bar";

export default function Welcome() {
  return (
    <>
      <StatusBar style="light" />
      <WelcomeScreen />
    </>
  );
}

