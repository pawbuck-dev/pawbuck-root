/** Static menu copy + icons; wiring (router / alerts) stays in `profile.tsx`. */

export const PROFILE_MY_PETS_LINK_ROWS = [
  {
    id: "details",
    icon: "paw-outline",
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
    id: "join-household",
    icon: "home-account",
    title: "Join Household",
    subtitle: "Have a household code from a family member?",
    href: "/join-household",
  },
  {
    id: "access",
    icon: "account-cog-outline",
    title: "Manage Access",
    subtitle: "Invite family, care team & safe senders",
    href: "/(home)/family-access",
  },
  {
    id: "transfer",
    icon: "account-switch-outline",
    title: "Transfer pet to someone else",
    subtitle: "Giving up ownership? Create a transfer code",
    href: "/(home)/transfer-pet",
  },
] as const;

export const PROFILE_SETTINGS_ROWS = [
  {
    id: "notification-center",
    icon: "notifications-outline",
    title: "Notification center",
    subtitle: "Recent alerts and email approvals",
  },
  {
    id: "notifications",
    icon: "phone-portrait-outline",
    title: "Push permissions",
    subtitle: "Device settings to allow or block alerts",
  },
  {
    id: "download-data",
    icon: "download-outline",
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
    icon: "lock-outline",
    title: "Change password",
    subtitle: "Update your sign-in password",
  },
  {
    id: "appearance",
    icon: "brightness-6",
    title: "Appearance",
    subtitle: "Light, Dark, or System default",
  },
] as const;

export type ProfileSettingsRowId = (typeof PROFILE_SETTINGS_ROWS)[number]["id"];

export const PROFILE_HELP_ROWS = [
  {
    id: "contact",
    icon: "message-text-outline",
    title: "Contact Us",
    subtitle: "Get help and support",
  },
] as const;

export type ProfileHelpRowId = (typeof PROFILE_HELP_ROWS)[number]["id"];
