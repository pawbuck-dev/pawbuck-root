// Milo Chat - AI Pet Assistant powered by Gemini
import {
    errorResponse,
    handleCorsRequest,
    jsonResponse,
} from "../_shared/cors.ts";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface PetContext {
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

Important guidelines:
- Always recommend consulting a veterinarian for serious health concerns
- Be cautious with medical advice - suggest professional help when needed
- If you don't know something, say so honestly
- Keep responses concise but helpful (2-3 paragraphs max)
- Personalize responses when pet context is provided`;

function buildPetContextPrompt(pet: PetContext | null | undefined): string {
  if (!pet) {
    return "\n\nNo specific pet is currently selected. Provide general advice.";
  }

  const age = calculateAge(pet.date_of_birth);
  
  return `\n\nCurrently selected pet:
- Name: ${pet.name}
- Type: ${pet.animal_type}
- Breed: ${pet.breed}
- Age: ${age}
- Sex: ${pet.sex}
- Weight: ${pet.weight_value} ${pet.weight_unit}

Use this information to personalize your responses when relevant.`;
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
    const contents = [
      ...conversationHistory,
      {
        role: "user",
        parts: [{ text: message }],
      },
    ];

    // Call Gemini API
    const geminiResponse = await fetch(
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

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

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
    --data '{"message": "What are some tips for keeping my dog healthy?", "pet": {"name": "Max", "animal_type": "Dog", "breed": "Golden Retriever", "date_of_birth": "2022-01-15", "sex": "Male", "weight_value": 65, "weight_unit": "lbs"}}'

*/
