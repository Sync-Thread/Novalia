import { useEffect, useRef, useState } from 'react';
import type { ChatMessageDTO } from '../../../application/dto/ChatMessageDTO';
import type { ChatThreadDTO } from '../../../application/dto/ChatThreadDTO';
import { MessageBubble } from '../MessageBubble';
import styles from './MessageList.module.css';

interface MessageListProps {
  messages: ChatMessageDTO[];
  currentThread: ChatThreadDTO | null;
  loading?: boolean;
  error?: string | null;
  hasMore?: boolean;
  isTyping?: boolean;
  onLoadMore?: () => void;
}

/**
 * Lista de mensajes con auto-scroll y separadores de fecha
 * 
 * @param messages - Array de mensajes a mostrar
 * @param currentThread - Thread actual para determinar quién es el usuario
 * @param loading - Estado de carga
 * @param error - Mensaje de error
 * @param hasMore - Si hay más mensajes antiguos para cargar
 * @param isTyping - Si el otro usuario está escribiendo
 * @param onLoadMore - Callback para cargar más mensajes
 */
export function MessageList({
  messages,
  currentThread,
  loading,
  error,
  hasMore,
  isTyping,
  onLoadMore,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [newMessages, setNewMessages] = useState(0);
  const lastMessageCountRef = useRef(messages.length);

  // Auto-scroll cuando llegan mensajes nuevos
  useEffect(() => {
    if (!scrollRef.current) return;

    const isAtBottom = isScrolledToBottom(scrollRef.current);
    const hasNewMessages = messages.length > lastMessageCountRef.current;

    if (hasNewMessages) {
      if (isAtBottom) {
        scrollToBottom();
        setNewMessages(0);
      } else {
        setNewMessages(prev => prev + (messages.length - lastMessageCountRef.current));
      }
    }

    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Detectar scroll para mostrar/ocultar botón
  const handleScroll = () => {
    if (!scrollRef.current) return;
    const atBottom = isScrolledToBottom(scrollRef.current);
    setShowScrollButton(!atBottom && messages.length > 0);
    
    if (atBottom) {
      setNewMessages(0);
    }
  };

  const scrollToBottom = (smooth = true) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  const handleScrollToBottom = () => {
    scrollToBottom();
    setNewMessages(0);
  };

  // Agrupar mensajes por fecha
  const groupedMessages = groupMessagesByDate(messages);

  if (loading && messages.length === 0) {
    return (
      <div className={styles.messageList}>
        <div className={styles.loadingState}>Cargando mensajes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.messageList}>
        <div className={styles.errorState}>Error: {error}</div>
      </div>
    );
  }

  if (messages.length === 0 && !loading) {
    return (
      <div className={styles.messageList}>
        <div className={styles.emptyState}>
          No hay mensajes aún. ¡Inicia la conversación!
        </div>
      </div>
    );
  }

  return (
    <div className={styles.messageList} ref={scrollRef} onScroll={handleScroll}>
      <div className={styles.scrollContainer}>
        {hasMore && (
          <button
            className={styles.loadMoreButton}
            onClick={onLoadMore}
            disabled={loading}
          >
            {loading ? 'Cargando...' : 'Cargar mensajes anteriores'}
          </button>
        )}

        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            <div className={styles.dateSeparator}>
              <span className={styles.dateLabel}>{group.dateLabel}</span>
            </div>

            {group.messages.map(message => {
              const isMine = isOwnMessage(message, currentThread);
              const sender = currentThread?.participants.find(
                p => p.id === message.senderId
              );

              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isMine={isMine}
                  senderName={sender?.displayName}
                  showSender={!isMine}
                />
              );
            })}
          </div>
        ))}

        {isTyping && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDots}>
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
              <span className={styles.typingDot} />
            </div>
          </div>
        )}
      </div>

      {showScrollButton && (
        <button className={styles.scrollToBottom} onClick={handleScrollToBottom}>
          <span>↓</span>
          {newMessages > 0 && (
            <span className={styles.newMessageBadge}>{newMessages} nuevo{newMessages > 1 ? 's' : ''}</span>
          )}
          {newMessages === 0 && <span>Ir al final</span>}
        </button>
      )}
    </div>
  );
}

function isScrolledToBottom(element: HTMLElement): boolean {
  const threshold = 50; // pixels de margen
  return element.scrollHeight - element.scrollTop - element.clientHeight < threshold;
}

function isOwnMessage(message: ChatMessageDTO, thread: ChatThreadDTO | null): boolean {
  if (!thread) return false;
  const currentUser = thread.participants.find(p => p.type === 'user');
  return currentUser?.id === message.senderId;
}

function groupMessagesByDate(messages: ChatMessageDTO[]): Array<{
  dateLabel: string;
  messages: ChatMessageDTO[];
}> {
  const groups: Map<string, ChatMessageDTO[]> = new Map();

  messages.forEach(message => {
    const date = new Date(message.createdAt);
    const label = getDateLabel(date);
    
    if (!groups.has(label)) {
      groups.set(label, []);
    }
    groups.get(label)!.push(message);
  });

  return Array.from(groups.entries()).map(([dateLabel, messages]) => ({
    dateLabel,
    messages,
  }));
}

function getDateLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const diffTime = today.getTime() - messageDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) {
    return date.toLocaleDateString('es-MX', { weekday: 'long' });
  }

  return date.toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'long',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
