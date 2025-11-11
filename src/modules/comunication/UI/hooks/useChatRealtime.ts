import { useEffect } from "react";
import type { ThreadRealtimeHandlers } from "../../application/ports/RealtimeService";
import { useChatModule } from "../contexts/ChatProvider";

export function useChatRealtime(threadId: string | null, handlers: ThreadRealtimeHandlers) {
  const { realtime } = useChatModule();

  useEffect(() => {
    if (!threadId) {
      return;
    }

    let active = true;
    realtime.subscribeToThread(threadId, handlers).then(result => {
      if (result.isErr && result.isErr() && !import.meta.env.PROD) {
        // eslint-disable-next-line no-console
        console.error("Failed to subscribe to chat realtime channel", result.error);
      }
    });

    return () => {
      if (active) {
        void realtime.unsubscribe(threadId);
        active = false;
      }
    };
  }, [threadId, handlers.onMessage, handlers.onTyping, handlers.onDelivered]);
}
