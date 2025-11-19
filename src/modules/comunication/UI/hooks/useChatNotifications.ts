import { useState, useEffect, useCallback } from 'react';
import { useChatModule } from '../contexts/ChatProvider';
import type { ChatThreadDTO } from '../../application/dto/ChatThreadDTO';
import { useInboxRealtime } from './useInboxRealtime';

export interface ChatNotification {
  id: string;
  threadId: string;
  propertyTitle: string | null;
  senderName: string | null;
  lastMessage: string | null;
  unreadCount: number;
  timestamp: string;
  propertyId: string | null;
}

interface UseChatNotificationsReturn {
  notifications: ChatNotification[];
  totalUnread: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  markAsRead: (threadId: string) => Promise<void>;
}

/**
 * Hook para obtener notificaciones de chat
 * Devuelve threads con mensajes no leídos formateados como notificaciones
 */
export function useChatNotifications(): UseChatNotificationsReturn {
  const { useCases } = useChatModule();
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Intentar cargar como vendedor primero
      const sellerResult = await useCases.listListerInbox.execute();

      if (sellerResult.isOk()) {
        const inbox = sellerResult.value;
        const allThreads = inbox.groups.flatMap(g => g.threads);
        const unreadThreads = allThreads.filter(t => t.unreadCount > 0);
        
        const formattedNotifications = unreadThreads.map(thread => threadToNotification(thread));
        
        setNotifications(formattedNotifications);
        setTotalUnread(inbox.totalUnread);
      } else {
        // Si falla, intentar como comprador
        const buyerResult = await useCases.listClientInbox.execute();
        
        if (buyerResult.isOk()) {
          const inboxes = buyerResult.value;
          const unreadThreads = inboxes
            .filter(inbox => inbox.unreadCount > 0 && inbox.thread !== null)
            .map(inbox => inbox.thread!);
          
          const formattedNotifications = unreadThreads.map(thread => threadToNotification(thread));
          const totalUnreadCount = inboxes.reduce((sum, inbox) => sum + inbox.unreadCount, 0);
          
          setNotifications(formattedNotifications);
          setTotalUnread(totalUnreadCount);
        } else {
          setError('Error al cargar notificaciones');
          setNotifications([]);
          setTotalUnread(0);
        }
      }
    } catch (err) {
      console.error('Error al cargar notificaciones:', err);
      setError('Error inesperado al cargar notificaciones');
      setNotifications([]);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [useCases]);

  const markAsRead = useCallback(async (_threadId: string) => {
    try {
      // Aquí puedes implementar lógica para marcar como leído si es necesario
      // Por ahora solo refrescamos
      await loadNotifications();
    } catch (err) {
      console.error('Error al marcar como leído:', err);
    }
  }, [loadNotifications]);

  // Cargar notificaciones al montar
  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  // Suscribirse a cambios en tiempo real
  useInboxRealtime({
    onNewMessage: () => {
      void loadNotifications();
    },
    onThreadUpdate: () => {
      void loadNotifications();
    },
    enabled: true,
  });

  return {
    notifications,
    totalUnread,
    loading,
    error,
    refresh: loadNotifications,
    markAsRead,
  };
}

/**
 * Convierte un ChatThreadDTO a ChatNotification
 */
function threadToNotification(thread: ChatThreadDTO): ChatNotification {
  // Encontrar el otro participante (tomamos el primero disponible)
  const otherParticipant = thread.participants[0];
  
  return {
    id: thread.id,
    threadId: thread.id,
    propertyTitle: thread.property?.title ?? 'Sin propiedad',
    senderName: otherParticipant?.displayName ?? 'Usuario',
    lastMessage: thread.lastMessage?.body ?? 'Nuevo mensaje',
    unreadCount: thread.unreadCount,
    timestamp: thread.lastMessageAt ?? thread.createdAt,
    propertyId: thread.property?.id ?? null,
  };
}
