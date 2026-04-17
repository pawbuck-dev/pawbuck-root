import { Pet } from "@/context/petsContext";
import { useSubscription } from "@/context/subscriptionContext";
import { fetchMiloChatAnswer, SubscriptionRequiredError } from "@/utils/miloChatApi";
import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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

function ChatProviderInner({ children }: { children: ReactNode }) {
  const { openPaywall } = useSubscription();
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
    
    // Add user message using functional update to avoid stale closure
    let currentMessages: ChatMessage[] = [];
    setMessages((prev) => {
      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        role: "user",
        content: message,
        timestamp: new Date(),
      };
      currentMessages = [...prev, userMessage];
      return currentMessages;
    });
    
    setIsLoading(true);

    try {
      // Prior turns only (current message is sent separately as `message`)
      const history = currentMessages.slice(0, -1).slice(-10).map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const answer = await fetchMiloChatAnswer({
        message,
        pet: selectedPet,
        history,
        journalMode: false,
      });

      // Add assistant message using functional update
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      if (err instanceof SubscriptionRequiredError) {
        openPaywall("milo_chat");
        setError(err.message);
        return;
      }
      const errorMessage = err instanceof Error ? err.message : "Something went wrong";
      setError(errorMessage);

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
  }, [selectedPet, openPaywall]);

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
}

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ChatProviderInner>{children}</ChatProviderInner>
);

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
};
