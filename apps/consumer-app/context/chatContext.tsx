import { useAuth } from "@/context/authContext";
import { useSubscription } from "@/context/subscriptionContext";
import { Pet } from "@/context/petsContext";
import { hasAcceptedMiloGeneralChatDisclaimer } from "@/services/miloGeneralChatDisclaimer";
import type { MiloStarterScreen } from "@/services/miloSuggestedPrompts";
import {
  fetchMiloChat,
  type MiloChatFileAttachment,
  SubscriptionRequiredError,
} from "@/utils/miloChatApi";
import React, { createContext, ReactNode, useCallback, useContext, useState } from "react";

export type { MiloStarterScreen };

export type { MiloChatFileAttachment };

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  fileAttachments?: MiloChatFileAttachment[];
  /** Present when the server registered this assistant turn (POST /api/milo/chat/feedback). */
  turnId?: string;
  /** From POST /api/milo/chat — drives contextual per-bubble footers. */
  usedPetData?: boolean;
  usedRag?: boolean;
}

interface ChatContextType {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  selectedPet: Pet | null;
  isChatOpen: boolean;
  /** Which section opened Milo — used only for empty-state starter chips (same modal UI). */
  starterScreen: MiloStarterScreen;
  setSelectedPet: (pet: Pet | null) => void;
  sendMessage: (message: string) => Promise<void>;
  /** Append turns without calling the chat API (e.g. after document upload + classify). */
  appendLocalMessages: (messages: ChatMessage[]) => void;
  clearMessages: () => void;
  openChat: (options?: { starterScreen?: MiloStarterScreen }) => void;
  closeChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

function ChatProviderInner({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { openPaywall, refetchEntitlement } = useSubscription();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [starterScreen, setStarterScreen] = useState<MiloStarterScreen>("default");

  const openChat = useCallback((options?: { starterScreen?: MiloStarterScreen }) => {
    setStarterScreen(options?.starterScreen ?? "default");
    setIsChatOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsChatOpen(false);
    setStarterScreen("default");
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const appendLocalMessages = useCallback((toAppend: ChatMessage[]) => {
    if (toAppend.length === 0) return;
    setMessages((prev) => [...prev, ...toAppend]);
  }, []);

  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim()) return;

    setError(null);

    if (user?.id) {
      try {
        const accepted = await hasAcceptedMiloGeneralChatDisclaimer(user.id);
        if (!accepted) {
          setError("Please read and accept the disclaimer in the Milo window to continue.");
          return;
        }
      } catch {
        setError("Please read and accept the disclaimer in the Milo window to continue.");
        return;
      }
    }

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

      const result = await fetchMiloChat({
        message,
        pet: selectedPet,
        history,
        journalMode: false,
      });

      // Add assistant message using functional update
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.answer,
        timestamp: new Date(),
        fileAttachments: result.fileAttachments,
        turnId: result.turnId,
        usedPetData: result.usedPetData,
        usedRag: result.usedRag,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error("Chat error:", err);
      if (err instanceof SubscriptionRequiredError) {
        setError(err.message);
        openPaywall({
          source: "milo_chat",
          requiredPlan: err.upgradePlan,
          copyVariant: err.code === "milo_conversation_cap" ? "milo_conversation_cap" : "default",
        });
        void refetchEntitlement();
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
  }, [selectedPet, user?.id, openPaywall, refetchEntitlement]);

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        error,
        selectedPet,
        isChatOpen,
        starterScreen,
        setSelectedPet,
        sendMessage,
        appendLocalMessages,
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
