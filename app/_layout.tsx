import { EmailApprovalModal } from "@/components/email-approval/EmailApprovalModal";
import { AuthProvider } from "@/context/authContext";
import { EmailApprovalProvider } from "@/context/emailApprovalContext";
import { NotificationsProvider } from "@/context/notificationsContext";
import { OnboardingProvider } from "@/context/onboardingContext";
import { PetsProvider } from "@/context/petsContext";
import { ThemeProvider } from "@/context/themeContext";
import { UserPreferencesProvider } from "@/context/userPreferencesContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { NotificationBehavior } from "expo-notifications";
import { router, Stack } from "expo-router";
import { useEffect, useState } from "react";
import "../global.css";

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

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <EmailApprovalProvider>
            <OnboardingProvider>
              <PetsProvider>
                <UserPreferencesProvider>
                  <NotificationsProvider>
                    <Stack
                      screenOptions={{
                        headerShown: false,
                        animation: "none",
                      }}
                    />
                    <EmailApprovalModal />
                  </NotificationsProvider>
                </UserPreferencesProvider>
              </PetsProvider>
            </OnboardingProvider>
          </EmailApprovalProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
