import { useEffect, useRef } from 'react';
import { supabase } from '../../../../core/supabase/client';

interface UseInboxRealtimeOptions {
  onNewMessage?: () => void;
  onThreadUpdate?: () => void;
  enabled?: boolean;
}

/**
 * Hook para escuchar cambios en tiempo real a nivel de inbox
 * Se suscribe a cambios en chat_threads y chat_messages para actualizar el inbox automáticamente
 * 
 * @param onNewMessage - Callback cuando llega un nuevo mensaje
 * @param onThreadUpdate - Callback cuando un thread se actualiza
 * @param enabled - Si la suscripción está habilitada (default: true)
 */
export function useInboxRealtime({
  onNewMessage,
  onThreadUpdate,
  enabled = true,
}: UseInboxRealtimeOptions) {
  const handlersRef = useRef({ onNewMessage, onThreadUpdate });

  // Actualizar ref cuando cambian los handlers
  useEffect(() => {
    handlersRef.current = { onNewMessage, onThreadUpdate };
  }, [onNewMessage, onThreadUpdate]);

  useEffect(() => {
    if (!enabled) return;

    // Debounce para evitar múltiples llamadas rápidas
    let messageTimeout: ReturnType<typeof setTimeout> | null = null;
    let threadTimeout: ReturnType<typeof setTimeout> | null = null;

    // Usar nombres únicos para evitar conflictos entre múltiples suscripciones
    const channelId = Math.random().toString(36).substring(7);

    // Suscripción a nuevos mensajes E UPDATES (cuando se marcan como leídos)
    const messagesChannel = supabase
      .channel(`inbox-messages-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Escuchar todos los eventos (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          // Debounce de 300ms para evitar múltiples refrescos
          if (messageTimeout) clearTimeout(messageTimeout);
          messageTimeout = setTimeout(() => {
            handlersRef.current.onNewMessage?.();
          }, 300);
        }
      )
      .subscribe();

    // Suscripción a actualizaciones de threads (last_message_at)
    const threadsChannel = supabase
      .channel(`inbox-threads-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_threads',
        },
        (payload) => {
          // Debounce de 300ms
          if (threadTimeout) clearTimeout(threadTimeout);
          threadTimeout = setTimeout(() => {
            handlersRef.current.onThreadUpdate?.();
          }, 300);
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      if (messageTimeout) clearTimeout(messageTimeout);
      if (threadTimeout) clearTimeout(threadTimeout);
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(threadsChannel);
    };
  }, [enabled]);
}
