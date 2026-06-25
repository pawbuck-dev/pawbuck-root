/** Static menu copy + icons; wiring (router / alerts) stays in `profile.tsx`. */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

type ProfileMenuIcon =
  | { icon: keyof typeof MaterialCommunityIcons.glyphMap; ionIcon?: undefined }
  | { ionIcon: keyof typeof Ionicons.glyphMap; icon?: undefined };

export function profileMenuIconProps(row: ProfileMenuIcon) {
  return row.ionIcon ? { ionIcon: row.ionIcon } : { icon: row.icon! };
}

export const PROFILE_MY_PETS_LINK_ROWS = [
  {
    id: "details",
    ionIcon: "paw-outline",
    title: "View & edit pet profile",
    subtitle: "Details, photo, delete pet",
    href: "/(home)/pet-profile",
  },
  {
    id: "add",
    icon: "plus-circle-outline",
    title: "Add New Pet",
    subtitle: "Family plan required for multiple pets",
    href: "/onboarding/step2",
  },
  {
    id: "claim",
    icon: "qrcode-scan",
    title: "Accept pet transfer",
    subtitle: "Have a transfer code? Become the new owner",
    href: "/transfer-pet",
  },
  {
    id: "family-sharing",
    icon: "account-group-outline",
    title: "Family Sharing",
    subtitle: "Join a household or invite family & care team",
    href: "/(home)/family-sharing",
  },
  {
    id: "transfer",
    icon: "account-switch-outline",
    title: "Transfer pet to someone else",
    subtitle: "Giving up ownership? Create a transfer code",
    href: "/(home)/transfer-pet",
  },
] as const satisfies ReadonlyArray<
  { id: string; title: string; subtitle: string; href: string } & ProfileMenuIcon
>;

export const PROFILE_SETTINGS_ROWS = [
  {
    id: "notification-center",
    ionIcon: "notifications-outline",
    title: "Notification center",
    subtitle: "Recent alerts and email approvals",
  },
  {
    id: "notifications",
    ionIcon: "phone-portrait-outline",
    title: "Push permissions",
    subtitle: "Device settings to allow or block alerts",
  },
  {
    id: "download-data",
    ionIcon: "download-outline",
    title: "Download my data",
    subtitle: "Request a copy of your account data",
  },
  {
    id: "privacy",
    icon: "shield-check-outline",
    title: "Privacy & Security",
    subtitle: "Policy, data use, and your rights",
  },
  {
    id: "change-password",
    ionIcon: "lock-closed-outline",
    title: "Change password",
    subtitle: "Update your sign-in password",
  },
  {
    id: "appearance",
    icon: "brightness-6",
    title: "Appearance",
    subtitle: "Light, Dark, or System default",
  },
] as const satisfies ReadonlyArray<{ id: string; title: string; subtitle: string } & ProfileMenuIcon>;

export type ProfileSettingsRowId = (typeof PROFILE_SETTINGS_ROWS)[number]["id"];

export const PROFILE_HELP_ROWS = [
  {
    id: "contact",
    icon: "message-text-outline",
    title: "Contact Us",
    subtitle: "Get help and support",
  },
] as const satisfies ReadonlyArray<{ id: string; title: string; subtitle: string } & ProfileMenuIcon>;

export type ProfileHelpRowId = (typeof PROFILE_HELP_ROWS)[number]["id"];
