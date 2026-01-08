/**
 * Seed Sample Messages Script
 * 
 * This script creates sample message threads and messages for testing the messages UI.
 * 
 * Usage:
 * 1. Make sure you're logged in to your Supabase project
 * 2. Run: npx tsx scripts/seed-sample-messages.ts
 * 
 * Requirements:
 * - You must have at least one pet in your database
 * - You must be authenticated (the script uses your current session)
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

async function seedSampleMessages() {
  try {
    console.log("🔐 Authenticating...");
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ Error: You must be logged in. Please run this from your app or use the Supabase dashboard.");
      console.error("   You can also use the SQL script instead: scripts/seed-sample-messages.sql");
      process.exit(1);
    }

    console.log(`✅ Authenticated as: ${user.email}`);
    console.log(`📋 User ID: ${user.id}`);

    // Get user's pets
    console.log("\n🐾 Fetching your pets...");
    const { data: pets, error: petsError } = await supabase
      .from("pets")
      .select("id, name")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .limit(1);

    if (petsError) {
      throw petsError;
    }

    if (!pets || pets.length === 0) {
      console.error("❌ Error: You need at least one pet in your database to create sample messages.");
      console.error("   Please create a pet first in your app.");
      process.exit(1);
    }

    const pet = pets[0];
    console.log(`✅ Using pet: ${pet.name} (${pet.id})`);

    // Sample recipients
    const sampleRecipients = [
      {
        email: "dr.sarah.chen@happypaws.com",
        name: "Dr. Sarah Chen",
      },
      {
        email: "mrivera@citypet.com",
        name: "Dr. Michael Rivera",
      },
      {
        email: "jake@pawsonthego.com",
        name: "Jake Thompson",
      },
      {
        email: "lisa@homepetcare.com",
        name: "Lisa Park",
      },
    ];

    console.log("\n📧 Creating sample message threads...");

    const threads = [];
    const domain = "pawbuck.app"; // Change this to your email domain

    for (const recipient of sampleRecipients) {
      const threadId = crypto.randomUUID();
      const replyToAddress = `thread-${threadId.substring(0, 8)}@${domain}`;

      const { data: thread, error: threadError } = await supabase
        .from("message_threads")
        .insert({
          id: threadId,
          pet_id: pet.id,
          user_id: user.id,
          recipient_email: recipient.email,
          recipient_name: recipient.name,
          reply_to_address: replyToAddress,
          subject: `About ${pet.name}'s health`,
        })
        .select()
        .single();

      if (threadError) {
        // Thread might already exist, try to find it
        const { data: existingThread } = await supabase
          .from("message_threads")
          .select()
          .eq("pet_id", pet.id)
          .eq("recipient_email", recipient.email)
          .single();

        if (existingThread) {
          threads.push(existingThread);
          console.log(`  ⚠️  Thread for ${recipient.name} already exists, using existing thread`);
          continue;
        } else {
          throw threadError;
        }
      }

      threads.push(thread);
      console.log(`  ✅ Created thread: ${recipient.name}`);
    }

    console.log(`\n💬 Creating sample messages...`);

    // Sample conversation messages
    const sampleConversations = [
      {
        threadIndex: 0, // Dr. Sarah Chen
        messages: [
          {
            direction: "outbound" as const,
            body: "Hi Dr. Chen, I wanted to follow up on Luna's recent checkup. The test results came back and I have some questions.",
            hoursAgo: 5,
          },
          {
            direction: "inbound" as const,
            body: "Hello! I'd be happy to help. What questions do you have about Luna's test results?",
            hoursAgo: 4,
          },
          {
            direction: "outbound" as const,
            body: "The blood work showed slightly elevated liver enzymes. Should I be concerned?",
            hoursAgo: 3,
          },
          {
            direction: "inbound" as const,
            body: "Slightly elevated liver enzymes can be normal after certain medications or vaccinations. Since Luna had her vaccinations recently, this is likely related. I recommend we retest in 2-3 weeks to monitor.",
            hoursAgo: 2,
          },
        ],
      },
      {
        threadIndex: 1, // Dr. Michael Rivera
        messages: [
          {
            direction: "outbound" as const,
            body: "Hello Dr. Rivera, I need to schedule a follow-up appointment for Luna.",
            hoursAgo: 12,
          },
          {
            direction: "inbound" as const,
            body: "I can help you with that. What type of appointment are you looking for?",
            hoursAgo: 10,
          },
          {
            direction: "outbound" as const,
            body: "Just a routine checkup. Her last one was 6 months ago.",
            hoursAgo: 9,
          },
          {
            direction: "inbound" as const,
            body: "Perfect. I have availability next week. Would Tuesday at 2 PM work for you?",
            hoursAgo: 8,
          },
        ],
      },
      {
        threadIndex: 2, // Jake Thompson
        messages: [
          {
            direction: "outbound" as const,
            body: "Hi Jake, can you walk Luna this afternoon?",
            hoursAgo: 1,
          },
          {
            direction: "inbound" as const,
            body: "Sure thing! I can do a 30-minute walk at 3 PM. Does that work?",
            hoursAgo: 0.5,
          },
        ],
      },
      {
        threadIndex: 3, // Lisa Park
        messages: [
          {
            direction: "outbound" as const,
            body: "Hi Lisa, I'll be out of town next week. Can you check on Luna?",
            hoursAgo: 24,
          },
          {
            direction: "inbound" as const,
            body: "Absolutely! I can do daily check-ins. Just let me know the dates and any special instructions.",
            hoursAgo: 23,
          },
          {
            direction: "outbound" as const,
            body: "Great! I'll send you the details. Thanks so much!",
            hoursAgo: 22,
          },
        ],
      },
    ];

    let messageCount = 0;

    for (const conversation of sampleConversations) {
      const thread = threads[conversation.threadIndex];
      if (!thread) continue;

      const userEmail = user.email || `user@${domain}`;

      for (const msg of conversation.messages) {
        const sentAt = new Date();
        sentAt.setHours(sentAt.getHours() - msg.hoursAgo);

        const { error: msgError } = await supabase.from("thread_messages").insert({
          thread_id: thread.id,
          direction: msg.direction,
          sender_email: msg.direction === "outbound" ? userEmail : thread.recipient_email,
          recipient_email: msg.direction === "outbound" ? thread.recipient_email : userEmail,
          subject: thread.subject,
          body: msg.body,
          sent_at: sentAt.toISOString(),
        });

        if (msgError) {
          console.error(`  ❌ Error creating message: ${msgError.message}`);
        } else {
          messageCount++;
        }
      }
    }

    // Update thread updated_at timestamps
    for (const thread of threads) {
      const { error: updateError } = await supabase
        .from("message_threads")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", thread.id);

      if (updateError) {
        console.error(`  ⚠️  Error updating thread timestamp: ${updateError.message}`);
      }
    }

    console.log(`\n✅ Successfully created ${threads.length} threads and ${messageCount} messages!`);
    console.log(`\n📱 Open your app's Messages screen to see the sample conversations.`);
  } catch (error) {
    console.error("\n❌ Error seeding sample messages:", error);
    process.exit(1);
  }
}

// Run the script
seedSampleMessages();

