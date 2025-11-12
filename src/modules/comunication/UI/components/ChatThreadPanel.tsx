import { useNavigate } from 'react-router-dom';
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";
import styles from "./ChatsPage.module.css";
import { PropertyHeaderCard } from "./PropertyHeaderCard";
import { MessageList } from "./MessageList";

type ChatThreadPanelProps = {
  thread: ChatThreadDTO | null;
  messages: ChatMessageDTO[];
  isLoading: boolean;
  messagesError: string | null;
  hasMore: boolean;
  onLoadMore: () => void;
  isTyping: boolean;
  composer: string;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  sending: boolean;
  sendError: string | null;
};

export function ChatThreadPanel({
  thread,
  messages,
  isLoading,
  messagesError,
  hasMore,
  onLoadMore,
  isTyping,
  composer,
  onComposerChange,
  onSendMessage,
  sending,
  sendError,
}: ChatThreadPanelProps) {
  const navigate = useNavigate();

  const handleViewProperty = () => {
    if (thread?.property?.id) {
      navigate(`/properties/${thread.property.id}`);
    }
  };

  if (!thread) {
    return (
      <section className={styles.messagesPanel}>
        <div className={styles.emptyState}>
          Selecciona una conversación para ver los mensajes.
        </div>
      </section>
    );
  }

  const contactParticipant = thread.participants.find(participant => participant.type === "contact");

  return (
    <section className={styles.messagesPanel}>
      <div className={styles.messagesHeader}>
        <PropertyHeaderCard
          property={thread.property ?? null}
          contactName={contactParticipant?.displayName ?? null}
          contactEmail={contactParticipant?.email ?? null}
          onViewProperty={handleViewProperty}
        />
      </div>

      <div className={styles.messagesBody}>
        <MessageList
          messages={messages}
          currentThread={thread}
          loading={isLoading}
          error={messagesError}
          hasMore={hasMore}
          isTyping={isTyping}
          onLoadMore={onLoadMore}
        />
      </div>

      <form
        className={styles.composer}
        onSubmit={event => {
          event.preventDefault();
          if (sending || !composer.trim()) return;
          onSendMessage();
        }}
      >
        {sendError && (
          <p className={styles.errorState} style={{ marginBottom: 8 }}>
            {sendError}
          </p>
        )}
        <input
          className={styles.composerInput}
          placeholder="Escribe un mensaje..."
          value={composer}
          onChange={event => onComposerChange(event.target.value)}
          disabled={sending}
        />
        <button className={styles.composerButton} type="submit" disabled={sending || !composer.trim()}>
          {sending ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </section>
  );
}
