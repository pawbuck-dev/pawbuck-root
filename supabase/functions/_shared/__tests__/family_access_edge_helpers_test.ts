import {
  buildFamilyInviteAcceptUrl,
  buildFamilyInviteEmailBodies,
  isPetFamilyRole,
  looksLikeEmail,
  PET_FAMILY_ROLES,
} from "../familyInviteValidation.ts";
import {
  mapPetFamilyInviteErrorStatus,
  resolvePetFamilyInviteError,
} from "../inviteTokenErrorStatus.ts";
import {
  buildTransferAcceptedOwnerEmail,
  buildTransferCreatedOwnerEmail,
  buildTransferCreatedRecipientEmail,
  buildTransferDeclinedOwnerEmail,
  buildTransferPushData,
} from "../petTransferNotifyCopy.ts";

Deno.test("looksLikeEmail accepts common addresses", () => {
  if (!looksLikeEmail("family@example.com")) throw new Error("expected valid email");
  if (looksLikeEmail("not-an-email")) throw new Error("expected invalid email");
});

Deno.test("isPetFamilyRole validates allowed roles", () => {
  for (const role of PET_FAMILY_ROLES) {
    if (!isPetFamilyRole(role)) throw new Error(`expected ${role} valid`);
  }
  if (isPetFamilyRole("owner")) throw new Error("owner is not a grant role");
});

Deno.test("buildFamilyInviteAcceptUrl encodes token", () => {
  const url = buildFamilyInviteAcceptUrl("https://pawbuck.app/", "abc+def");
  if (!url.includes("token=abc%2Bdef")) throw new Error(`unexpected url ${url}`);
});

Deno.test("buildFamilyInviteEmailBodies escapes HTML", () => {
  const { html, subject } = buildFamilyInviteEmailBodies({
    inviterDisplay: "<script>",
    petName: "Max & Co",
    acceptUrl: "https://pawbuck.app/accept-invite?token=x",
  });
  if (html.includes("<script>")) throw new Error("inviter not escaped");
  if (!subject.includes("Max & Co")) throw new Error("subject missing pet name");
});

Deno.test("mapPetFamilyInviteErrorStatus maps known codes", () => {
  if (mapPetFamilyInviteErrorStatus("email_mismatch") !== 403) throw new Error("403 expected");
  if (mapPetFamilyInviteErrorStatus("member_limit") !== 409) throw new Error("409 expected");
  const resolved = resolvePetFamilyInviteError({ ok: false, error: "expired" });
  if (resolved.status !== 400 || resolved.error !== "expired") {
    throw new Error(`unexpected ${JSON.stringify(resolved)}`);
  }
});

Deno.test("pet transfer notify copy includes code and app url", () => {
  const owner = buildTransferCreatedOwnerEmail("Luna", "TRF-LUNA-2026-ABCD", "https://app.test");
  if (!owner.text.includes("TRF-LUNA-2026-ABCD")) throw new Error("missing code");
  const recipient = buildTransferCreatedRecipientEmail("Luna", "TRF-LUNA-2026-ABCD", "https://app.test");
  if (!recipient.text.includes("https://app.test")) throw new Error("missing app url");
  const accepted = buildTransferAcceptedOwnerEmail("Luna");
  if (!accepted.subject.includes("accepted")) throw new Error("accepted subject");
  const declined = buildTransferDeclinedOwnerEmail("Luna");
  if (!declined.text.includes("declined")) throw new Error("declined text");
  const push = buildTransferPushData("share", "TRF-LUNA-2026-ABCD");
  if (push.transferCode !== "TRF-LUNA-2026-ABCD") throw new Error("push data");
});
