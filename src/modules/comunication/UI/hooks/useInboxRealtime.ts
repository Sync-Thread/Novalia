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

    console.log('📡 Suscribiéndose a cambios de inbox en tiempo real');

    // Debounce para evitar múltiples llamadas rápidas
    let messageTimeout: ReturnType<typeof setTimeout> | null = null;
    let threadTimeout: ReturnType<typeof setTimeout> | null = null;

    // Suscripción a nuevos mensajes
    const messagesChannel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          console.log('📬 Nuevo mensaje detectado en inbox:', payload.new.id);
          
          // Debounce de 500ms para evitar múltiples refrescos
          if (messageTimeout) clearTimeout(messageTimeout);
          messageTimeout = setTimeout(() => {
            handlersRef.current.onNewMessage?.();
          }, 500);
        }
      )
      .subscribe();

    // Suscripción a actualizaciones de threads (last_message_at)
    const threadsChannel = supabase
      .channel('inbox-threads')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_threads',
        },
        (payload) => {
          console.log('🔄 Thread actualizado en inbox:', payload.new.id);
          
          // Debounce de 500ms
          if (threadTimeout) clearTimeout(threadTimeout);
          threadTimeout = setTimeout(() => {
            handlersRef.current.onThreadUpdate?.();
          }, 500);
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      console.log('🔌 Desuscribiéndose de cambios de inbox');
      if (messageTimeout) clearTimeout(messageTimeout);
      if (threadTimeout) clearTimeout(threadTimeout);
      void supabase.removeChannel(messagesChannel);
      void supabase.removeChannel(threadsChannel);
    };
  }, [enabled]);
}
