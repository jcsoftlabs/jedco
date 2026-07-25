"use client";

import { createContext, useContext, useState } from "react";

type ChatContextValue = {
  isOpen: boolean;
  showConversation: boolean;
  openChat: (showConversation?: boolean) => void;
  closeChat: () => void;
  goToConversation: () => void;
  goToWelcome: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  const openChat = (conversation = false) => {
    setIsOpen(true);
    setShowConversation(conversation);
  };
  const closeChat = () => setIsOpen(false);
  const goToConversation = () => setShowConversation(true);
  const goToWelcome = () => setShowConversation(false);

  return (
    <ChatContext.Provider
      value={{ isOpen, showConversation, openChat, closeChat, goToConversation, goToWelcome }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}
