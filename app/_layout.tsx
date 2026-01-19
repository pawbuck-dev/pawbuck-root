import { EmailApprovalModal } from "@/components/email-approval/EmailApprovalModal";
import { AuthProvider } from "@/context/authContext";
import { EmailApprovalProvider } from "@/context/emailApprovalContext";
import { NotificationsProvider } from "@/context/notificationsContext";
import { OnboardingProvider } from "@/context/onboardingContext";
import { PetsProvider } from "@/context/petsContext";
import { SelectedPetProvider } from "@/context/selectedPetContext";
import { ThemeProvider } from "@/context/themeContext";
import { UserPreferencesProvider } from "@/context/userPreferencesContext";
import {
  Outfit_100Thin,
  Outfit_200ExtraLight,
  Outfit_300Light,
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  Outfit_800ExtraBold,
  Outfit_900Black,
  useFonts,
} from "@expo-google-fonts/outfit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { NotificationBehavior } from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function useNotificationObserver() {
  useEffect(() => {
    function redirect(notification: Notifications.Notification) {
      const url = notification.request.content.data?.url;
      if (typeof url === "string") {
        router.push({
          pathname: url as any,
        });
      }
    }

    const response = Notifications.getLastNotificationResponse();
    if (response?.notification) {
      redirect(response.notification);
    }

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        redirect(response.notification);
      }
    );

    return () => {
      subscription.remove();
    };
  }, []);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_100Thin,
    Outfit_200ExtraLight,
    Outfit_300Light,
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    Outfit_800ExtraBold,
    Outfit_900Black,
  });

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Never consider data stale
            refetchOnMount: false, // Don't refetch on component mount
            refetchOnWindowFocus: false, // Don't refetch on window focus
            refetchOnReconnect: false, // Don't refetch on reconnect
            retry: 2,
          },
        },
      })
  );

  useNotificationObserver();

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <EmailApprovalProvider>
            <OnboardingProvider>
              <PetsProvider>
                <SelectedPetProvider>
                  <UserPreferencesProvider>
                    <NotificationsProvider>
                      <GestureHandlerRootView>
                        <Stack
                          screenOptions={{
                            headerShown: false,
                            animation: "none",
                          }}
                        />
                      </GestureHandlerRootView>
                      <EmailApprovalModal />
                    </NotificationsProvider>
                  </UserPreferencesProvider>
                </SelectedPetProvider>
              </PetsProvider>
            </OnboardingProvider>
          </EmailApprovalProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
