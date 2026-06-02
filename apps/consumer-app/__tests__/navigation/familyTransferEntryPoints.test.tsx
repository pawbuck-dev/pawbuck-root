import InitialWelcomeScreen from "@/components/onboarding/InitialWelcomeScreen";
import { PROFILE_MY_PETS_LINK_ROWS } from "@/components/profile/profileMenuConfig";
import {
  authResumeParamsForNavigation,
  authResumeParamsToRouteParams,
  hasAuthResumeTarget,
  parseAuthResumeParams,
} from "@/utils/authResumeParams";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: {
      background: "#0a1a1a",
      foreground: "#fff",
      primary: "#3BD0D2",
    },
    mode: "dark",
  }),
}));

jest.mock("@/components/ui", () => ({
  CTA: ({
    label,
    onPress,
  }: {
    label: string;
    onPress: () => void;
  }) => {
    const { Pressable, Text } = require("react-native");
    return (
      <Pressable onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("InitialWelcomeScreen entry points", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("navigates to join-household and transfer-pet recipient flows", () => {
    render(
      <SafeAreaProvider initialMetrics={initialMetrics}>
        <InitialWelcomeScreen />
      </SafeAreaProvider>
    );

    fireEvent.press(screen.getByText("Join with invite code"));
    expect(mockPush).toHaveBeenCalledWith("/join-household");

    fireEvent.press(screen.getByText("Claim a transferred pet"));
    expect(mockPush).toHaveBeenCalledWith("/transfer-pet");
  });
});

describe("profileMenuConfig recipient routes", () => {
  it("routes Claim a Pet to recipient wizard and includes Join household", () => {
    const claim = PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "claim");
    const join = PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "join-household");
    const transfer = PROFILE_MY_PETS_LINK_ROWS.find((r) => r.id === "transfer");

    expect(claim?.href).toBe("/transfer-pet");
    expect(join?.href).toBe("/join-household");
    expect(transfer?.href).toBe("/(home)/transfer-pet");
  });
});

describe("authResumeParams", () => {
  it("detects resume targets including inviteToken-only accept-invite", () => {
    const resume = parseAuthResumeParams({
      returnTo: "/accept-invite",
      inviteToken: "abc123",
    });
    expect(hasAuthResumeTarget(resume)).toBe(true);
    expect(authResumeParamsToRouteParams(resume)).toEqual({ inviteToken: "abc123" });
  });

  it("serializes all params for auth navigation", () => {
    expect(
      authResumeParamsForNavigation({
        returnTo: "/join-household/step2",
        inviteCode: "MTCH-2026-ABC",
      })
    ).toEqual({
      returnTo: "/join-household/step2",
      transferCode: "",
      inviteCode: "MTCH-2026-ABC",
      inviteToken: "",
    });
  });

  it("returns false when returnTo is missing", () => {
    expect(hasAuthResumeTarget({ transferCode: "TRF-1" })).toBe(false);
  });

  it("detects transfer resume to step 2", () => {
    const resume = parseAuthResumeParams({
      returnTo: "/transfer-pet/step2",
      transferCode: "TRF-ABC",
    });
    expect(hasAuthResumeTarget(resume)).toBe(true);
    expect(authResumeParamsToRouteParams(resume)).toEqual({ transferCode: "TRF-ABC" });
  });
});
