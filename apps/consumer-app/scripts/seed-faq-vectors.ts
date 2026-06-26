/**
 * RETIRED 2026-06-26 — Do not run. Canonical RAG: `public.documentation` via seed-documentation-rag.ts.
 * See docs/MILO_EDGE_DEPRECATION.md.
 *
 * @deprecated Use `scripts/seed-documentation-rag.ts` instead.
 */

import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_GEMINI_API_KEY = process.env.GOOGLE_GEMINI_API_KEY;

const EMBED_MODEL = "gemini-embedding-2";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const EMBED_DIM = 1536;

const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "What is PawBuck?",
    answer:
      "PawBuck is the app that brings everything about your pet into one place — health records, insurance, services, and more. All good things come one step at a time, and we've started with what matters most: making your life as a pet parent simpler by organizing all your pet's health documents. Every pet gets their own email address (like milo@pawbuck.app) that automatically sorts and stores everything the moment it arrives. This is just the beginning — more features are on the way, each one designed to make caring for your pet easier.",
  },
  {
    question: "How is PawBuck different from other pet apps?",
    answer:
      "PawBuck will eventually be the only app you'll ever need to care for your pet. But what truly makes us different is where we start — with your pet. Before we recommend anything, we take the time to understand your pet: their health, their history, their needs. That's why we began with health records. Once we understand your pet, we can recommend the nutrition that's right for them — not just what's available on a shelf. We can connect you with the right care provider — not just whoever is nearby. Everything we build starts from knowing your pet, so that every recommendation is personal, not generic. PawBuck also comes with Milo, your AI buddy who learns about your pet to provide you with personalized help along the way.",
  },
  {
    question: "How does my pet's email address work?",
    answer:
      "When you create a profile for your pet, they get a unique email address (yourpet@pawbuck.app). Any health document sent to this address is automatically saved, categorized, and added to their health record.",
  },
  {
    question: "What can I send to my pet's email?",
    answer:
      "Right now, health documents work best: vet invoices, vaccination certificates, prescriptions, lab results, and medical reports. We're expanding what PawBuck can process over time.",
  },
  {
    question: "Does PawBuck read the documents?",
    answer:
      "Yes. PawBuck automatically extracts key information like visit dates, vaccinations, medications, and costs — so you don't have to enter anything manually.",
  },
  {
    question: "What if my vet doesn't use PawBuck?",
    answer:
      "That's the beauty of it — your vet doesn't need to. Just ask them to send visit summaries, vaccination PDFs, lab results, and invoices directly to your pet's PawBuck email, or to CC it. You can also simply forward anything you receive. Either way, PawBuck organizes it all automatically.",
  },
  {
    question: "What information is stored in my pet's health profile?",
    answer:
      "Vaccination records, vet visit history, medications, allergies, dietary requirements, microchip number, vet contact information, and all forwarded documents.",
  },
  {
    question: "Can I add information manually?",
    answer:
      "Yes. You can upload documents, add notes, update details, or add photos anytime in the app.",
  },
  {
    question: "How do I share my pet's records?",
    answer:
      "Use the 'Download Pet Passport' option to create a complete health record you can share with vets, boarders, or caregivers.",
  },
  {
    question: "What if I don't have all my pet's past records?",
    answer:
      "Start fresh and begin forwarding documents from now on. You can request past records from your vet anytime.",
  },
  {
    question: "How much does PawBuck cost?",
    answer:
      "PawBuck's core features — your pet's health record, email address, and document organization — are free. We'll introduce optional premium features over time.",
  },
  {
    question: "How do I get started?",
    answer:
      "Download the PawBuck app, create your account, and set up your pet's profile to receive their unique email address.",
  },
  {
    question: "Do I need my pet's microchip number?",
    answer:
      "If you have it, it's best to add it to your pet's profile. This allows PawBuck to cross-check that the documents you receive contain the right information for your pet.",
  },
  {
    question: "Can I manage multiple pets?",
    answer:
      "Yes. Each pet gets their own profile and email address under one account.",
  },
  {
    question: "Do I need to enter all health information at once?",
    answer:
      "No. You can build your pet's health history gradually as documents arrive.",
  },
  {
    question: "What if I already have paper records or PDFs?",
    answer:
      "Email them to your pet's PawBuck address or upload them directly in the app. PawBuck will organize them automatically.",
  },
  {
    question: "Is my pet's data safe?",
    answer:
      "Yes. Your pet's health records and personal information are stored securely and are never shared with third parties without your permission.",
  },
  {
    question: "Does PawBuck help with pet insurance?",
    answer:
      "We're building tools to help you compare insurance options and understand what your pet's care actually costs. Eventually, PawBuck will even help you file insurance claims automatically — as soon as you complete a vet visit, we'll have all the requisite documents ready to go. Stay tuned.",
  },
  {
    question: "Will PawBuck remind me about vaccinations or medications?",
    answer:
      "Yes! PawBuck provides smart reminders on medications as soon as you upload your prescriptions. It also gives you a countdown on your pet's vaccinations so you always know what's coming up. We'll keep improving these features to do a lot more.",
  },
  {
    question: "Can I delete my data?",
    answer:
      "Yes. You can delete your account and all associated data from within the app at any time.",
  },
];

async function embedText(text: string): Promise<number[]> {
  const url = `${GEMINI_API_BASE}/${EMBED_MODEL}:embedContent?key=${GOOGLE_GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
      output_dimensionality: EMBED_DIM,
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Embed API error: ${res.status} ${t.slice(0, 200)}`);
  }
  const data = (await res.json()) as { embedding?: { values?: number[] } };
  const values = data?.embedding?.values;
  if (!values || !Array.isArray(values) || values.length !== EMBED_DIM) {
    throw new Error("Invalid embedding response");
  }
  return values;
}

async function main() {
  console.error(
    "seed-faq-vectors.ts is retired (2026-06-26).\n" +
      "Use: npx tsx scripts/seed-documentation-rag.ts --env-file .env.local\n" +
      "See docs/MILO_EDGE_DEPRECATION.md"
  );
  process.exit(1);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
    process.exit(1);
  }
  if (!GOOGLE_GEMINI_API_KEY) {
    console.error("Missing GOOGLE_GEMINI_API_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("Clearing existing faq_documents...");
  const { error: deleteError } = await supabase.from("faq_documents").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) {
    console.warn("Delete warning (table may be empty):", deleteError.message);
  }

  console.log(`Seeding ${FAQ_ITEMS.length} FAQs with embeddings...`);
  for (let i = 0; i < FAQ_ITEMS.length; i++) {
    const { question, answer } = FAQ_ITEMS[i];
    const content = `${question} ${answer}`.trim();
    process.stdout.write(`  [${i + 1}/${FAQ_ITEMS.length}] ${question.slice(0, 40)}... `);
    try {
      const embedding = await embedText(content);
      const { error } = await supabase.from("faq_documents").insert({
        question,
        answer,
        content,
        embedding,
      });
      if (error) throw error;
      console.log("ok");
    } catch (e) {
      console.log("failed");
      console.error(e);
      process.exit(1);
    }
  }
  console.log("Done. faq_documents is ready for Milo search_faqs.");
}

main();
