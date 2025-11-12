import { useState, useEffect, useCallback } from 'react';
import { useChatModule } from '../contexts/ChatProvider';
import { useChatRealtime } from './useChatRealtime';
import type { ChatMessageDTO } from '../../application/dto/ChatMessageDTO';

interface UseMessagesOptions {
  threadId: string | null;
  pageSize?: number;
  autoScroll?: boolean;
}

interface UseMessagesReturn {
  messages: ChatMessageDTO[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  isTyping: boolean;
}

/**
 * Hook para cargar y manejar mensajes de un thread
 * Incluye soporte para realtime updates y paginación
 * 
 * @param threadId - ID del thread (null si no hay thread seleccionado)
 * @param pageSize - Cantidad de mensajes por página (default: 50)
 * @param autoScroll - Si debe hacer scroll automático a nuevos mensajes
 * 
 * @example
 * ```tsx
 * function ChatMessages({ threadId }: { threadId: string }) {
 *   const { messages, loading, error, isTyping } = useMessages({ threadId });
 *   
 *   if (loading) return <div>Cargando mensajes...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return (
 *     <div>
 *       {messages.map(msg => (
 *         <MessageBubble key={msg.id} message={msg} />
 *       ))}
 *       {isTyping && <TypingIndicator />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMessages({
  threadId,
  pageSize = 50,
  autoScroll = true,
}: UseMessagesOptions): UseMessagesReturn {
  const { useCases } = useChatModule();
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  // Cargar mensajes iniciales
  const loadMessages = useCallback(
    async (page: number = 1) => {
      if (!threadId) {
        setMessages([]);
        setHasMore(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await useCases.listMessages.execute({
          threadId,
          page,
          pageSize,
        });

        if (result.isErr()) {
          const errorMsg = typeof result.error === 'object' && result.error !== null && 'message' in result.error
            ? (result.error as { message: string }).message
            : 'Error al cargar los mensajes';
          setError(errorMsg);
          setMessages([]);
          setHasMore(false);
        } else {
          const data = result.value;
          
          if (page === 1) {
            // Primera carga: reemplazar mensajes
            setMessages(data.items);
          } else {
            // Paginación: agregar mensajes antiguos al inicio
            setMessages(prev => [...data.items, ...prev]);
          }

          setHasMore(data.hasMore);
          setCurrentPage(page);
        }
      } catch (err) {
        console.error('Error al cargar mensajes:', err);
        setError('Error inesperado al cargar los mensajes');
        setMessages([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [threadId, pageSize, useCases],
  );

  // Cargar más mensajes (paginación)
  const loadMore = useCallback(async () => {
    if (!hasMore || loading) return;
    await loadMessages(currentPage + 1);
  }, [hasMore, loading, currentPage, loadMessages]);

  // Refrescar mensajes
  const refresh = useCallback(async () => {
    await loadMessages(1);
  }, [loadMessages]);

  // Cargar mensajes cuando cambia el threadId
  useEffect(() => {
    if (threadId) {
      void loadMessages(1);
    } else {
      setMessages([]);
      setHasMore(false);
    }
  }, [threadId, loadMessages]);

  // Handlers para realtime
  const handleNewMessage = useCallback(
    (newMessage: ChatMessageDTO) => {
      console.log('📨 Nuevo mensaje recibido vía realtime:', newMessage.id);
      setMessages(prev => {
        // Evitar duplicados verificando por ID
        const exists = prev.some(m => m.id === newMessage.id);
        if (exists) {
          console.log('⚠️ Mensaje duplicado ignorado:', newMessage.id);
          return prev;
        }
        // Agregar nuevo mensaje al final
        console.log('✅ Agregando mensaje nuevo al estado');
        return [...prev, newMessage];
      });

      // Auto-scroll si está habilitado
      if (autoScroll) {
        setTimeout(() => {
          const messagesContainer = document.querySelector('[data-messages-container]');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      }
    },
    [autoScroll],
  );

  const handleTyping = useCallback(() => {
    setIsTyping(true);
    
    // Ocultar indicador después de 3 segundos
    setTimeout(() => {
      setIsTyping(false);
    }, 3000);
  }, []);

  const handleDelivered = useCallback(() => {
    // Actualizar estado de entrega si es necesario
    // Por ahora solo lo registramos
    console.log('Mensaje entregado');
  }, []);

  // Subscribirse a eventos realtime del thread
  useChatRealtime(threadId, {
    onMessage: handleNewMessage,
    onTyping: handleTyping,
    onDelivered: handleDelivered,
  });

  // Marcar thread como leído cuando se carga
  useEffect(() => {
    if (threadId && messages.length > 0) {
      // Marcar como leído después de un pequeño delay
      const timer = setTimeout(() => {
        void useCases.markThreadAsRead.execute(threadId).then(result => {
          if (result.isErr()) {
            console.error('Error al marcar como leído:', result.error);
          }
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [threadId, messages.length, useCases]);

  return {
    messages,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    isTyping,
  };
}