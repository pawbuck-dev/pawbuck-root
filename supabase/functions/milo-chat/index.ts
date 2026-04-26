// Milo Chat - AI Pet Assistant powered by Gemini with Function Calling
// Deprecated for production app: consumer chat uses PawBuck.API POST /api/milo/chat (plan + Npgsql + optional RAG).
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import type { SupabaseClient } from "supabase";
import { callGeminiAPI } from "../_shared/gemini-api.ts";
import {
  createSupabaseClient,
  createUserSupabaseClient,
} from "../_shared/supabase-utils.ts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PetContext {
  id: string;
  name: string;
  animal_type: string;
  breed: string;
  date_of_birth: string;
  sex: string;
  weight_value: number;
  weight_unit: string;
}

interface ChatRequest {
  message: string;
  pet?: PetContext | null;
  history?: ChatMessage[];
}

const MILO_SYSTEM_PROMPT = `Role: Milo, PawBuck’s AI Pet Care Assistant. Use pet-related expressions sparingly. Sign-off: 🐕.
Mission: Provide data-driven, evidence-based pet care guidance utilizing user records.

Operational Logic:
1. DATA-FIRST: Always query pet profile (age, breed, weight history, location, medical notes) before answering.
2. CONFIDENCE: Provide specific guidance only if ≥85% confident based on AAHA, AVMA, or breed standards. Otherwise, defer to a veterinarian.
3. SCOPE: Focus on nutrition (AAFCO), grooming, behavior, and weight management. Refuse off-topic or human health queries.
4. EMERGENCY: For acute symptoms (poisoning, trauma, seizures), respond immediately with: "EMERGENCY! Immediate veterinary care required. Call a vet NOW."

Vaccination Framework:
- Compare user records against local laws (e.g., State Rabies requirements) and endemic risks (e.g., Lyme/Lepto).
- Explicitly flag "Current," "Approaching," or "Overdue" status based on history.

Weight/Growth Framework:
- Use breed-specific growth charts. Classify by percentile (Ideal: 50th-75th). 
- If >85th (Obese/Overweight), provide:
  - Caloric target using metabolic weight formulas.
  - Portion guidance (cups/day) and treat limits (10% rule).
  - Activity targets (minutes/day) based on breed energy levels.

Safety & Constraints:
- NO Diagnosis/Prescription: Explain symptoms generally; never name a disease or dose a medication.
- Vet Disclaimer: Mandatory for health replies: "Please consult your veterinarian for a professional diagnosis and before making changes to your pet's medical care."
- Response Style: Use Markdown headers and bullet points. Max 250 words. 🐕`



// Function declarations for Gemini
const functionDeclarations = [
  {
    name: "get_pet_vaccinations",
    description: "Get vaccination records for the currently selected pet. Use this when the user asks about their pet's vaccinations, immunizations, or vaccine history.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pet_medications",
    description: "Get medication records for the currently selected pet. Use this when the user asks about their pet's medications, prescriptions, or medicine history.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pet_lab_results",
    description: "Get lab test results for the currently selected pet. Use this when the user asks about their pet's blood work, lab tests, or test results.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pet_clinical_exams",
    description: "Get clinical exam records for the currently selected pet. Use this when the user asks about their pet's vet visits, checkups, exams, or health history.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_pet_health_summary",
    description: "Get a complete health summary including all vaccinations, medications, lab results, and clinical exams. Use this when the user wants an overview of their pet's health or asks general questions about their pet's medical history.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

function buildPetContextPrompt(pet: PetContext | null | undefined): string {
  if (!pet) {
    return "\n\nNo specific pet is currently selected. Provide general advice. You cannot access health records without a selected pet.";
  }

  const age = calculateAge(pet.date_of_birth);
  
  return `\n\nCurrently selected pet:
- Name: ${pet.name}
- Type: ${pet.animal_type}
- Breed: ${pet.breed}
- Age: ${age}
- Sex: ${pet.sex}
- Weight: ${pet.weight_value} ${pet.weight_unit}

You have access to this pet's health records. Use the available functions to fetch vaccinations, medications, lab results, or clinical exams when the user asks about them.`;
}

const VIEW_ONLY_MILO_SUFFIX = `
Access note: The signed-in user has view-only access to this pet. You may call read-only tools (e.g. get_pet_*). Do not call any tool whose purpose is to create, update, or delete records. If the user asks you to add or change a medication or other health record, say clearly that view-only access prevents that and suggest asking someone with full access on the pet profile.`;

/** Names or prefixes that indicate mutating tools (future-proof beyond current get_* tools). */
function isWriteStyleMiloTool(name: string): boolean {
  const n = name.toLowerCase();
  if (
    n.startsWith("get_") ||
    n.startsWith("fetch_") ||
    n.startsWith("search_") ||
    n.startsWith("list_")
  ) {
    return false;
  }
  return (
    n.startsWith("create_") ||
    n.startsWith("update_") ||
    n.startsWith("add_") ||
    n.startsWith("delete_") ||
    n.startsWith("remove_") ||
    n.startsWith("save_") ||
    n.startsWith("set_") ||
    n.startsWith("insert_") ||
    n.startsWith("upsert_")
  );
}

function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();
  
  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''} old`;
  } else if (years === 1 && months < 0) {
    return `${12 + months} months old`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''} old`;
  }
}

