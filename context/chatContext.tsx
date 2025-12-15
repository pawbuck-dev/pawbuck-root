import { Pet } from "@/context/petsContext";
import { supabase } from "@/utils/supabase";
import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  selectedPet: Pet | null;
  isChatOpen: boolean;
  setSelectedPet: (pet: Pet | null) => void;
  sendMessage: (message: string) => Promise<void>;
  clearMessages: () => void;
  openChat: () => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = useCallback(() => {
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setError(null);
    
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message,
      timestamp: new Date(),
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Build pet context if selected (including id for health record queries)
      const petContext: PetContext | null = selectedPet ? {
        id: selectedPet.id,
        name: selectedPet.name,
        animal_type: selectedPet.animal_type,
        breed: selectedPet.breed,
        date_of_birth: selectedPet.date_of_birth,
        sex: selectedPet.sex,
        weight_value: selectedPet.weight_value,
        weight_unit: selectedPet.weight_unit,
      } : null;

      // Build history (last 10 messages for context, including current user message)
      const history = [...messages, userMessage].slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call Milo chat function
      const { data, error: functionError } = await supabase.functions.invoke<{
        response: string;
        pet_name: string | null;
      }>("milo-chat", {
        body: {
          message,
          pet: petContext,
          history,
        },
      });

      if (functionError) {
        throw new Error(functionError.message || "Failed to get response");
      }

      if (!data?.response) {
        throw new Error("No response received");
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);
      
      // Add error message as assistant response
      const errorResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Woof! I'm having trouble right now. Please try again in a moment! 🐕",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedPet]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        selectedPet,
        isChatOpen,
        setSelectedPet,
        sendMessage,
        clearMessages,
        openChat,
        closeChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
