/** Static menu copy + icons; wiring (router / alerts) stays in `profile.tsx`. */

export const PROFILE_MY_PETS_LINK_ROWS = [
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
    subtitle: "Scan QR or enter code",
    href: "/(home)/transfer-pet",
  },
  {
    id: "journal",
    icon: "book-outline",
    title: "Pet Journal",
    subtitle: "Health, behavior & environment notes",
    href: "/(home)/pet-journal",
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
    id: "milo_help",
    icon: "chatbubbles-outline",
    title: "Help & how-tos",
    subtitle: "Ask Milo about PawBuck",
  },
  {
    id: "contact",
    icon: "message-text-outline",
    title: "Contact Us",
    subtitle: "Get help and support",
  },
] as const;

export type ProfileHelpRowId = (typeof PROFILE_HELP_ROWS)[number]["id"];
