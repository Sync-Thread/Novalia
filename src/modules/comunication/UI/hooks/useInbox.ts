import { useState, useEffect, useCallback } from 'react';
import { useChatModule } from '../contexts/ChatProvider';
import type { ChatThreadDTO } from '../../application/dto/ChatThreadDTO';
import type { ListerInboxDTO, ListerThreadGroupDTO, ClientInboxDTO } from '../../application/dto/InboxDTO';
import { useInboxRealtime } from './useInboxRealtime';

interface UseInboxOptions {
  role: 'buyer' | 'seller';
  search?: string;
}

interface UseInboxReturn {
  threads: ChatThreadDTO[];
  groups: ListerThreadGroupDTO[] | null;
  loading: boolean;
  error: string | null;
  totalUnread: number;
  refresh: () => Promise<void>;
}

/**
 * Hook para cargar el inbox del usuario
 * 
 * @param role - 'buyer' o 'seller'
 * @param search - Término de búsqueda opcional
 * 
 * @example
 * ```tsx
 * function ChatInbox() {
 *   const { threads, loading, error, totalUnread } = useInbox({ role: 'buyer' });
 *   
 *   if (loading) return <div>Cargando...</div>;
 *   if (error) return <div>Error: {error}</div>;
 *   
 *   return (
 *     <div>
 *       <h2>Mensajes ({totalUnread} sin leer)</h2>
 *       {threads.map(thread => (
 *         <ThreadCard key={thread.id} thread={thread} />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInbox({ role, search }: UseInboxOptions): UseInboxReturn {
  const { useCases } = useChatModule();
  const [threads, setThreads] = useState<ChatThreadDTO[]>([]);
  const [groups, setGroups] = useState<ListerInboxDTO['groups'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalUnread, setTotalUnread] = useState(0);

  const loadInbox = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (role === 'seller') {
        // Cargar inbox del vendedor (agrupado por propiedad)
        const result = await useCases.listListerInbox.execute();

        if (result.isErr()) {
          const errorMsg = typeof result.error === 'object' && result.error !== null && 'message' in result.error
            ? (result.error as { message: string }).message
            : 'Error al cargar las conversaciones';
          setError(errorMsg);
          setThreads([]);
          setGroups(null);
          setTotalUnread(0);
        } else {
          const inbox = result.value as ListerInboxDTO;
          
          // Extraer todos los threads de los grupos
          const allThreads = inbox.groups.flatMap(g => g.threads);
          
          // Aplicar filtro de búsqueda si existe
          const filteredThreads = search
            ? allThreads.filter(t => {
                const propertyMatch = t.property?.title?.toLowerCase().includes(search.toLowerCase());
                // Por ahora solo filtramos por propiedad ya que otherParticipant no está en el DTO
                return propertyMatch;
              })
            : allThreads;

          setThreads(filteredThreads);
          setGroups(inbox.groups);
          setTotalUnread(inbox.totalUnread);
        }
      } else {
        // Cargar inbox del comprador (array de ClientInboxDTO)
        const result = await useCases.listClientInbox.execute();

        if (result.isErr()) {
          const errorMsg = typeof result.error === 'object' && result.error !== null && 'message' in result.error
            ? (result.error as { message: string }).message
            : 'Error al cargar las conversaciones';
          setError(errorMsg);
          setThreads([]);
          setGroups(null);
          setTotalUnread(0);
        } else {
          // El resultado es un array de ClientInboxDTO
          const inboxes = result.value;
          
          // Extraer todos los threads
          const allThreads = inboxes
            .map(inbox => inbox.thread)
            .filter((thread): thread is Exclude<typeof thread, null> => thread !== null);
          
          // Aplicar filtro de búsqueda si existe
          const filteredThreads = search
            ? allThreads.filter(t => {
                const propertyMatch = t.property?.title?.toLowerCase().includes(search.toLowerCase());
                const participantMatch = t.participants.some(p => 
                  p.displayName?.toLowerCase().includes(search.toLowerCase())
                );
                return propertyMatch || participantMatch;
              })
            : allThreads;

          setThreads(filteredThreads);
          
          // Convertir a grupos para mostrar en el sidebar
          const buyerGroups = convertBuyerInboxToGroups(inboxes);
          setGroups(buyerGroups);
          
          // Calcular total de no leídos
          const totalUnreadCount = inboxes.reduce((sum, inbox) => sum + inbox.unreadCount, 0);
          setTotalUnread(totalUnreadCount);
        }
      }
    } catch (err) {
      console.error('Error al cargar inbox:', err);
      setError('Error inesperado al cargar las conversaciones');
      setThreads([]);
      setGroups(null);
      setTotalUnread(0);
    } finally {
      setLoading(false);
    }
  }, [role, search, useCases]);

  // Cargar inbox cuando cambia el rol o la búsqueda
  useEffect(() => {
    void loadInbox();
  }, [loadInbox]);

  // ✅ Suscribirse a cambios en tiempo real para auto-refresh
  useInboxRealtime({
    onNewMessage: () => {
      console.log('🔔 Nuevo mensaje detectado, refrescando inbox...');
      void loadInbox();
    },
    onThreadUpdate: () => {
      console.log('🔔 Thread actualizado, refrescando inbox...');
      void loadInbox();
    },
    enabled: true,
  });

  return {
    threads,
    groups,
    loading,
    error,
    totalUnread,
    refresh: loadInbox,
  };
}

/**
 * Convierte el array de ClientInboxDTO a formato de grupos para el comprador
 */
function convertBuyerInboxToGroups(inboxes: ClientInboxDTO[]): ListerThreadGroupDTO[] {
  return inboxes
    .filter(inbox => inbox.thread !== null)
    .map(inbox => ({
      property: inbox.property,
      threadCount: 1,
      unreadCount: inbox.unreadCount,
      threads: [inbox.thread!],
    }));
}