import { useState, useEffect, useCallback } from 'react';
import { createCommunicationContainer } from '../../comunication.container';
import type { ChatThreadDTO } from '../../application/dto/ChatThreadDTO';
import { useInboxRealtime } from './useInboxRealtime';
import { supabase } from '../../../../core/supabase/client';

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

interface UseChatNotificationsStandaloneReturn {
  notifications: ChatNotification[];
  totalUnread: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook standalone para obtener notificaciones de chat
 * No depende de ChatProvider, crea su propia instancia del container
 */
export function useChatNotificationsStandalone(): UseChatNotificationsStandaloneReturn {
  const [notifications, setNotifications] = useState<ChatNotification[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      const authenticated = !!data.session?.user;
      console.log('[Notifications] Auth check:', authenticated);
      setIsAuthenticated(authenticated);
    };
    
    void checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      const authenticated = !!session?.user;
      console.log('[Notifications] Auth state changed:', authenticated);
      setIsAuthenticated(authenticated);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loadNotifications = useCallback(async () => {
    // No cargar si no está autenticado
    if (!isAuthenticated) {
      console.log('[Notifications] User not authenticated, skipping load');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const container = createCommunicationContainer();
      const { useCases } = container;

      console.log('[Notifications] Loading notifications...');

      // Intentar cargar como vendedor primero
      const sellerResult = await useCases.listListerInbox.execute();

      if (sellerResult.isOk()) {
        const inbox = sellerResult.value;
        console.log('[Notifications] Seller inbox loaded:', inbox);
        const allThreads = inbox.groups.flatMap(g => g.threads);
        const unreadThreads = allThreads.filter(t => t.unreadCount > 0);
        
        console.log('[Notifications] Unread threads:', unreadThreads.length);
        const formattedNotifications = unreadThreads.map(thread => threadToNotification(thread));
        
        setNotifications(formattedNotifications);
        setTotalUnread(inbox.totalUnread);
        console.log('[Notifications] Total unread:', inbox.totalUnread);
      } else {
        console.log('[Notifications] Seller inbox failed, trying buyer inbox...');
        // Si falla, intentar como comprador
        const buyerResult = await useCases.listClientInbox.execute();
        
        if (buyerResult.isOk()) {
          const inboxes = buyerResult.value;
          console.log('[Notifications] Buyer inbox loaded:', inboxes);
          const unreadThreads = inboxes
            .filter(inbox => inbox.unreadCount > 0 && inbox.thread !== null)
            .map(inbox => inbox.thread!);
          
          console.log('[Notifications] Unread threads:', unreadThreads.length);
          const formattedNotifications = unreadThreads.map(thread => threadToNotification(thread));
          const totalUnreadCount = inboxes.reduce((sum, inbox) => sum + inbox.unreadCount, 0);
          
          setNotifications(formattedNotifications);
          setTotalUnread(totalUnreadCount);
          console.log('[Notifications] Total unread:', totalUnreadCount);
        } else {
          console.error('[Notifications] Both inbox attempts failed');
          setError('Error al cargar notificaciones');
          setNotifications([]);
          setTotalUnread(0);
        }
      }
    } catch (err) {
      console.error('[Notifications] Error al cargar notificaciones:', err);
      setError('Error inesperado al cargar notificaciones');
      setNotifications([]);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Cargar notificaciones al montar y cuando cambie el estado de autenticación
  useEffect(() => {
    if (isAuthenticated) {
      void loadNotifications();
    }
  }, [loadNotifications, isAuthenticated]);

  // Suscribirse a cambios en tiempo real solo si está autenticado
  useInboxRealtime({
    onNewMessage: () => {
      void loadNotifications();
    },
    onThreadUpdate: () => {
      void loadNotifications();
    },
    enabled: isAuthenticated,
  });

  return {
    notifications,
    totalUnread,
    loading,
    error,
    refresh: loadNotifications,
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
