import { supabase } from "@/utils/supabase";
import { CareTeamMemberType } from "./careTeamMembers";
import { MessageThread } from "./messages";

export interface GroupedThreads {
  veterinarian: MessageThread[];
  dog_walker: MessageThread[];
  groomer: MessageThread[];
  pet_sitter: MessageThread[];
  boarding: MessageThread[];
  unknown: MessageThread[]; // Threads that don't match any care team member
}

/** Threads grouped by pet_id (for multi-pet message list) */
export type GroupedThreadsByPet = Record<string, MessageThread[]>;

/**
 * Group message threads by pet (sync).
 * Use when user has more than one pet. Each group is sorted by updated_at descending.
 */
export function groupThreadsByPet(
  threads: MessageThread[]
): GroupedThreadsByPet {
  const grouped: GroupedThreadsByPet = {};

  if (threads.length === 0) return grouped;

  threads.forEach((thread) => {
    const petId = thread.pet_id ?? "unknown";
    if (!grouped[petId]) {
      grouped[petId] = [];
    }
    grouped[petId].push(thread);
  });

  Object.keys(grouped).forEach((petId) => {
    grouped[petId].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });

  return grouped;
}

/**
 * Fetch care team member types for all recipients in threads
 * This matches threads to care team members by email address
 */
async function getRecipientTypes(
  recipientEmails: string[]
): Promise<Map<string, CareTeamMemberType>> {
  const typeMap = new Map<string, CareTeamMemberType>();

  if (recipientEmails.length === 0) return typeMap;

  // Get care team member types from vet_information table
  // Use lowercase comparison for matching
  const { data: careTeamMembers, error } = await supabase
    .from("vet_information")
    .select("email, type");

  if (error) {
    console.error("[getRecipientTypes] Error fetching care team members:", error);
    return typeMap;
  }

  if (careTeamMembers) {
    const recipientEmailsLower = recipientEmails.map((e) => e.toLowerCase());
    careTeamMembers.forEach((member) => {
      const memberEmailLower = member.email?.toLowerCase();
      if (memberEmailLower && recipientEmailsLower.includes(memberEmailLower)) {
        typeMap.set(memberEmailLower, (member.type || "veterinarian") as CareTeamMemberType);
      }
    });
  }

  return typeMap;
}

/**
 * Group message threads by care team member type
 */
export async function groupThreadsByType(
  threads: MessageThread[]
): Promise<GroupedThreads> {
  const grouped: GroupedThreads = {
    veterinarian: [],
    dog_walker: [],
    groomer: [],
    pet_sitter: [],
    boarding: [],
    unknown: [],
  };

  if (threads.length === 0) return grouped;

  // Get all unique recipient emails
  const recipientEmails = Array.from(
    new Set(threads.map((t) => t.recipient_email.toLowerCase()))
  );

  // Fetch care team member types for all recipients
  const typeMap = await getRecipientTypes(recipientEmails);

  console.log(`[groupThreadsByType] Type map:`, typeMap);
  console.log(`[groupThreadsByType] Recipient emails:`, recipientEmails);
  console.log(`[groupThreadsByType] Threads:`, threads);

  // Group threads by type
  threads.forEach((thread) => {
    const email = thread.recipient_email.toLowerCase();
    const type = typeMap.get(email);

    if (type && grouped[type]) {
      grouped[type].push(thread);
    } else {
      // If no type found, still add to unknown category
      grouped.unknown.push(thread);
    }
  });

  console.log(`[groupThreadsByType] Grouped ${threads.length} threads:`, {
    veterinarian: grouped.veterinarian.length,
    dog_walker: grouped.dog_walker.length,
    groomer: grouped.groomer.length,
    pet_sitter: grouped.pet_sitter.length,
    boarding: grouped.boarding.length,
    unknown: grouped.unknown.length,
  });

  // Sort threads within each category by updated_at (most recent first)
  Object.keys(grouped).forEach((key) => {
    const category = key as keyof GroupedThreads;
    grouped[category].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });

  return grouped;
}

