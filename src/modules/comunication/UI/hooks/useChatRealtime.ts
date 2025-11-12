import { useEffect, useRef } from "react";
import type { ThreadRealtimeHandlers } from "../../application/ports/RealtimeService";
import { useChatModule } from "../contexts/ChatProvider";

export function useChatRealtime(threadId: string | null, handlers: ThreadRealtimeHandlers) {
  const { realtime } = useChatModule();
  const handlersRef = useRef(handlers);

  // Actualizar ref cuando cambian los handlers
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (!threadId) {
      return;
    }

    let active = true;

    // Usar handlers desde ref para evitar re-suscripciones
    const stableHandlers: ThreadRealtimeHandlers = {
      onMessage: (msg) => handlersRef.current.onMessage?.(msg),
      onTyping: (userId) => handlersRef.current.onTyping?.(userId),
      onDelivered: () => handlersRef.current.onDelivered?.(),
    };

    realtime.subscribeToThread(threadId, stableHandlers).then(result => {
      if (result.isErr && result.isErr() && !import.meta.env.PROD) {
        console.error("Failed to subscribe to chat realtime channel", result.error);
      }
    });

    return () => {
      if (active) {
        void realtime.unsubscribe(threadId);
        active = false;
      }
    };
  }, [threadId, realtime]); // Solo threadId y realtime como dependencias
}
