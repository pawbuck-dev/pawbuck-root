/**
 * Product / FAQ starter prompts for Milo chips (mirrors docs/pawbuck-product-help coverage).
 * Keep in sync when adding help articles.
 */
export const PRODUCT_HELP_STARTERS: readonly { id: string; prompt: string }[] = [
  { id: "family-sharing", prompt: "How do I set up family sharing for my pet?" },
  { id: "vaccination-records", prompt: "How do I add vaccination records in PawBuck?" },
  { id: "pet-transfer-receive", prompt: "How do I receive a pet transfer from another owner?" },
  { id: "pet-transfer-start", prompt: "How do I transfer ownership of my pet to someone else?" },
  { id: "pet-email", prompt: "How does my pet's PawBuck email address work?" },
  { id: "messages-review", prompt: "How do I fix a failed or pending email in Messages?" },
  { id: "milo-overview", prompt: "What can Milo help me with in the app?" },
  { id: "pawthon-walk", prompt: "How do I start a Pawthon walk and track distance?" },
  { id: "book-vet", prompt: "How do I book a vet visit in PawBuck?" },
  { id: "pet-journal", prompt: "How do I add a pet journal entry?" },
  { id: "behavior-baseline", prompt: "How do I set my pet's behavior baseline?" },
  { id: "medications-upload", prompt: "How do I add medication records?" },
  { id: "lab-upload", prompt: "How do I upload lab results?" },
  { id: "notifications", prompt: "How do I manage notification permissions?" },
  { id: "account-delete", prompt: "How do I delete my PawBuck account?" },
  { id: "contact-support", prompt: "How do I contact PawBuck support?" },
  { id: "faq-cost", prompt: "How much does PawBuck cost?" },
  { id: "faq-passport", prompt: "How do I share my pet's health records?" },
  { id: "health-hub-overview", prompt: "What is on the Health Records hub screen?" },
  { id: "documents-invoices", prompt: "How do I upload insurance, invoices, or ID documents for my pet?" },
  { id: "reminders-profile", prompt: "How do I change journal reminders or vet appointment notifications?" },
  { id: "bottom-nav-records", prompt: "How do I open health records from the bottom navigation?" },
] as const;
