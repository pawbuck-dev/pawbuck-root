// supabase/functions/delete-account/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

/**
 * Delete Account Edge Function
 *
 * Permanently deletes all user data and the auth account.
 * This action is irreversible.
 */

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().substring(0, 8);
  console.log(
    `[${requestId}] ========== DELETE-ACCOUNT REQUEST START ==========`
  );
  console.log(`[${requestId}] Method: ${req.method}`);
  console.log(`[${requestId}] Timestamp: ${new Date().toISOString()}`);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    console.log(`[${requestId}] Handling CORS preflight request`);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.log(`[${requestId}] ERROR: No authorization header`);
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createSupabaseClient();
    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.log(
        `[${requestId}] ERROR: Auth failed - ${userError?.message || "No user"}`
      );
      return errorResponse("Unauthorized", 401);
    }

    const userId = user.id;
    console.log(`[${requestId}] Authenticated user: ${userId} (${user.email})`);
    console.log(`[${requestId}] Starting account deletion process...`);

    // Step 1: Get all pet IDs owned by the user
    console.log(`[${requestId}] Step 1: Fetching user's pets...`);
    const { data: pets, error: petsError } = await supabase
      .from("pets")
      .select("id")
      .eq("user_id", userId);

    if (petsError) {
      console.error(`[${requestId}] Error fetching pets:`, petsError);
      throw new Error(`Failed to fetch pets: ${petsError.message}`);
    }

    const petIds = pets?.map((p) => p.id) || [];
    console.log(`[${requestId}] Found ${petIds.length} pets to delete`);

    // Step 2: Delete storage files (all files are organized under user_id folder)
    console.log(`[${requestId}] Step 2: Cleaning up storage files...`);
    try {
      // List and delete all files in user's folder from "pets" bucket
      const { data: petsFiles } = await supabase.storage
        .from("pets")
        .list(userId);
      if (petsFiles && petsFiles.length > 0) {
        const filePaths = petsFiles.map((file) => `${userId}/${file.name}`);
        console.log(
          `[${requestId}] Deleting ${filePaths.length} files from "pets" bucket`
        );
        await supabase.storage.from("pets").remove(filePaths);
      }

      // List and delete all files in user's folder from "email-attachments" bucket
      const { data: emailFiles } = await supabase.storage
        .from("email-attachments")
        .list(userId);
      if (emailFiles && emailFiles.length > 0) {
        const filePaths = emailFiles.map((file) => `${userId}/${file.name}`);
        console.log(
          `[${requestId}] Deleting ${filePaths.length} files from "email-attachments" bucket`
        );
        await supabase.storage.from("email-attachments").remove(filePaths);
      }
    } catch (storageErr) {
      console.error(`[${requestId}] Error deleting storage files:`, storageErr);
      // Continue with deletion even if storage cleanup fails
    }

    // Step 3: Delete thread_read_status (no FK cascade)
    console.log(`[${requestId}] Step 3: Deleting thread read status...`);
    const { error: threadReadError } = await supabase
      .from("thread_read_status")
      .delete()
      .eq("user_id", userId);
    if (threadReadError) {
      console.error(
        `[${requestId}] Error deleting thread_read_status:`,
        threadReadError
      );
    }

    // Step 4: Delete thread_messages for user's threads
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 4: Deleting thread messages...`);

      // Get thread IDs first
      const { data: threads } = await supabase
        .from("message_threads")
        .select("id")
        .in("pet_id", petIds);

      const threadIds = threads?.map((t) => t.id) || [];

      if (threadIds.length > 0) {
        const { error: messagesError } = await supabase
          .from("thread_messages")
          .delete()
          .in("thread_id", threadIds);
        if (messagesError) {
          console.error(
            `[${requestId}] Error deleting thread_messages:`,
            messagesError
          );
        }
      }
    }

    // Step 5: Delete message_threads
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 5: Deleting message threads...`);
      const { error: threadsError } = await supabase
        .from("message_threads")
        .delete()
        .in("pet_id", petIds);
      if (threadsError) {
        console.error(
          `[${requestId}] Error deleting message_threads:`,
          threadsError
        );
      }
    }

    // Step 6: Delete pending_email_approvals
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 6: Deleting pending email approvals...`);
      const { error: approvalsError } = await supabase
        .from("pending_email_approvals")
        .delete()
        .in("pet_id", petIds);
      if (approvalsError) {
        console.error(
          `[${requestId}] Error deleting pending_email_approvals:`,
          approvalsError
        );
      }
    }

    // Step 7: Delete pet_email_list
    console.log(`[${requestId}] Step 7: Deleting pet email list...`);
    const { error: emailListError } = await supabase
      .from("pet_email_list")
      .delete()
      .eq("user_id", userId);
    if (emailListError) {
      console.error(
        `[${requestId}] Error deleting pet_email_list:`,
        emailListError
      );
    }

    // Step 8: Delete pet_care_team_members
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 8: Deleting pet care team members...`);
      const { error: careTeamError } = await supabase
        .from("pet_care_team_members")
        .delete()
        .in("pet_id", petIds);
      if (careTeamError) {
        console.error(
          `[${requestId}] Error deleting pet_care_team_members:`,
          careTeamError
        );
      }
    }

    // Step 9: Delete medication_doses
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 9: Deleting medication doses...`);
      const { error: dosesError } = await supabase
        .from("medication_doses")
        .delete()
        .in("pet_id", petIds);
      if (dosesError) {
        console.error(
          `[${requestId}] Error deleting medication_doses:`,
          dosesError
        );
      }
    }

    // Step 10: Delete medicines
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 10: Deleting medicines...`);
      const { error: medicinesError } = await supabase
        .from("medicines")
        .delete()
        .in("pet_id", petIds);
      if (medicinesError) {
        console.error(
          `[${requestId}] Error deleting medicines:`,
          medicinesError
        );
      }
    }

    // Step 11: Delete vaccinations
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 11: Deleting vaccinations...`);
      const { error: vaccinationsError } = await supabase
        .from("vaccinations")
        .delete()
        .in("pet_id", petIds);
      if (vaccinationsError) {
        console.error(
          `[${requestId}] Error deleting vaccinations:`,
          vaccinationsError
        );
      }
    }

    // Step 12: Delete clinical_exams
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 12: Deleting clinical exams...`);
      const { error: examsError } = await supabase
        .from("clinical_exams")
        .delete()
        .in("pet_id", petIds);
      if (examsError) {
        console.error(
          `[${requestId}] Error deleting clinical_exams:`,
          examsError
        );
      }
    }

    // Step 13: Delete lab_results
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 13: Deleting lab results...`);
      const { error: labResultsError } = await supabase
        .from("lab_results")
        .delete()
        .in("pet_id", petIds);
      if (labResultsError) {
        console.error(
          `[${requestId}] Error deleting lab_results:`,
          labResultsError
        );
      }
    }

    // Step 14: Delete pet_transfers
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 14: Deleting pet transfers...`);
      const { error: transfersError } = await supabase
        .from("pet_transfers")
        .delete()
        .in("pet_id", petIds);
      if (transfersError) {
        console.error(
          `[${requestId}] Error deleting pet_transfers:`,
          transfersError
        );
      }
    }

    // Also delete transfers where user is from_user_id or to_user_id
    const { error: userTransfersError } = await supabase
      .from("pet_transfers")
      .delete()
      .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`);
    if (userTransfersError) {
      console.error(
        `[${requestId}] Error deleting user pet_transfers:`,
        userTransfersError
      );
    }

    // Step 15: Delete processed_emails
    if (petIds.length > 0) {
      console.log(`[${requestId}] Step 15: Deleting processed emails...`);
      const { error: processedEmailsError } = await supabase
        .from("processed_emails")
        .delete()
        .in("pet_id", petIds);
      if (processedEmailsError) {
        console.error(
          `[${requestId}] Error deleting processed_emails:`,
          processedEmailsError
        );
      }
    }

    // Step 16: Delete pets
    console.log(`[${requestId}] Step 16: Deleting pets...`);
    const { error: deletePetsError } = await supabase
      .from("pets")
      .delete()
      .eq("user_id", userId);
    if (deletePetsError) {
      console.error(`[${requestId}] Error deleting pets:`, deletePetsError);
      throw new Error(`Failed to delete pets: ${deletePetsError.message}`);
    }

    // Step 17: Delete household_members (where user is member or owner)
    console.log(`[${requestId}] Step 17: Deleting household members...`);
    const { error: householdMembersError } = await supabase
      .from("household_members")
      .delete()
      .or(`user_id.eq.${userId},household_owner_id.eq.${userId}`);
    if (householdMembersError) {
      console.error(
        `[${requestId}] Error deleting household_members:`,
        householdMembersError
      );
    }

    // Step 18: Delete household_invites
    console.log(`[${requestId}] Step 18: Deleting household invites...`);
    const { error: householdInvitesError } = await supabase
      .from("household_invites")
      .delete()
      .eq("created_by", userId);
    if (householdInvitesError) {
      console.error(
        `[${requestId}] Error deleting household_invites:`,
        householdInvitesError
      );
    }

    // Step 19: Delete push_tokens
    console.log(`[${requestId}] Step 19: Deleting push tokens...`);
    const { error: pushTokensError } = await supabase
      .from("push_tokens")
      .delete()
      .eq("user_id", userId);
    if (pushTokensError) {
      console.error(
        `[${requestId}] Error deleting push_tokens:`,
        pushTokensError
      );
    }

    // Step 20: Delete user_preferences
    console.log(`[${requestId}] Step 20: Deleting user preferences...`);
    const { error: preferencesError } = await supabase
      .from("user_preferences")
      .delete()
      .eq("user_id", userId);
    if (preferencesError) {
      console.error(
        `[${requestId}] Error deleting user_preferences:`,
        preferencesError
      );
    }

    // Step 21: Delete the auth user
    console.log(`[${requestId}] Step 21: Deleting auth user...`);
    const { error: deleteUserError } =
      await supabase.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error(
        `[${requestId}] Error deleting auth user:`,
        deleteUserError
      );
      throw new Error(`Failed to delete auth user: ${deleteUserError.message}`);
    }

    console.log(
      `[${requestId}] ========== DELETE-ACCOUNT REQUEST SUCCESS ==========`
    );
    console.log(
      `[${requestId}] Account ${userId} has been permanently deleted`
    );

    return jsonResponse({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error(
      `[${requestId}] ========== DELETE-ACCOUNT REQUEST ERROR ==========`
    );
    console.error(`[${requestId}] Error:`, error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(errorMessage, 500);
  }
});