function buildConversationHistory(history: ChatMessage[] | undefined): any[] {
  if (!history || history.length === 0) {
    return [];
  }

  return history.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

// Health data fetching functions (RLS enforced via caller-scoped client)
async function fetchVaccinations(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  if (error) throw new Error(`Failed to fetch vaccinations: ${error.message}`);
  return data || [];
}

async function fetchMedications(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch medications: ${error.message}`);
  return data || [];
}

async function fetchLabResults(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("pet_id", petId)
    .order("test_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch lab results: ${error.message}`);
  return data || [];
}

async function fetchClinicalExams(supabase: SupabaseClient, petId: string) {
  const { data, error } = await supabase
    .from("clinical_exams")
    .select("*")
    .eq("pet_id", petId)
    .order("exam_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch clinical exams: ${error.message}`);
  return data || [];
}

// Format functions for AI-readable output
function formatVaccinations(vaccinations: any[]): string {
  if (vaccinations.length === 0) {
    return "No vaccination records found for this pet.";
  }

  const formatted = vaccinations.map((v) => {
    const lines = [`- ${v.name}`, `  Date: ${v.date}`];
    if (v.expiry_date) lines.push(`  Expiry: ${v.expiry_date}`);
    if (v.batch_number) lines.push(`  Batch: ${v.batch_number}`);
    if (v.vet_name) lines.push(`  Vet: ${v.vet_name}`);
    if (v.clinic_name) lines.push(`  Clinic: ${v.clinic_name}`);
    if (v.notes) lines.push(`  Notes: ${v.notes}`);
    return lines.join("\n");
  });

  return `Vaccination Records (${vaccinations.length} total):\n\n${formatted.join("\n\n")}`;
}

function formatMedications(medications: any[]): string {
  if (medications.length === 0) {
    return "No medication records found for this pet.";
  }

  const formatted = medications.map((m) => {
    const lines = [`- ${m.name} (${m.type})`, `  Dosage: ${m.dosage}`, `  Frequency: ${m.frequency}`];
    if (m.start_date) lines.push(`  Start Date: ${m.start_date}`);
    if (m.end_date) lines.push(`  End Date: ${m.end_date}`);
    if (m.prescribed_by) lines.push(`  Prescribed By: ${m.prescribed_by}`);
    if (m.purpose) lines.push(`  Purpose: ${m.purpose}`);
    if (m.next_due_date) lines.push(`  Next Due: ${m.next_due_date}`);
    return lines.join("\n");
  });

  return `Medication Records (${medications.length} total):\n\n${formatted.join("\n\n")}`;
}

function formatLabResults(labResults: any[]): string {
  if (labResults.length === 0) {
    return "No lab result records found for this pet.";
  }

  const formatted = labResults.map((lr) => {
    const lines = [`- ${lr.test_type}`, `  Lab: ${lr.lab_name}`];
    if (lr.test_date) lines.push(`  Date: ${lr.test_date}`);
    if (lr.ordered_by) lines.push(`  Ordered By: ${lr.ordered_by}`);
    
    if (lr.results && Array.isArray(lr.results) && lr.results.length > 0) {
      lines.push(`  Results:`);
      lr.results.forEach((r: any) => {
        const statusEmoji = r.status === "normal" ? "✓" : r.status === "high" ? "↑" : "↓";
        lines.push(`    ${statusEmoji} ${r.testName}: ${r.value} ${r.unit} (Ref: ${r.referenceRange})`);
      });
    }
    return lines.join("\n");
  });

  return `Lab Results (${labResults.length} total):\n\n${formatted.join("\n\n")}`;
}

function formatClinicalExams(exams: any[]): string {
  if (exams.length === 0) {
    return "No clinical exam records found for this pet.";
  }

  const formatted = exams.map((e) => {
    const lines = [`- ${e.exam_type || "General Exam"}`, `  Date: ${e.exam_date}`];
    if (e.clinic_name) lines.push(`  Clinic: ${e.clinic_name}`);
    if (e.vet_name) lines.push(`  Vet: ${e.vet_name}`);
    
    const vitals: string[] = [];
    if (e.weight_value) vitals.push(`Weight: ${e.weight_value} ${e.weight_unit || "kg"}`);
    if (e.temperature) vitals.push(`Temp: ${e.temperature}°F`);
    if (e.heart_rate) vitals.push(`HR: ${e.heart_rate} bpm`);
    if (e.respiratory_rate) vitals.push(`RR: ${e.respiratory_rate}/min`);
    if (vitals.length > 0) lines.push(`  Vitals: ${vitals.join(", ")}`);
    
    if (e.findings) lines.push(`  Findings: ${e.findings}`);
    if (e.notes) lines.push(`  Notes: ${e.notes}`);
    if (e.follow_up_date) lines.push(`  Follow-up: ${e.follow_up_date}`);
    return lines.join("\n");
  });

  return `Clinical Exam Records (${exams.length} total):\n\n${formatted.join("\n\n")}`;
}

// Execute function call
async function executeFunctionCall(
  functionName: string,
  petId: string,
  supabase: SupabaseClient,
  viewOnly: boolean
): Promise<string> {
  if (viewOnly && isWriteStyleMiloTool(functionName)) {
    return "Tool refused: this account has view-only access to this pet's records. I can't add or change data on your behalf—ask someone with full access on the pet profile if you need updates saved.";
  }
  switch (functionName) {
    case "get_pet_vaccinations": {
      const data = await fetchVaccinations(supabase, petId);
      return formatVaccinations(data);
    }
    case "get_pet_medications": {
      const data = await fetchMedications(supabase, petId);
      return formatMedications(data);
    }
    case "get_pet_lab_results": {
      const data = await fetchLabResults(supabase, petId);
      return formatLabResults(data);
    }
    case "get_pet_clinical_exams": {
      const data = await fetchClinicalExams(supabase, petId);
      return formatClinicalExams(data);
    }
    case "get_pet_health_summary": {
      const [vaccinations, medications, labResults, exams] = await Promise.all([
        fetchVaccinations(supabase, petId),
        fetchMedications(supabase, petId),
        fetchLabResults(supabase, petId),
        fetchClinicalExams(supabase, petId),
      ]);
      return `=== PET HEALTH SUMMARY ===\n\n${formatVaccinations(vaccinations)}\n\n---\n\n${formatMedications(medications)}\n\n---\n\n${formatLabResults(labResults)}\n\n---\n\n${formatClinicalExams(exams)}`;
    }
    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }

  try {
    const body: ChatRequest = await req.json();
    const { message, pet, history } = body;

    if (!message || message.trim() === "") {
      throw new Error("Message is required");
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    let userSupabase: SupabaseClient | null = null;
    let resolvedPetRole: string | null = null;
    if (pet?.id) {
      if (!authHeader.trim()) {
        return errorResponse("Unauthorized", 401);
      }
      try {
        userSupabase = createUserSupabaseClient(authHeader);
      } catch {
        return errorResponse("Server misconfigured", 500);
      }
      const { data: roleData, error: petRoleErr } = await userSupabase.rpc(
        "get_user_pet_role",
        { p_pet_id: pet.id }
      );
      if (petRoleErr) {
        console.error("[Milo Chat] get_user_pet_role", petRoleErr);
        return errorResponse("Failed to verify pet access", 500);
      }
      if (roleData == null) {
        return errorResponse("Unauthorized", 403);
      }
      resolvedPetRole = typeof roleData === "string" ? roleData : String(roleData);
    }

    const healthSupabase = userSupabase ?? createSupabaseClient();
    const viewOnly = resolvedPetRole === "view_only";

    console.log(`[Milo Chat] Processing message: "${message.substring(0, 50)}..."`);

    // Build the full system prompt with pet context
    const systemPrompt =
      MILO_SYSTEM_PROMPT +
      buildPetContextPrompt(pet) +
      (viewOnly ? VIEW_ONLY_MILO_SUFFIX : "");
    
    // Build conversation history
    const conversationHistory = buildConversationHistory(history);

    // Add current user message
    let contents: any[] = [
      ...conversationHistory,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    // Only include function declarations if a pet is selected
    const tools = pet?.id ? [{ functionDeclarations }] : undefined;

    // Call Gemini API with function calling
    let apiResult;
    try {
      apiResult = await callGeminiAPI(
        {
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents,
          tools,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE",
            },
          ],
        },
        "milo-chat"
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Gemini API error:", errorMessage);

      if (errorMessage.includes("429")) {
        throw new Error("I'm a bit overwhelmed right now. Please try again in a moment! 🐕");
      }

      throw new Error("Sorry, I'm having trouble thinking right now. Please try again! 🐕");
    }

    let geminiData = apiResult.data;
    let candidate = geminiData.candidates?.[0];

    // Handle function calls (loop to handle multiple calls if needed)
    let iterations = 0;
    const maxIterations = 3;

    while (candidate?.content?.parts?.[0]?.functionCall && iterations < maxIterations) {
      const functionCall = candidate.content.parts[0].functionCall;
      console.log(`[Milo Chat] Function call: ${functionCall.name}`);

      if (!pet?.id) {
        // No pet selected, can't execute function
        break;
      }

      // Execute the function
      let functionResult: string;
      try {
        functionResult = await executeFunctionCall(
          functionCall.name,
          pet.id,
          healthSupabase,
          viewOnly
        );
      } catch (funcError) {
        console.error(`[Milo Chat] Function error:`, funcError);
        functionResult = `Error fetching data: ${funcError instanceof Error ? funcError.message : "Unknown error"}`;
      }

      // Add the model's function call to contents
      contents.push({
        role: "model",
        parts: [{ functionCall }],
      });

      // Add the function response to contents
      contents.push({
        role: "function",
        parts: [{
          functionResponse: {
            name: functionCall.name,
            response: { result: functionResult },
          },
        }],
      });

      // Call Gemini again with the function result
      try {
        apiResult = await callGeminiAPI(
          {
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents,
            tools,
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            },
            safetySettings: [
              {
                category: "HARM_CATEGORY_HARASSMENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE",
              },
              {
                category: "HARM_CATEGORY_HATE_SPEECH",
                threshold: "BLOCK_MEDIUM_AND_ABOVE",
              },
              {
                category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE",
              },
              {
                category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                threshold: "BLOCK_MEDIUM_AND_ABOVE",
              },
            ],
          },
          "milo-chat"
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Gemini API error after function call:", errorMessage);
        throw new Error("Sorry, I'm having trouble processing the data. Please try again! 🐕");
      }

      geminiData = apiResult.data;
      candidate = geminiData.candidates?.[0];
      iterations++;
    }

    // Extract final text response
    const responseText = candidate?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error("I couldn't come up with a response. Could you try rephrasing? 🐕");
    }

    console.log(`[Milo Chat] Response generated successfully`);

    return jsonResponse({
      response: responseText,
      pet_name: pet?.name || null,
    });
  } catch (error) {
    console.error("[Milo Chat] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Woof! Something went wrong. Please try again! 🐕",
      400
    );
  }
});

/* To invoke locally:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/milo-chat' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"message": "What vaccinations does my dog have?", "pet": {"id": "pet-uuid-here", "name": "Max", "animal_type": "Dog", "breed": "Golden Retriever", "date_of_birth": "2022-01-15", "sex": "Male", "weight_value": 65, "weight_unit": "lbs"}}'

*/
