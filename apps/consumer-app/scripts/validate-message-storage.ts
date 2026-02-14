/**
 * Validate Message Storage Script
 * 
 * This script validates that messages are being stored correctly when emails are processed.
 * 
 * Usage:
 * npx tsx scripts/validate-message-storage.ts
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

async function validateMessageStorage() {
  try {
    console.log("🔍 Validating Message Storage...\n");

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Error: You must be logged in.");
      console.error("   Please authenticate in your app first.");
      process.exit(1);
    }

    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`📋 User ID: ${user.id}\n`);

    // 1. Check threads
    console.log("1️⃣ Checking message threads...");
    const { data: threads, error: threadsError } = await supabase
      .from("message_threads")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (threadsError) {
      console.error("❌ Error fetching threads:", threadsError);
      process.exit(1);
    }

    console.log(`✅ Found ${threads?.length || 0} threads\n`);

    if (!threads || threads.length === 0) {
      console.log("⚠️  No threads found. Create a thread first by sending a message.\n");
      process.exit(0);
    }

    // 2. Check messages for each thread
    console.log("2️⃣ Checking messages in threads...\n");
    
    for (const thread of threads) {
      console.log(`\n📧 Thread: ${thread.subject}`);
      console.log(`   ID: ${thread.id}`);
      console.log(`   Recipient: ${thread.recipient_email}`);
      console.log(`   Reply-to: ${thread.reply_to_address}`);
      console.log(`   Updated: ${thread.updated_at}`);

      const { data: messages, error: messagesError } = await supabase
        .from("thread_messages")
        .select("*")
        .eq("thread_id", thread.id)
        .order("sent_at", { ascending: true });

      if (messagesError) {
        console.error(`   ❌ Error fetching messages:`, messagesError);
        continue;
      }

      console.log(`   📬 Messages: ${messages?.length || 0}`);
      
      if (messages && messages.length > 0) {
        messages.forEach((msg, index) => {
          console.log(`\n   Message ${index + 1}:`);
          console.log(`     Direction: ${msg.direction}`);
          console.log(`     From: ${msg.sender_email}`);
          console.log(`     To: ${msg.recipient_email}`);
          console.log(`     Subject: ${msg.subject}`);
          console.log(`     Sent: ${msg.sent_at}`);
          console.log(`     Body length: ${msg.body?.length || 0} chars`);
          console.log(`     Body preview: ${(msg.body || "").substring(0, 100)}...`);
        });
      } else {
        console.log(`   ⚠️  No messages in this thread`);
      }
    }

    // 3. Check processed emails
    console.log("\n\n3️⃣ Checking processed emails...\n");
    
    const { data: processedEmails, error: processedError } = await supabase
      .from("processed_emails")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (processedError) {
      console.error("❌ Error fetching processed emails:", processedError);
    } else {
      console.log(`✅ Found ${processedEmails?.length || 0} processed emails (last 10)\n`);
      
      if (processedEmails && processedEmails.length > 0) {
        processedEmails.forEach((email, index) => {
          console.log(`\n   Email ${index + 1}:`);
          console.log(`     S3 Key: ${email.s3_key}`);
          console.log(`     Status: ${email.status}`);
          console.log(`     Success: ${email.success}`);
          console.log(`     Attachments: ${email.attachment_count}`);
          console.log(`     Created: ${email.created_at}`);
          console.log(`     Completed: ${email.completed_at || "N/A"}`);
          if (email.error_message) {
            console.log(`     Error: ${email.error_message}`);
          }
        });
      }
    }

    // 4. Check thread lookup patterns
    console.log("\n\n4️⃣ Testing thread lookup patterns...\n");
    
    if (threads && threads.length > 0) {
      const testThread = threads[0];
      
      console.log(`Testing with thread: ${testThread.subject}`);
      console.log(`Reply-to address: ${testThread.reply_to_address}`);
      console.log(`Recipient email: ${testThread.recipient_email}`);
      console.log(`Pet ID: ${testThread.pet_id}\n`);

      // Test lookup by reply-to address
      console.log("   a) Looking up by reply-to address:");
      const { data: byReplyTo, error: replyToError } = await supabase
        .from("message_threads")
        .select("*")
        .eq("reply_to_address", testThread.reply_to_address)
        .single();

      if (replyToError) {
        console.log(`      ❌ Error: ${replyToError.message}`);
      } else if (byReplyTo) {
        console.log(`      ✅ Found thread: ${byReplyTo.id}`);
      } else {
        console.log(`      ❌ Not found`);
      }

      // Test lookup by recipient + pet
      console.log("\n   b) Looking up by recipient email + pet ID:");
      const { data: byRecipient, error: recipientError } = await supabase
        .from("message_threads")
        .select("*")
        .eq("recipient_email", testThread.recipient_email)
        .eq("pet_id", testThread.pet_id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recipientError) {
        console.log(`      ❌ Error: ${recipientError.message}`);
      } else if (byRecipient && byRecipient.length > 0) {
        console.log(`      ✅ Found thread: ${byRecipient[0].id}`);
      } else {
        console.log(`      ❌ Not found`);
      }
    }

    // 5. Summary and recommendations
    console.log("\n\n📊 Summary:\n");
    
    const totalMessages = threads?.reduce((sum, thread) => {
      // We can't easily count here without re-querying, but we can provide guidance
      return sum;
    }, 0) || 0;

    console.log(`   Threads: ${threads?.length || 0}`);
    console.log(`   Processed emails (last 10): ${processedEmails?.length || 0}`);
    
    console.log("\n💡 Troubleshooting Tips:\n");
    
    if (!threads || threads.length === 0) {
      console.log("   - No threads found. Send a message first to create a thread.");
    } else {
      const threadsWithMessages = threads.filter(thread => {
        // We'd need to check, but for now just provide general guidance
        return true;
      });
      
      console.log("   - Check if reply-to addresses match between threads and incoming emails");
      console.log("   - Verify that processed emails have status='completed' and success=true");
      console.log("   - Check if messages are being stored with the correct thread_id");
      console.log("   - Verify that recipient_email in incoming emails matches reply_to_address in threads");
      console.log("   - Check function logs for errors during message storage");
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    if (error instanceof Error) {
      console.error("   Stack:", error.stack);
    }
    process.exit(1);
  }
}

// Run the validation
validateMessageStorage();

