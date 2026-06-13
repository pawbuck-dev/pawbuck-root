export type PetTransferNotifyEvent = "created" | "accepted" | "declined" | "expired";

export function buildTransferCreatedOwnerEmail(petName: string, code: string, appUrl: string): {
  subject: string;
  text: string;
} {
  return {
    subject: `Pet transfer started for ${petName}`,
    text:
      `Your transfer code for ${petName} is: ${code}\n\n` +
      `Share this code with the new owner. It expires in 14 days.\n\n` +
      `Open PawBuck: ${appUrl}`,
  };
}

export function buildTransferCreatedRecipientEmail(
  petName: string,
  code: string,
  appUrl: string
): { subject: string; text: string } {
  return {
    subject: `Pet transfer: ${petName}`,
    text:
      `You have been sent a PawBuck pet transfer for ${petName}.\n\n` +
      `Transfer code: ${code}\n\n` +
      `Open the app to review and accept: ${appUrl}`,
  };
}

export function buildTransferAcceptedOwnerEmail(petName: string): { subject: string; text: string } {
  return {
    subject: `${petName}'s transfer was accepted`,
    text: `The new owner has accepted the transfer for ${petName} in PawBuck.`,
  };
}

export function buildTransferDeclinedOwnerEmail(petName: string): { subject: string; text: string } {
  return {
    subject: `${petName}'s transfer was declined`,
    text:
      `The recipient declined the pet transfer for ${petName}. ` +
      `You can create a new transfer code if needed.`,
  };
}

export function buildTransferPushData(
  action: "share" | "review" | "accepted" | "declined" | "expired" | "access_revoked",
  transferCode?: string,
  petName?: string
): Record<string, string> {
  return {
    type: "pet_transfer",
    action,
    ...(transferCode ? { transferCode } : {}),
    ...(petName ? { petName } : {}),
  };
}
