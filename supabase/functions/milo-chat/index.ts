// Milo Chat - AI Pet Assistant powered by Gemini with Function Calling
import {
  errorResponse,
  handleCorsRequest,
  jsonResponse,
} from "../_shared/cors.ts";
import { createSupabaseClient } from "../_shared/supabase-utils.ts";

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

const MILO_SYSTEM_PROMPT = `You are Milo, a friendly and knowledgeable AI pet care assistant. You're represented by a cute black dog mascot.

Your personality:
- Warm, friendly, and enthusiastic about helping pet owners
- Knowledgeable about pet health, nutrition, behavior, and care
- Supportive and encouraging
- Use simple, clear language
- Occasionally use pet-related expressions and a dog emoji 🐕 to sign off

Your capabilities:
1. Answer pet health questions and provide general advice
2. Give pet care tips (nutrition, grooming, exercise, training)
3. Help users understand their pet's needs based on breed and age
4. Provide information about vaccinations, medications, and vet visits
5. Help navigate the PawBuck app features
6. ACCESS the pet's health records when needed (vaccinations, medications, lab results, clinical exams)

When a user asks about their pet's health records, vaccinations, medications, lab results, or clinical exams:
- Use the available functions to fetch the actual data
- Provide specific, personalized information from the records
- Summarize the data in a friendly, easy-to-understand way

Important guidelines:
- Always recommend consulting a veterinarian for serious health concerns
- Be cautious with medical advice - suggest professional help when needed
- If you don't know something, say so honestly
- Keep responses concise but helpful (2-3 paragraphs max)
- Personalize responses when pet context is provided
- When sharing health record data, highlight any upcoming due dates or concerns`;

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

// Health data fetching functions
async function fetchVaccinations(petId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("vaccinations")
    .select("*")
    .eq("pet_id", petId)
    .order("date", { ascending: false });

  if (error) throw new Error(`Failed to fetch vaccinations: ${error.message}`);
  return data || [];
}

async function fetchMedications(petId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("medicines")
    .select("*")
    .eq("pet_id", petId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch medications: ${error.message}`);
  return data || [];
}

async function fetchLabResults(petId: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase
    .from("lab_results")
    .select("*")
    .eq("pet_id", petId)
    .order("test_date", { ascending: false, nullsFirst: false });

  if (error) throw new Error(`Failed to fetch lab results: ${error.message}`);
  return data || [];
}

async function fetchClinicalExams(petId: string) {
  const supabase = createSupabaseClient();
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
async function executeFunctionCall(functionName: string, petId: string): Promise<string> {
  switch (functionName) {
    case "get_pet_vaccinations": {
      const data = await fetchVaccinations(petId);
      return formatVaccinations(data);
    }
    case "get_pet_medications": {
      const data = await fetchMedications(petId);
      return formatMedications(data);
    }
    case "get_pet_lab_results": {
      const data = await fetchLabResults(petId);
      return formatLabResults(data);
    }
    case "get_pet_clinical_exams": {
      const data = await fetchClinicalExams(petId);
      return formatClinicalExams(data);
    }
    case "get_pet_health_summary": {
      const [vaccinations, medications, labResults, exams] = await Promise.all([
        fetchVaccinations(petId),
        fetchMedications(petId),
        fetchLabResults(petId),
        fetchClinicalExams(petId),
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

    const GOOGLE_GEMINI_API_KEY = Deno.env.get("GOOGLE_GEMINI_API_KEY");

    if (!GOOGLE_GEMINI_API_KEY) {
      throw new Error("GOOGLE_GEMINI_API_KEY not configured");
    }

    console.log(`[Milo Chat] Processing message: "${message.substring(0, 50)}..."`);

    // Build the full system prompt with pet context
    const systemPrompt = MILO_SYSTEM_PROMPT + buildPetContextPrompt(pet);
    
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
    let geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
        }),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini API error:", errorText);

      if (geminiResponse.status === 429) {
        throw new Error("I'm a bit overwhelmed right now. Please try again in a moment! 🐕");
      }

      throw new Error("Sorry, I'm having trouble thinking right now. Please try again! 🐕");
    }

    let geminiData = await geminiResponse.json();
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
        functionResult = await executeFunctionCall(functionCall.name, pet.id);
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
      geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GOOGLE_GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
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
          }),
        }
      );

      if (!geminiResponse.ok) {
        const errorText = await geminiResponse.text();
        console.error("Gemini API error after function call:", errorText);
        throw new Error("Sorry, I'm having trouble processing the data. Please try again! 🐕");
      }

      geminiData = await geminiResponse.json();
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
