// Milo Chat - AI Pet Assistant powered by Gemini with Function Calling (modular agentic)
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { callGeminiAPI } from "../_shared/gemini-api.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";
import { executeHealthTool, isHealthTool } from "./tools/health.ts";
import { get_county_vaccines } from "./tools/vaccines.ts";
import { search_faqs } from "./tools/knowledge.ts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PetContext {
  id: string;
  name: string;
  animal_type: string;
  breed: string;
  date_of_birth: string;
  sex: string;
  weight_value: number;
  weight_unit: string;
  country?: string;
}

interface ChatRequest {
  message: string;
  pet?: PetContext | null;
  history?: ChatMessage[];
}

const TOOL_OUTPUTS_NOTE =
  "You are Milo. Use the provided Tool Outputs (FAQs or Vaccine Laws) as the absolute source of truth. If data is missing for a specific county, state that you don't have the local records yet.";

const MILO_BASE_PROMPT = `Role: Milo, PawBuck's AI Pet Care Assistant. Use pet-related expressions sparingly. Sign-off: 🐕.
Mission: Provide data-driven, evidence-based pet care guidance utilizing user records.

${TOOL_OUTPUTS_NOTE}

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
- Response Style: Use Markdown headers and bullet points. Max 250 words. 🐕`;

function buildMiloSystemPrompt(opts: { petContext: string }): string {
  return MILO_BASE_PROMPT + opts.petContext;
}

// FAQ and vaccine tools (always available)
const FAQ_AND_VACCINE_DECLARATIONS = [
  {
    name: "search_faqs",
    description:
      "Search app FAQs. Use when the user asks about PawBuck features, how the app works, pet email, documents, or general FAQ topics.",
    parameters: {
      type: "object" as const,
      properties: {
        query: { type: "string" as const, description: "Search query for FAQ content" },
      },
      required: ["query"] as const,
    },
  },
  {
    name: "get_county_vaccines",
    description:
      "Get vaccine requirements for a location (county or country) and pet type. Use when the user asks about vaccine requirements or laws; use the pet's location or the county/place the user mentioned.",
    parameters: {
      type: "object" as const,
      properties: {
        county: { type: "string" as const, description: "County, state, or country name" },
        pet_type: { type: "string" as const, description: "Pet type, e.g. dog or cat" },
      },
      required: ["county", "pet_type"] as const,
    },
  },
];

// Health tools (only when a pet is selected)
const HEALTH_DECLARATIONS = [
  {
    name: "get_pet_vaccinations",
    description:
      "Get vaccination records for the currently selected pet. Use when the user asks about their pet's vaccinations, immunizations, or vaccine history.",
    parameters: { type: "object" as const, properties: {}, required: [] as const },
  },
  {
    name: "get_pet_medications",
    description:
      "Get medication records for the currently selected pet. Use when the user asks about their pet's medications, prescriptions, or medicine history.",
    parameters: { type: "object" as const, properties: {}, required: [] as const },
  },
  {
    name: "get_pet_lab_results",
    description:
      "Get lab test results for the currently selected pet. Use when the user asks about their pet's blood work, lab tests, or test results.",
    parameters: { type: "object" as const, properties: {}, required: [] as const },
  },
  {
    name: "get_pet_clinical_exams",
    description:
      "Get clinical exam records for the currently selected pet. Use when the user asks about their pet's vet visits, checkups, exams, or health history.",
    parameters: { type: "object" as const, properties: {}, required: [] as const },
  },
  {
    name: "get_pet_health_summary",
    description:
      "Get a complete health summary including all vaccinations, medications, lab results, and clinical exams. Use when the user wants an overview of their pet's health or asks general questions about their pet's medical history.",
    parameters: { type: "object" as const, properties: {}, required: [] as const },
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
- Weight: ${pet.weight_value} ${pet.weight_unit}${pet.country ? `\n- Country: ${pet.country}` : ""}

You have access to this pet's health records. Use the available functions to fetch vaccinations, medications, lab results, or clinical exams when the user asks about them.`;
}

function calculateAge(dateOfBirth: string): string {
  const birth = new Date(dateOfBirth);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years === 0) {
    return `${months} month${months !== 1 ? "s" : ""} old`;
  } else if (years === 1 && months < 0) {
    return `${12 + months} months old`;
  } else {
    return `${years} year${years !== 1 ? "s" : ""} old`;
  }
}

