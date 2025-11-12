import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";
import styles from "./ChatsPage.module.css";
import { formatRelativeTime } from "../../utils/formatRelativeTime";

type ChatThreadPanelProps = {
  thread: ChatThreadDTO | null;
  messages: ChatMessageDTO[];
  isLoading: boolean;
  composer: string;
  onComposerChange: (value: string) => void;
  onSendMessage: () => void;
  sending: boolean;
};

export function ChatThreadPanel({
  thread,
  messages,
  isLoading,
  composer,
  onComposerChange,
  onSendMessage,
  sending,
}: ChatThreadPanelProps) {
  if (!thread) {
    return (
      <section className={styles.messagesPanel}>
        <div className={styles.emptyState}>
          Selecciona una conversación para ver los mensajes.
        </div>
      </section>
    );
  }

  const propertyTitle = thread.property?.title ?? "Propiedad sin título";
  const propertyPrice =
    thread.property?.price != null
      ? new Intl.NumberFormat("es-MX", {
          style: "currency",
          currency: thread.property?.currency ?? "MXN",
        }).format(thread.property.price)
      : "Precio no disponible";
  const propertyLocation = thread.property?.city ?? "Sin ciudad";

  return (
    <section className={styles.messagesPanel}>
      <div className={styles.messagesHeader}>
        <div className={styles.propertyTitle}>{propertyTitle}</div>
        <div className={styles.propertyMeta}>
          {propertyPrice} · {propertyLocation}
        </div>
      </div>

      <div className={styles.messagesBody}>
        {isLoading && <p style={{ color: "#94a3b8" }}>Cargando historial...</p>}
        {!isLoading && messages.length === 0 && (
          <div className={styles.emptyState}>Inicia la conversación enviando el primer mensaje.</div>
        )}
        {messages.map(message => {
          const isSelf = message.senderType === "user";
          return (
            <article
              key={message.id}
              className={`${styles.message} ${isSelf ? styles.messageFromSelf : styles.messageFromContact}`}
            >
              {message.body}
              <div className={styles.messageMeta}>
                <span>{formatRelativeTime(message.createdAt)}</span>
                <span>
                  {message.status === "read"
                    ? "Leído"
                    : message.status === "delivered"
                      ? "Entregado"
                      : "Enviado"}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <form
        className={styles.composer}
        onSubmit={event => {
          event.preventDefault();
          if (sending || !composer.trim()) return;
          onSendMessage();
        }}
      >
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
