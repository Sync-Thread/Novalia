import { useState, useEffect, useRef, useCallback } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { useChatModule } from "../../contexts/ChatProvider";
import { useChatRealtime } from "../../hooks/useChatRealtime";
import type { ChatThreadDTO } from "../../../application/dto/ChatThreadDTO";
import type { ChatMessageDTO } from "../../../application/dto/ChatMessageDTO";
import styles from "./ChatWidget.module.css";
import { supabase } from "../../../../../core/supabase/client";

export interface ChatWidgetProps {
  propertyId: string;
  propertyTitle: string;
  orgId: string | null;
  listerUserId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatWidget({
  propertyId,
  propertyTitle,
  orgId,
  listerUserId,
  isOpen,
  onClose,
}: ChatWidgetProps) {
  const { useCases } = useChatModule();
  const [thread, setThread] = useState<ChatThreadDTO | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession();
      setCurrentUserId(data.session?.user?.id ?? null);
    };
    void fetchSession();
  }, []);

  // ✅ Handler para mensajes en tiempo real
  const handleNewMessage = useCallback((newMessage: ChatMessageDTO) => {
    setMessages(prev => {
      // Evitar duplicados
      if (prev.some(m => m.id === newMessage.id)) {
        return prev;
      }
      return [...prev, newMessage];
    });
  }, []);

  // ✅ Integrar realtime
  useChatRealtime(thread?.id ?? null, {
    onMessage: handleNewMessage,
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load or create thread when opened
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closing
      setThread(null);
      setMessages([]);
      setMessageBody("");
      setError(null);
      return;
    }

    async function initThread() {
      
      setLoading(true);
      setError(null);

      try {
        // Find or create thread
        const threadResult = await useCases.findOrCreateThread.execute({
          propertyId,
          orgId,
          listerUserId,
        });


        if (threadResult.isErr()) {
          const errorMsg = typeof threadResult.error === 'object' && threadResult.error !== null && 'message' in threadResult.error
            ? (threadResult.error as { message: string }).message
            : 'Error al iniciar el chat';
          console.error("❌ Error creando thread:", threadResult.error);
          setError(errorMsg);
          setLoading(false);
          return;
        }

        const newThread = threadResult.value;
        setThread(newThread);
        try {
        } catch (e) {
        }

        // ✅ FIX: Siempre intentar cargar mensajes, no solo si lastMessage existe
        const messagesResult = await useCases.listMessages.execute({
          threadId: newThread.id,
          page: 1,
          pageSize: 50,
        });

        if (messagesResult.isOk()) {
          const messageCount = messagesResult.value.items.length;
          setMessages(messagesResult.value.items);
          
          if (messageCount === 0) {
          }
        } else {
          console.error("❌ Error cargando mensajes:", messagesResult.error);
        }

        setLoading(false);
      } catch (err) {
        console.error("💥 Error inesperado:", err);
        setError("Error inesperado al iniciar el chat");
        setLoading(false);
      }
    }

    void initThread();
  }, [isOpen, propertyId, orgId, listerUserId, useCases]);

  const handleSendMessage = async () => {
    if (!thread || !messageBody.trim() || sending) return;

    try {
    } catch (e) {
    }
    
    setSending(true);
    setError(null);

    try {
      const result = await useCases.sendMessage.execute({
        threadId: thread.id,
        body: messageBody.trim(),
      });


      if (result.isErr()) {
        const errorMsg = typeof result.error === 'object' && result.error !== null && 'message' in result.error
          ? (result.error as { message: string }).message
          : 'Error al enviar el mensaje';
        console.error("❌ Error enviando mensaje:", result.error);
        setError(errorMsg);
        setSending(false);
        return;
      }


      // ✅ NO agregamos el mensaje manualmente - realtime se encarga
      // El mensaje llegará vía handleNewMessage
      setMessageBody("");
      setSending(false);

      // Mark as read
      void useCases.markThreadAsRead.execute(thread.id);
    } catch (err) {
      console.error("💥 Error inesperado enviando mensaje:", err);
      setError("Error inesperado al enviar el mensaje");
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  if (!isOpen) return null;


  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h3 className={styles.title}>Contactar sobre</h3>
            <p className={styles.propertyTitle}>{propertyTitle}</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Cerrar chat"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {loading && (
            <div className={styles.loadingState}>
              <Loader2 size={24} className={styles.spinner} />
              <p>Iniciando chat...</p>
            </div>
          )}

          {error && (
            <div className={styles.errorState}>
              <p>{error}</p>
            </div>
          )}

          {!loading && thread && (
            <>
              {/* Messages */}
              <div className={styles.messages}>
                {messages.length === 0 && (
                  <div className={styles.emptyState}>
                    <p>Env\u00eda un mensaje para iniciar la conversaci\u00f3n</p>
                  </div>
                )}

                {messages.map(message => {
                  const isOwn = isOwnMessage(message, thread, currentUserId, listerUserId);
                  return (
                    <div
                      key={message.id}
                      className={`${styles.message} ${isOwn ? styles.messageOwn : styles.messageOther}`}
                    >
                      <div className={styles.messageBubble}>
                        <p className={styles.messageBody}>{message.body}</p>
                        <span className={styles.messageTime}>
                          {new Date(message.createdAt).toLocaleTimeString("es-MX", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={styles.inputContainer}>
                <textarea
                  value={messageBody}
                  onChange={e => setMessageBody(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  className={styles.input}
                  rows={2}
                  disabled={sending}
                />
                <button
                  type="button"
                  onClick={() => void handleSendMessage()}
                  disabled={!messageBody.trim() || sending}
                  className={styles.sendButton}
                  aria-label="Enviar mensaje"
                >
                  {sending ? <Loader2 size={20} className={styles.spinner} /> : <Send size={20} />}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function isOwnMessage(
  message: ChatMessageDTO,
  thread: ChatThreadDTO | null,
  currentUserId: string | null,
  listerUserId: string | null,
): boolean {
  // Buyer-side widget: treat system messages as not own
  if (!thread) return false;

  if (message.senderType === "contact") {
    const contactId =
      thread.contactId ??
      thread.participants.find(participant => participant.type === "contact")?.id ??
      null;
    if (contactId) {
      return message.senderId === contactId;
    }
    // If no contact exists (buyer es usuario), asumimos que los mensajes del contacto son del visitante
    return true;
  }

  if (message.senderType === "user") {
    if (currentUserId && message.senderId) {
      return message.senderId === currentUserId;
    }
    if (listerUserId && message.senderId) {
      return message.senderId !== listerUserId;
    }
    return false;
  }

  return false;
}
