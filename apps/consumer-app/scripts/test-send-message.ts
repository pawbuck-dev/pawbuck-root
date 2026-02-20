/**
 * Test Send Message Function
 * 
 * This script tests the send-message Edge Function to diagnose errors.
 * 
 * Usage:
 * npx tsx scripts/test-send-message.ts
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Error: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testSendMessage() {
  try {
    console.log("🧪 Testing send-message function...\n");

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Error: You must be logged in.");
      console.error("   Please authenticate in your app first.");
      process.exit(1);
    }

    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`📋 User ID: ${user.id}\n`);

    // Get a pet for this user
    const { data: pets, error: petsError } = await supabase
      .from("pets")
      .select("id, name")
      .eq("user_id", user.id)
      .limit(1);

    if (petsError || !pets || pets.length === 0) {
      console.error("❌ Error: No pets found for this user.");
      console.error("   Please create a pet first in the app.");
      process.exit(1);
    }

    const pet = pets[0];
    console.log(`✅ Using pet: ${pet.name} (${pet.id})\n`);

    // Get a test recipient (use a test email)
    const testEmail = process.env.TEST_EMAIL || "test@example.com";
    console.log(`📧 Test recipient: ${testEmail}\n`);

    // Test the function
    console.log("📤 Calling send-message function...\n");
    
    const { data, error } = await supabase.functions.invoke("send-message", {
      body: {
        petId: pet.id,
        to: testEmail,
        subject: "Test Message",
        message: "This is a test message to diagnose the error.",
      },
    });

    if (error) {
      console.error("❌ Function Error:");
      console.error("   Code:", error.status || "N/A");
      console.error("   Message:", error.message);
      console.error("   Full error:", JSON.stringify(error, null, 2));
      
      // Common error diagnoses
      if (error.message?.includes("Unauthorized")) {
        console.error("\n💡 Diagnosis: Authentication error");
        console.error("   - Check if you're logged in correctly");
        console.error("   - Check if your session token is valid");
      } else if (error.message?.includes("Missing required fields")) {
        console.error("\n💡 Diagnosis: Missing fields");
        console.error("   - Check if petId, to, subject, message are all provided");
      } else if (error.message?.includes("Pet not found")) {
        console.error("\n💡 Diagnosis: Pet access error");
        console.error("   - Check if the pet belongs to your user");
        console.error("   - Check if pet_id is correct");
      } else if (error.message?.includes("SES") || error.message?.includes("AWS")) {
        console.error("\n💡 Diagnosis: AWS SES configuration error");
        console.error("   - Check AWS SES credentials in Supabase dashboard");
        console.error("   - Check if AWS_SES_ACCESS_KEY_ID is set");
        console.error("   - Check if AWS_SES_SECRET_ACCESS_KEY is set");
        console.error("   - Check if AWS_SES_REGION is set");
        console.error("   - Check if SES_FROM_EMAIL is set");
        console.error("   - Verify sender email in AWS SES");
      } else {
        console.error("\n💡 Diagnosis: Unknown error");
        console.error("   - Check Supabase function logs:");
        console.error("     supabase functions logs send-message --limit 50");
      }
      
      process.exit(1);
    }

    if (data) {
      console.log("✅ Success!");
      console.log("   Response:", JSON.stringify(data, null, 2));
      console.log("\n📋 Next steps:");
      console.log("   - Check your email inbox for the test message");
      console.log("   - If you don't receive it, check:");
      console.log("     * AWS SES sandbox mode (must verify recipient)");
      console.log("     * Spam folder");
      console.log("     * AWS SES sending limits");
    }

  } catch (error) {
    console.error("\n❌ Unexpected error:", error);
    if (error instanceof Error) {
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testSendMessage();

