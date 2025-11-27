import { useState, useCallback, useEffect } from "react";
import type { ChatThreadDTO } from "../../../application/dto/ChatThreadDTO";
import { ChatProvider } from "../../contexts/ChatProvider";
import { useInbox } from "../../hooks/useInbox";
import { useMessages } from "../../hooks/useMessages";
import { useSendMessage } from "../../hooks/useSendMessage";
import { supabase } from "../../../../../core/supabase/client";
import styles from "./ChatBubble.module.css";

// Helper para obtener el otro participante del chat
function getOtherParticipant(thread: ChatThreadDTO, currentUserId: string | null) {
  // Si hay un contact (lead), siempre mostrarlo
  const contactParticipant = thread.participants.find(p => p.type === "contact");
  if (contactParticipant) return contactParticipant;
  
  // Si son dos users, mostrar el que NO es el usuario actual
  if (currentUserId) {
    const otherUser = thread.participants.find(p => p.id !== currentUserId);
    if (otherUser) return otherUser;
  }
  
  // Fallback: el primer participante
  return thread.participants[0];
}

export default function ChatBubble() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Verificar si hay sesión activa
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session);
    };

    void checkAuth();

    // Escuchar cambios en la autenticación
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Solo mostrar el chat si hay sesión activa
  if (!isAuthenticated) {
    return null;
  }

  return (
    <ChatProvider>
      <ChatBubbleWidget />
    </ChatProvider>
  );
}

function ChatBubbleWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(null);
  const [composer, setComposer] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Obtener el ID del usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id ?? null);
    };
    void getCurrentUser();
  }, []);

  // Siempre mostrar vista de comprador/buyer en la burbuja
  const { threads, loading: inboxLoading, totalUnread, refresh: refreshInbox } = useInbox({
    role: "buyer",
  });

  const {
    messages,
    loading: messagesLoading,
    refresh: refreshMessages,
  } = useMessages({ threadId: selectedThread?.id ?? null });

  const { sendMessage, sending } = useSendMessage({
    threadId: selectedThread?.id ?? null,
  });

  // Limpiar thread seleccionado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setSelectedThread(null);
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedThread(null);
    setComposer("");
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setSelectedThread(null);
  }, []);

  const handleSelectThread = useCallback(async (thread: ChatThreadDTO) => {
    setSelectedThread(thread);
    // Marcar como leído cuando se selecciona
    await refreshInbox();
  }, [refreshInbox]);

  const handleSendMessage = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!selectedThread || !composer.trim()) return;
      const success = await sendMessage(composer);
      if (success) {
        setComposer("");
        await Promise.all([refreshInbox(), refreshMessages()]);
      }
    },
    [composer, sendMessage, refreshInbox, refreshMessages, selectedThread]
  );

  const formatRelativeTime = (value: string): string => {
    const formatter = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
    const date = new Date(value);
    const deltaMinutes = Math.round((date.getTime() - Date.now()) / 60000);
    if (Math.abs(deltaMinutes) < 60) {
      return formatter.format(deltaMinutes, "minute");
    }
    const deltaHours = Math.round(deltaMinutes / 60);
    if (Math.abs(deltaHours) < 24) {
      return formatter.format(deltaHours, "hour");
    }
    const deltaDays = Math.round(deltaHours / 24);
    return formatter.format(deltaDays, "day");
  };

  const isOwnMessage = (senderId: string | null, thread: ChatThreadDTO): boolean => {
    const agentId = thread.participants.find(participant => participant.type === "user")?.id ?? null;
    return agentId !== null && senderId === agentId;
  };

  return (
    <>
      {/* Bubble button */}
      <button
        type="button"
        className={styles.bubbleButton}
        onClick={handleToggle}
        aria-label="Abrir chat"
      >
        {totalUnread > 0 && <span className={styles.bubbleBadge}>{totalUnread}</span>}
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className={styles.chatWindow}>
          {/* Header */}
          <div className={styles.chatHeader}>
            <h3 className={styles.chatTitle}>
              Mensajes {totalUnread > 0 && `(${totalUnread})`}
            </h3>
            <button
              type="button"
              className={styles.closeButton}
              onClick={handleClose}
              aria-label="Cerrar chat"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className={styles.chatContent}>
            {/* Thread list */}
            {!selectedThread && (
              <div className={styles.threadList}>
                {inboxLoading ? (
                  <div className={styles.loadingState}>Cargando conversaciones...</div>
                ) : threads.length === 0 ? (
                  <div className={styles.emptyState}>
                    <p>No tienes conversaciones activas</p>
                  </div>
                ) : (
                  threads.map(thread => {
                    const otherParticipant = getOtherParticipant(thread, currentUserId);
                    const contactName = otherParticipant?.displayName ?? "Contacto sin nombre";
                    const lastMessage = thread.lastMessage?.body ?? "Sin mensajes";
                    
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        className={styles.threadItem}
                        onClick={() => handleSelectThread(thread)}
                      >
                        <div className={styles.threadInfo}>
                          <div className={styles.threadName}>{contactName}</div>
                          <div className={styles.threadPreview}>{lastMessage}</div>
                          <div className={styles.threadTime}>
                            {formatRelativeTime(thread.lastMessageAt ?? thread.createdAt)}
                          </div>
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className={styles.threadBadge}>{thread.unreadCount}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            )}

            {/* Messages view */}
            {selectedThread && (
              <>
                {/* Conversation header */}
                <div className={styles.conversationHeader}>
                  <button
                    type="button"
                    className={styles.backButton}
                    onClick={handleBackToList}
                    aria-label="Volver a conversaciones"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationName}>
                      {getOtherParticipant(selectedThread, currentUserId)?.displayName ?? "Contacto"}
                    </div>
                    {selectedThread.property && (
                      <div className={styles.conversationProperty}>
                        {selectedThread.property.title}
                      </div>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className={styles.messagesContainer}>
                  {messagesLoading ? (
                    <div className={styles.loadingState}>Cargando mensajes...</div>
                  ) : messages.length === 0 ? (
                    <div className={styles.emptyState}>
                      <p>Inicia la conversación</p>
                    </div>
                  ) : (
                    messages.map(message => {
                      const isSelf = isOwnMessage(message.senderId, selectedThread);
                      return (
                        <div
                          key={message.id}
                          className={`${styles.message} ${
                            isSelf ? styles.messageSelf : styles.messageOther
                          }`}
                        >
                          <div className={styles.messageBody}>{message.body}</div>
                          <div className={styles.messageTime}>
                            {formatRelativeTime(message.createdAt)}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Composer */}
                <form className={styles.composer} onSubmit={handleSendMessage}>
                  <input
                    type="text"
                    className={styles.composerInput}
                    placeholder="Escribe un mensaje..."
                    value={composer}
                    onChange={e => setComposer(e.target.value)}
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    className={styles.sendButton}
                    disabled={sending || !composer.trim()}
                    aria-label="Enviar mensaje"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
