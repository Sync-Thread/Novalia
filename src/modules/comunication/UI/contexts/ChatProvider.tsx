import { createContext, useContext, useRef, type ReactNode } from "react";
import {
  createCommunicationContainer,
  type CommunicationContainer,
} from "../../comunication.container";

const ChatContext = createContext<CommunicationContainer | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const containerRef = useRef<CommunicationContainer | null>(null);
  if (!containerRef.current) {
    containerRef.current = createCommunicationContainer();
  }

  return <ChatContext.Provider value={containerRef.current}>{children}</ChatContext.Provider>;
}

export function useChatModule(): CommunicationContainer {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatModule must be used within a ChatProvider");
  }
  return context;
}
