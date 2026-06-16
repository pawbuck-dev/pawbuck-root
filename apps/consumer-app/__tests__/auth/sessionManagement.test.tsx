/**
 * Negative auth paths: forced logout, home-stack guard, refresh failure signal.
 * Jest setup (__tests__/setup.ts) does not mock Supabase auth — each suite supplies its own mocks.
 */
import HomeLayout from "@/app/(home)/_layout";
import { AuthProvider, useAuth } from "@/context/authContext";
import { act, render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

jest.mock("@/services/revenuecat", () => ({
  syncRevenueCatUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/useNotificationHandler", () => ({
  useNotificationHandlers: () => ({ deviceId: null, pushToken: null }),
}));

jest.mock("@/utils/supabase", () => {
  const g = globalThis as unknown as {
    __PAWBUCK_AUTH_BUS__?: {
      nextInitial: { user: { id: string } } | null;
      listeners: Array<(event: string, session: unknown) => void>;
      emit(event: string, session: unknown): void;
    };
  };
  const bus = {
    nextInitial: null as { user: { id: string } } | null,
    listeners: [] as Array<(event: string, session: unknown) => void>,
    emit(event: string, session: unknown) {
      bus.listeners.forEach((l) => void l(event, session));
    },
  };
  g.__PAWBUCK_AUTH_BUS__ = bus;
  return {
    supabase: {
      auth: {
        onAuthStateChange: jest.fn((cb: (event: string, session: unknown) => void) => {
          bus.listeners.push(cb);
          queueMicrotask(() => {
            cb("INITIAL_SESSION", bus.nextInitial);
          });
          return {
            data: {
              subscription: {
                unsubscribe: jest.fn(() => {
                  const idx = bus.listeners.indexOf(cb);
                  if (idx >= 0) bus.listeners.splice(idx, 1);
                }),
              },
            },
          };
        }),
        signOut: jest.fn().mockResolvedValue({ error: null }),
      },
      from: jest.fn(() => ({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      })),
    },
  };
});

jest.mock("expo-router", () => {
  const g = globalThis as unknown as {
    __PAWBUCK_EXPO_ROUTER_TEST__?: { replace: jest.Mock; push: jest.Mock; back: jest.Mock };
    __PAWBUCK_SEGMENTS__?: string[];
  };
  const nav = {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  };
  g.__PAWBUCK_EXPO_ROUTER_TEST__ = nav;
  return {
    router: nav,
    useRouter: () => nav,
    useSegments: jest.fn(() => g.__PAWBUCK_SEGMENTS__ ?? ["(home)", "home"]),
    Slot: () => null,
  };
});

jest.mock("@/context/themeContext", () => ({
  useTheme: () => ({
    theme: { background: "#fff", foreground: "#111" },
    mode: "light" as const,
  }),
}));

jest.mock("@/hooks/useMessageThreadsRealtime", () => ({
  useMessageThreadsRealtime: () => {},
}));

jest.mock("@/components/chat/MiloChatModal", () => ({
  MiloChatModal: () => null,
}));

jest.mock("@/components/layout/HomeIndicator", () => ({
  HomeIndicator: () => null,
}));

function authBus() {
  const b = (globalThis as unknown as { __PAWBUCK_AUTH_BUS__?: { nextInitial: { user: { id: string } } | null; emit(e: string, s: unknown): void } }).__PAWBUCK_AUTH_BUS__;
  if (!b) throw new Error("auth bus missing");
  return b;
}

function testNav() {
  const n = (globalThis as unknown as { __PAWBUCK_EXPO_ROUTER_TEST__?: { replace: jest.Mock } }).__PAWBUCK_EXPO_ROUTER_TEST__;
  if (!n) throw new Error("nav missing");
  return n;
}

function setTestSegments(segments: string[]) {
  (globalThis as unknown as { __PAWBUCK_SEGMENTS__: string[] }).__PAWBUCK_SEGMENTS__ = segments;
}

function AuthProbe() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Text testID="auth-probe">loading</Text>;
  return <Text testID="auth-probe">{isAuthenticated ? "signed-in" : "signed-out"}</Text>;
}

const initialMetrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

describe("sessionManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authBus().nextInitial = null;
    delete (globalThis as unknown as { __PAWBUCK_SEGMENTS__?: string[] }).__PAWBUCK_SEGMENTS__;
  });

  describe("AuthProvider + onAuthStateChange", () => {
    it("redirects to welcome on SIGNED_OUT (forced logout)", async () => {
      authBus().nextInitial = { user: { id: "550e8400-e29b-41d4-a716-446655440099" } };
      render(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </SafeAreaProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("signed-in")).toBeTruthy();
      });

      await act(async () => {
        authBus().emit("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByText("signed-out")).toBeTruthy();
      });
      expect(testNav().replace).toHaveBeenCalledWith("/");
    });

    it("redirects to reset-password on PASSWORD_RECOVERY", async () => {
      authBus().nextInitial = null;
      render(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </SafeAreaProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("signed-out")).toBeTruthy();
      });

      await act(async () => {
        authBus().emit("PASSWORD_RECOVERY", { user: { id: "550e8400-e29b-41d4-a716-446655440099" } });
      });

      expect(testNav().replace).toHaveBeenCalledWith("/reset-password");
    });

    it("redirects when TOKEN_REFRESHED delivers no session (refresh token failure)", async () => {
      authBus().nextInitial = { user: { id: "550e8400-e29b-41d4-a716-446655440099" } };
      render(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </SafeAreaProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("signed-in")).toBeTruthy();
      });
      testNav().replace.mockClear();

      await act(async () => {
        authBus().emit("TOKEN_REFRESHED", null);
      });

      await waitFor(() => {
        expect(screen.getByText("signed-out")).toBeTruthy();
      });
      expect(testNav().replace).toHaveBeenCalledWith("/");
    });

    /**
     * Mid-action (e.g. vet booking): the app does not persist draft booking params today;
     * losing auth navigates to welcome so the user is not left on a broken authenticated shell.
     */
    it("still redirects to welcome when session ends while user is on a deep home-stack route", async () => {
      authBus().nextInitial = { user: { id: "550e8400-e29b-41d4-a716-446655440099" } };
      setTestSegments(["(home)", "book-vet-visit", "pick-datetime"]);

      render(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <AuthProvider>
            <AuthProbe />
          </AuthProvider>
        </SafeAreaProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("signed-in")).toBeTruthy();
      });
      testNav().replace.mockClear();

      await act(async () => {
        authBus().emit("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByText("signed-out")).toBeTruthy();
      });
      expect(testNav().replace).toHaveBeenCalledWith("/");
    });
  });

  describe("(home) layout guard", () => {
    it("redirects unauthenticated users who land in the home group to welcome", async () => {
      authBus().nextInitial = null;
      setTestSegments(["(home)", "home"]);

      render(
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <AuthProvider>
            <HomeLayout />
          </AuthProvider>
        </SafeAreaProvider>
      );

      await waitFor(() => {
        expect(testNav().replace).toHaveBeenCalledWith("/");
      });
    });
  });

  describe("Jest setup policy", () => {
    it("does not pin a permanent Supabase session in setup.ts", () => {
      const setupPath = require.resolve("../setup");
      const fs = require("fs");
      const src = fs.readFileSync(setupPath, "utf8");
      expect(src).not.toMatch(/getSession\s*\(\s*\)\s*=>\s*\{\s*data:\s*\{\s*session:/);
      expect(src).toMatch(/EXPO_PUBLIC_SUPABASE/);
    });
  });
});
