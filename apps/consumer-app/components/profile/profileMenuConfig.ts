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
    subtitle: "Guided questions to create a profile",
    href: "/onboarding/step2",
  },
  {
    id: "claim",
    icon: "qrcode-scan",
    title: "Claim a Pet",
    subtitle: "Enter a transfer code from the owner",
    href: "/transfer-pet",
  },
  {
    id: "join-household",
    icon: "home-account",
    title: "Join Household",
    subtitle: "Enter an invite code you received",
    href: "/join-household",
  },
  {
    id: "access",
    icon: "account-cog-outline",
    title: "Manage Access",
    subtitle: "Manage family access to this pet",
    href: "/(home)/family-access",
  },
  {
    id: "transfer",
    icon: "account-switch-outline",
    title: "Transfer Ownership",
    subtitle: "Generate secure transfer code",
    href: "/(home)/transfer-pet",
  },
  {
    id: "care",
    icon: "account-group-outline",
    title: "Care Team",
    subtitle: "Manage your pet's care providers",
    href: "/(home)/family-access",
  },
] as const;

export const PROFILE_SETTINGS_ROWS = [
  {
    id: "notifications",
    icon: "bell-outline",
    title: "Notifications",
    subtitle: "Manage alerts",
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
    subtitle: "Protect your pet data",
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
