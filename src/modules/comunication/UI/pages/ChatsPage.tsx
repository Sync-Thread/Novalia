import { useEffect, useMemo, useState } from "react";
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";
import type {
  ListerInboxDTO,
  ListerThreadGroupDTO,
  ClientInboxDTO,
} from "../../application/dto/InboxDTO";
import styles from "../components/ChatsPage.module.css";
import { ChatProvider } from "../contexts/ChatProvider";
import { useInbox } from "../hooks/useInbox";
import { useMessages } from "../hooks/useMessages";
import { useSendMessage } from "../hooks/useSendMessage";
import { MessageList } from "../components/MessageList";
import { PropertyHeaderCard } from "../components/PropertyHeaderCard";
import { supabase } from "../../../../core/supabase/client";
import { BuyerChatLayout, SellerChatLayout } from "../components/ChatLayouts";

export default function ChatsPage() {
  return (
    <ChatProvider>
      <ChatExperience />
    </ChatProvider>
  );
}

type ViewMode = "seller" | "buyer";

function ChatExperience() {
  const [view, setView] = useState<ViewMode>("seller");
  const [viewResolving, setViewResolving] = useState(true);
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(
    null
  );
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const applyMockConversation = useCallback((mode: ViewMode) => {
    const mock = buildMockConversation();
    setSelectedThread(mock.thread);
    setMessages(mock.messages);
    setMessagesLoading(false);
    setLoadingInbox(false);
    if (mode === "lister") {
      setListerInbox(mock.listerInbox);
    } else {
      setClientInbox(mock.clientInbox);
    }
  }, []);

  const loadMessages = useCallback(
    async (thread: ChatThreadDTO) => {
      setMessagesLoading(true);
      const result = await useCases.listMessages.execute({
        threadId: thread.id,
        page: 1,
        pageSize: 50,
      });
      if (result.isErr()) {
        setMessages([]);
      } else {
        setMessages(result.value.items);
      }
      setMessagesLoading(false);
      void useCases.markThreadAsRead.execute(thread.id);
    },
    [useCases.listMessages, useCases.markThreadAsRead]
  );

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    if (view === "lister") {
      const result = await useCases.listListerInbox.execute();
      if (result.isErr()) {
        applyMockConversation("lister");
        return;
      } else {
        setListerInbox(result.value);
        const candidate = result.value.groups[0]?.threads[0] ?? null;
        if (candidate) {
          setSelectedThread(candidate);
          void loadMessages(candidate);
        } else {
          applyMockConversation("lister");
          return;
        }
      }
    } else {
      const result = await useCases.listClientInbox.execute();
      if (result.isErr()) {
        applyMockConversation("client");
        return;
      } else {
        setClientInbox(result.value);
        if (result.value.thread) {
          setSelectedThread(result.value.thread);
          void loadMessages(result.value.thread);
        } else {
          applyMockConversation("client");
          return;
        }
      }
    }
    setLoadingInbox(false);
  }, [
    useCases.listListerInbox,
    useCases.listClientInbox,
    view,
    loadMessages,
    applyMockConversation,
  ]);

  useEffect(() => {
    let active = true;
    const resolveView = async () => {
      try {
        const nextView = await resolveViewFromSession();
        if (!active) return;
        setView(nextView);
      } finally {
        if (active) {
          setViewResolving(false);
        }
      }
    };
    void resolveView();
    return () => {
      active = false;
    };
  }, []);

  // Auto-seleccionar primer thread cuando carga inbox
  useEffect(() => {
    if (viewResolving) return;
    void loadInbox();
  }, [viewResolving, loadInbox]);

  const handleRealtimeMessage = useCallback(
    (message: ChatMessageDTO) => {
      if (!selectedThread || message.threadId !== selectedThread.id) {
        void loadInbox();
        return;
      }
      setMessages((prev) => {
        if (prev.some((item) => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    },
    [selectedThread, loadInbox]
  );

  useChatRealtime(selectedThread?.id ?? null, {
    onMessage: handleRealtimeMessage,
  });

  const groups = useMemo(() => {
    const term = search.trim().toLowerCase();
    const source =
      view === "lister"
        ? (listerInbox?.groups ?? [])
        : clientInbox
          ? clientToGroup(clientInbox)
          : [];
    if (!term) return source;
    return source
      .map((group) => ({
        ...group,
        threads: group.threads.filter((thread) => matchesSearch(thread, term)),
      }))
      .filter((group) => group.threads.length > 0);
  }, [listerInbox, clientInbox, view, search]);

  const totalUnread =
    view === "lister"
      ? (listerInbox?.totalUnread ?? 0)
      : (clientInbox?.unreadCount ?? selectedThread?.unreadCount ?? 0);

  const handleSelectThread = useCallback(
    (thread: ChatThreadDTO) => {
      setSelectedThread(thread);
      void loadMessages(thread);
    },
    [loadMessages]
  );

  const handleSendMessage = useCallback(
    async (event?: React.FormEvent) => {
      event?.preventDefault();
      if (!selectedThread || !composer.trim()) return;
      setSending(true);
      const result = await useCases.sendMessage.execute({
        threadId: selectedThread.id,
        body: composer.trim(),
      });
      if (result.isErr()) {
        setSending(false);
        return;
      }
      setComposer("");
      setMessages((prev) => [...prev, result.value]);
      setSending(false);
      void useCases.markThreadAsRead.execute(selectedThread.id);
    },
    [composer, selectedThread, useCases.sendMessage, useCases.markThreadAsRead]
  );

  const isLoadingInbox = viewResolving || loadingInbox;

  return (
    <section className={styles.page}>
      <header className={styles.contextRow}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#0f172a" }}>Chats</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Administra conversaciones asociadas a tus propiedades en un solo
            lugar.
          </p>
        </div>
      </header>

      <div className={styles.panels}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#475569" }}>
              {isLoadingInbox
                ? "Cargando conversaciones..."
                : totalUnread > 0
                  ? `${totalUnread} mensajes sin leer`
                  : "Al día con tus conversaciones"}
            </p>
            <input
              className={styles.searchInput}
              placeholder="Buscar por contacto, propiedad..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div style={{ overflowY: "auto" }}>
            {groups.length === 0 && (
              <p style={{ padding: 24, color: "#94a3b8", fontSize: 14 }}>
                {isLoadingInbox
                  ? "Cargando..."
                  : "No hay conversaciones disponibles"}
              </p>
            )}
            {groups.map((group) => (
              <div key={group.property?.id ?? "none"} className={styles.group}>
                <div className={styles.groupTitle}>
                  {group.property?.title ?? "Sin propiedad asignada"}
                </div>
                <div className={styles.threadList}>
                  {group.threads.map((thread) => {
                    const contactName =
                      thread.participants.find(
                        (participant) => participant.type === "contact"
                      )?.displayName ?? "Contacto sin nombre";
                    const subtitle = thread.lastMessage?.body ?? "Sin mensajes";
                    const isActive = selectedThread?.id === thread.id;
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        className={`${styles.threadButton} ${isActive ? styles.threadActive : ""}`}
                        onClick={() => handleSelectThread(thread)}
                      >
                        <div className={styles.threadTitle}>{contactName}</div>
                        <div className={styles.threadSubtitle}>{subtitle}</div>
                        <div className={styles.threadMeta}>
                          <span>
                            {formatRelativeTime(
                              thread.lastMessageAt ?? thread.createdAt
                            )}
                          </span>
                          {thread.unreadCount > 0 && (
                            <span className={styles.badge}>
                              {thread.unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section className={styles.messagesPanel}>
          {selectedThread ? (
            <>
              <div className={styles.messagesHeader}>
                <div className={styles.propertyTitle}>
                  {selectedThread.property?.title ?? "Chat sin propiedad"}
                </div>
                <div className={styles.propertyMeta}>
                  {selectedThread.property?.price
                    ? new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: selectedThread.property.currency ?? "MXN",
                      }).format(selectedThread.property.price)
                    : "Precio no disponible"}{" "}
                  · {selectedThread.property?.city ?? "Sin ciudad"}
                </div>
              </div>

              <div className={styles.messagesBody}>
                {messagesLoading && (
                  <p style={{ color: "#94a3b8" }}>Cargando historial...</p>
                )}
                {!messagesLoading && messages.length === 0 && (
                  <div className={styles.emptyState}>
                    Inicia la conversación enviando el primer mensaje.
                  </div>
                )}
                {messages.map((message) => {
                  const isSelf = isOwnMessage(message, selectedThread);
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

              <form className={styles.composer} onSubmit={handleSendMessage}>
                <input
                  className={styles.composerInput}
                  placeholder="Escribe un mensaje..."
                  value={composer}
                  onChange={(event) => setComposer(event.target.value)}
                  disabled={sending}
                />
                <button
                  className={styles.composerButton}
                  type="submit"
                  disabled={sending || !composer.trim()}
                >
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </form>
            </>
          ) : (
            <div className={styles.emptyState}>
              Selecciona una conversación para comenzar.
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function matchesSearch(thread: ChatThreadDTO, term: string): boolean {
  const contact =
    thread.participants.find((participant) => participant.type === "contact")
      ?.displayName ?? "";
  const property = thread.property?.title ?? "";
  return (
    contact.toLowerCase().includes(term) ||
    property.toLowerCase().includes(term)
  );
}

function clientToGroup(inbox: ClientInboxDTO): ListerThreadGroupDTO[] {
  if (!inbox.thread) return [];
  return [
    {
      property: inbox.property ?? inbox.thread.property,
      threadCount: 1,
      unreadCount: inbox.unreadCount,
      threads: [inbox.thread],
    },
  ];
}

function formatRelativeTime(value: string): string {
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
}

function isOwnMessage(message: ChatMessageDTO, thread: ChatThreadDTO): boolean {
  const agentId =
    thread.participants.find((participant) => participant.type === "user")
      ?.id ?? null;
  return agentId !== null && message.senderId === agentId;
}

const SELLER_ROLES = new Set([
  "agent",
  "agent_org",
  "org_admin",
  "owner",
  "seller",
  "agency",
  "broker",
  "lister",
]);

function buildMockConversation() {
  const now = new Date();
  const minusMinutes = (minutes: number) =>
    new Date(now.getTime() - minutes * 60 * 1000).toISOString();

  const mockProperty = {
    id: "prop-mock-1",
    title: "Casa moderna en Polanco",
    price: 2850000,
    currency: "MXN",
    city: "CDMX",
    state: "Ciudad de México",
    coverImageUrl: null,
    operationType: "sale",
    status: "published",
  };

  const thread: ChatThreadDTO = {
    id: "thread-mock-1",
    orgId: "org-mock-1",
    property: mockProperty,
    contactId: "contact-mock-1",
    createdBy: "user-mock-agent",
    createdAt: minusMinutes(45),
    lastMessageAt: minusMinutes(2),
    unreadCount: 0,
    status: "open",
    participants: [
      {
        id: "user-mock-agent",
        type: "user",
        displayName: "Ana Vázquez",
        avatarUrl: null,
        email: "ana@novalia.mx",
        phone: "+52 55 0000 0000",
        lastSeenAt: minusMinutes(1),
      },
      {
        id: "contact-mock-1",
        type: "contact",
        displayName: "María López",
        avatarUrl: null,
        email: "maria@example.com",
        phone: "+52 55 1111 2222",
        lastSeenAt: minusMinutes(3),
      },
    ],
    lastMessage: null,
  };

  const messages: ChatMessageDTO[] = [
    {
      id: "msg-mock-1",
      threadId: thread.id,
      senderType: "contact",
      senderId: "contact-mock-1",
      body: "Hola, ¿la propiedad aún está disponible?",
      payload: null,
      createdAt: minusMinutes(30),
      deliveredAt: minusMinutes(30),
      readAt: minusMinutes(29),
      status: "read",
    },
    {
      id: "msg-mock-2",
      threadId: thread.id,
      senderType: "user",
      senderId: "user-mock-agent",
      body: "Hola María, sí, sigue disponible. ¿Te gustaría agendar una visita?",
      payload: null,
      createdAt: minusMinutes(28),
      deliveredAt: minusMinutes(28),
      readAt: minusMinutes(27),
      status: "read",
    },
    {
      id: "msg-mock-3",
      threadId: thread.id,
      senderType: "contact",
      senderId: "contact-mock-1",
      body: "Sí, ¿tienen disponibilidad este sábado por la mañana?",
      payload: null,
      createdAt: minusMinutes(25),
      deliveredAt: minusMinutes(25),
      readAt: minusMinutes(24),
      status: "read",
    },
    {
      id: "msg-mock-4",
      threadId: thread.id,
      senderType: "user",
      senderId: "user-mock-agent",
      body: "Podemos a las 10:30 am. Te envío la ubicación para que confirmes.",
      payload: null,
      createdAt: minusMinutes(20),
      deliveredAt: minusMinutes(20),
      readAt: minusMinutes(19),
      status: "read",
    },
    {
      id: "msg-mock-5",
      threadId: thread.id,
      senderType: "contact",
      senderId: "contact-mock-1",
      body: "Perfecto, confirmado. ¡Gracias!",
      payload: null,
      createdAt: minusMinutes(2),
      deliveredAt: minusMinutes(2),
      readAt: minusMinutes(1),
      status: "read",
    },
  ];

  const latestMessage = messages[messages.length - 1];
  thread.lastMessage = latestMessage;
  thread.lastMessageAt = latestMessage.createdAt;

  const listerInbox: ListerInboxDTO = {
    groups: [
      {
        property: mockProperty,
        threadCount: 1,
        unreadCount: 0,
        threads: [thread],
      },
    ],
    totalUnread: 0,
    totalThreads: 1,
  };

  const clientInbox: ClientInboxDTO = {
    property: mockProperty,
    thread,
    unreadCount: 0,
  };

  return { thread, messages, listerInbox, clientInbox };
}

async function resolveViewFromSession(): Promise<ViewMode> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (!user) {
      return "lister";
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_hint")
      .eq("id", user.id)
      .maybeSingle();

    const roleHint =
      (profile?.role_hint as string | null | undefined) ??
      (user.user_metadata?.role as string | null | undefined) ??
      (user.app_metadata?.role as string | null | undefined) ??
      null;

    return SELLER_ROLES.has(normalizeRole(roleHint)) ? "lister" : "client";
  } catch {
    return "lister";
  }
}

function normalizeRole(roleHint: string | null | undefined): string {
  return (roleHint ?? "").toString().trim().toLowerCase();
}
