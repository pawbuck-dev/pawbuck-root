/**
 * Debug Messages Script
 * 
 * This script helps debug why messages aren't showing in the app.
 * It checks:
 * 1. If threads exist in the database
 * 2. If RLS policies are working
 * 3. If the queries match what the app expects
 * 
 * Usage:
 * npx tsx scripts/debug-messages.ts
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

async function debugMessages() {
  try {
    console.log("🔍 Debugging Messages...\n");

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Error: You must be logged in.");
      console.error("   Please authenticate first or use the Supabase dashboard.");
      process.exit(1);
    }

    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`📋 User ID: ${user.id}\n`);

    // Check threads using the same query as the service
    console.log("1️⃣ Checking message_threads table...");
    const { data: threads, error: threadsError } = await supabase
      .from("message_threads")
      .select(
        `
        *,
        pets (
          name
        )
      `
      )
      .order("updated_at", { ascending: false });

    if (threadsError) {
      console.error("❌ Error fetching threads:", threadsError);
      console.error("   This might be an RLS (Row Level Security) issue.");
      console.error("   Make sure the RLS policies allow SELECT for your user_id.\n");
    } else {
      console.log(`✅ Found ${threads?.length || 0} threads`);
      
      if (threads && threads.length > 0) {
        console.log("\n📋 Thread Details:");
        threads.forEach((thread, index) => {
          console.log(`\n  Thread ${index + 1}:`);
          console.log(`    ID: ${thread.id}`);
          console.log(`    Recipient: ${thread.recipient_name || thread.recipient_email}`);
          console.log(`    Subject: ${thread.subject}`);
          console.log(`    Pet: ${thread.pets?.name || 'N/A'}`);
          console.log(`    User ID: ${thread.user_id}`);
          console.log(`    Updated: ${thread.updated_at}`);
          console.log(`    User ID Match: ${thread.user_id === user.id ? '✅' : '❌'}`);
        });
      } else {
        console.log("   ⚠️  No threads found in database.\n");
      }
    }

    // Check messages
    console.log("\n2️⃣ Checking thread_messages table...");
    if (threads && threads.length > 0) {
      for (const thread of threads) {
        const { data: messages, error: messagesError } = await supabase
          .from("thread_messages")
          .select("*")
          .eq("thread_id", thread.id)
          .order("sent_at", { ascending: true });

        if (messagesError) {
          console.error(`❌ Error fetching messages for thread ${thread.id}:`, messagesError);
        } else {
          console.log(`  Thread "${thread.subject}": ${messages?.length || 0} messages`);
        }
      }
    } else {
      console.log("   ⚠️  No threads to check messages for.");
    }

    // Check RLS policies
    console.log("\n3️⃣ Checking RLS policies...");
    const { data: rlsCheck, error: rlsError } = await supabase.rpc('auth.uid');
    console.log("   RLS Check (auth.uid()):", rlsCheck || user.id);

    // Try the exact query the app uses
    console.log("\n4️⃣ Testing app query (with last message and count)...");
    if (threads && threads.length > 0) {
      const testThread = threads[0];
      console.log(`   Testing with thread: ${testThread.id}`);
      
      // Get last message
      const { data: lastMessage, error: lastMsgError } = await supabase
        .from("thread_messages")
        .select("*")
        .eq("thread_id", testThread.id)
        .order("sent_at", { ascending: false })
        .limit(1);

      if (lastMsgError) {
        console.error("   ❌ Error fetching last message:", lastMsgError);
      } else {
        console.log(`   ✅ Last message: ${lastMessage?.length || 0} found`);
        if (lastMessage && lastMessage.length > 0) {
          console.log(`      Body preview: ${lastMessage[0].body.substring(0, 50)}...`);
        }
      }

      // Get message count
      const { count, error: countError } = await supabase
        .from("thread_messages")
        .select("*", { count: "exact", head: true })
        .eq("thread_id", testThread.id);

      if (countError) {
        console.error("   ❌ Error counting messages:", countError);
      } else {
        console.log(`   ✅ Message count: ${count || 0}`);
      }
    }

    // Summary
    console.log("\n📊 Summary:");
    console.log(`   Threads found: ${threads?.length || 0}`);
    console.log(`   Your User ID: ${user.id}`);
    console.log(`   Threads matching your User ID: ${threads?.filter(t => t.user_id === user.id).length || 0}`);
    
    if (threads && threads.length > 0) {
      const userThreads = threads.filter(t => t.user_id === user.id);
      if (userThreads.length === 0) {
        console.log("\n⚠️  WARNING: Threads exist but none match your User ID!");
        console.log("   This means the threads were created with a different user_id.");
        console.log("   Solution: Re-run the seed script or update the user_id in the database.");
      }
    }

    console.log("\n💡 Next Steps:");
    if (!threads || threads.length === 0) {
      console.log("   1. Run the seed script: npx tsx scripts/seed-sample-messages.ts");
      console.log("   2. Or use the SQL script in scripts/seed-sample-messages.sql");
    } else if (threads.some(t => t.user_id !== user.id)) {
      console.log("   1. Update thread user_id to match your user:");
      console.log(`      UPDATE message_threads SET user_id = '${user.id}' WHERE user_id != '${user.id}';`);
    } else {
      console.log("   1. Data looks good! Try:");
      console.log("      - Refreshing the app");
      console.log("      - Clearing React Query cache");
      console.log("      - Check browser/app console for errors");
      console.log("   2. Verify the query in services/messages.ts matches this output");
    }

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the script
debugMessages();