function buildConversationHistory(history: ChatMessage[] | undefined): unknown[] {
  if (!history || history.length === 0) {
    return [];
  }
  return history.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

/** Fetch latest pet profile from DB; fall back to payload pet or null. */
async function resolvePet(petFromBody: PetContext | null | undefined): Promise<PetContext | null> {
  if (!petFromBody?.id) return petFromBody ?? null;

  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("pets")
    .select("id, name, animal_type, breed, date_of_birth, sex, weight_value, weight_unit, country")
    .eq("id", petFromBody.id)
    .maybeSingle();

  if (error) {
    console.warn("[Milo Chat] Pet fetch error:", error.message);
    return petFromBody;
  }
  if (!data) return petFromBody;

  return {
    id: data.id,
    name: data.name,
    animal_type: data.animal_type,
    breed: data.breed,
    date_of_birth: data.date_of_birth,
    sex: data.sex,
    weight_value: data.weight_value,
    weight_unit: data.weight_unit,
    country: data.country ?? undefined,
  };
}

function buildFunctionDeclarations(includeHealth: boolean): Record<string, unknown>[] {
  const decls: Record<string, unknown>[] = [
    ...(FAQ_AND_VACCINE_DECLARATIONS as Record<string, unknown>[]),
  ];
  if (includeHealth) {
    decls.push(...(HEALTH_DECLARATIONS as Record<string, unknown>[]));
  }
  return decls;
}

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  petId: string | undefined
): Promise<string> {
  if (isHealthTool(name)) {
    if (!petId) return "No pet selected. Please select a pet to view health records.";
    return executeHealthTool(name, petId);
  }
  if (name === "search_faqs") {
    const query = typeof args.query === "string" ? args.query : String(args?.query ?? "");
    return search_faqs(query);
  }
  if (name === "get_county_vaccines") {
    const county = typeof args.county === "string" ? args.county : String(args?.county ?? "");
    const pet_type = typeof args.pet_type === "string" ? args.pet_type : String(args?.pet_type ?? "dog");
    return get_county_vaccines(county, pet_type);
  }
  throw new Error(`Unknown function: ${name}`);
}

const GENERATION_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

const SAFETY_SETTINGS = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
];

// @ts-expect-error Deno is provided by Supabase Edge runtime
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsRequest();
  }

  try {
    const body = (await req.json()) as ChatRequest;
    const { message, pet: petFromBody, history } = body;

    if (!message || message.trim() === "") {
      throw new Error("Message is required");
    }

    console.log(`[Milo Chat] Processing message: "${message.substring(0, 50)}..."`);

    const resolvedPet = await resolvePet(petFromBody);
    const systemPrompt = buildMiloSystemPrompt({
      petContext: buildPetContextPrompt(resolvedPet),
    });

    const conversationHistory = buildConversationHistory(history);
    let contents: unknown[] = [
      ...conversationHistory,
      { role: "user", parts: [{ text: message }] },
    ];

    const includeHealth = !!resolvedPet?.id;
    const functionDeclarations = buildFunctionDeclarations(includeHealth);
    const tools = [{ functionDeclarations }];

    let apiResult;
    try {
      apiResult = await callGeminiAPI(
        {
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          tools,
          generationConfig: GENERATION_CONFIG,
          safetySettings: SAFETY_SETTINGS,
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
    let iterations = 0;
    const maxIterations = 5;

    while (candidate?.content?.parts?.[0]?.functionCall && iterations < maxIterations) {
      const functionCall = candidate.content.parts[0].functionCall as {
        name: string;
        args?: Record<string, unknown>;
      };
      const fnName = functionCall.name;
      const fnArgs = functionCall.args ?? {};
      console.log(`[Milo Chat] Function call: ${fnName}`);

      let functionResult: string;
      try {
        functionResult = await executeTool(fnName, fnArgs, resolvedPet?.id);
      } catch (funcError) {
        console.error(`[Milo Chat] Function error:`, funcError);
        functionResult =
          `Error: ${funcError instanceof Error ? funcError.message : "Unknown error"}`;
      }

      contents = contents as Array<Record<string, unknown>>;
      contents.push({ role: "model", parts: [{ functionCall }] });
      contents.push({
        role: "function",
        parts: [{
          functionResponse: {
            name: fnName,
            response: { result: functionResult },
          },
        }],
      });

      try {
        apiResult = await callGeminiAPI(
          {
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools,
            generationConfig: GENERATION_CONFIG,
            safetySettings: SAFETY_SETTINGS,
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

    const responseText = candidate?.content?.parts?.[0]?.text;
    if (!responseText) {
      throw new Error("I couldn't come up with a response. Could you try rephrasing? 🐕");
    }

    console.log(`[Milo Chat] Response generated successfully`);

    return jsonResponse({
      response: responseText,
      pet_name: resolvedPet?.name ?? null,
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
