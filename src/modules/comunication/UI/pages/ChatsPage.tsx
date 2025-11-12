import { useEffect, useMemo, useState } from "react";
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ListerThreadGroupDTO } from "../../application/dto/InboxDTO";
import styles from "../components/ChatsPage.module.css";
import { ChatProvider } from "../contexts/ChatProvider";
import { useInbox } from "../hooks/useInbox";
import { useMessages } from "../hooks/useMessages";
import { useSendMessage } from "../hooks/useSendMessage";
import { MessageList } from "../components/MessageList";
import { supabase } from "../../../../core/supabase/client";

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
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "responded">("all");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // ✅ Hook para inbox (reemplaza ~80 líneas de código)
  const { 
    threads, 
    groups, 
    loading: loadingInbox, 
    error: inboxError,
    totalUnread,
    refresh: refreshInbox 
  } = useInbox({ 
    role: view,
    search 
  });

  // ✅ Hook para mensajes (reemplaza ~60 líneas de código)
  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    isTyping
  } = useMessages({ 
    threadId: selectedThread?.id || null,
    pageSize: 50,
    autoScroll: true
  });

  // ✅ Hook para enviar mensajes (reemplaza ~40 líneas de código)
  const { 
    sendMessage, 
    sending,
    error: sendError
  } = useSendMessage({ 
    threadId: selectedThread?.id || null,
    onSuccess: () => {
      refreshInbox(); // Actualizar contador de no leídos
    },
    onError: (error) => {
      console.error('Error al enviar mensaje:', error);
    }
  });

  // Resolver rol del usuario (seller vs buyer)
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
    if (!viewResolving && threads.length > 0 && !selectedThread) {
      setSelectedThread(threads[0]);
    }
  }, [viewResolving, threads, selectedThread]);

  // Filtrar grupos por búsqueda (ya manejado por useInbox, pero mantenemos lógica de agrupación)
  const displayGroups = useMemo(() => {
    return groups || [];
  }, [groups]);

  // Manejar selección de thread
  const handleSelectThread = (thread: ChatThreadDTO) => {
    setSelectedThread(thread);
  };

  // Toggle collapse de grupo
  const toggleGroup = (propertyId: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(propertyId)) {
        next.delete(propertyId);
      } else {
        next.add(propertyId);
      }
      return next;
    });
  };

  // Manejar envío de mensaje
  const handleSendMessage = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const input = event?.currentTarget?.querySelector('input') as HTMLInputElement;
    const text = input?.value?.trim();
    
    if (!text) return;
    
    const success = await sendMessage(text);
    if (success && input) {
      input.value = '';
    }
  };

  const isLoadingInbox = viewResolving || loadingInbox;

  return (
    <section className={styles.page}>
      <header className={styles.contextRow}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#0f172a" }}>Chats</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Administra conversaciones asociadas a tus propiedades en un solo lugar.
          </p>
        </div>
      </header>

      <div className={styles.panels}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            {/* Filtros en pestañas */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button
                onClick={() => setFilter("all")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: 6,
                  background: filter === "all" ? "#3b82f6" : "#f1f5f9",
                  color: filter === "all" ? "#fff" : "#64748b",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Todos ({threads.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: 6,
                  background: filter === "unread" ? "#3b82f6" : "#f1f5f9",
                  color: filter === "unread" ? "#fff" : "#64748b",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                No leídos ({totalUnread})
              </button>
              <button
                onClick={() => setFilter("responded")}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  border: "none",
                  borderRadius: 6,
                  background: filter === "responded" ? "#3b82f6" : "#f1f5f9",
                  color: filter === "responded" ? "#fff" : "#64748b",
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Respondidos
              </button>
            </div>
            
            {/* Buscador */}
            <input
              className={styles.searchInput}
              placeholder="Buscar por contacto, propiedad..."
              value={search}
              onChange={event => setSearch(event.target.value)}
            />
          </div>
          
          <div style={{ overflowY: "auto", flex: 1 }}>
            {inboxError && (
              <p style={{ padding: 24, color: "#ef4444", fontSize: 14 }}>
                Error: {inboxError}
              </p>
            )}
            {!inboxError && displayGroups.length === 0 && (
              <p style={{ padding: 24, color: "#94a3b8", fontSize: 14 }}>
                {isLoadingInbox ? "Cargando..." : "No hay conversaciones disponibles"}
              </p>
            )}
            {displayGroups.map((group: ListerThreadGroupDTO) => {
              const propertyId = group.property?.id ?? "none";
              const isCollapsed = collapsedGroups.has(propertyId);
              const groupUnread = group.threads.reduce((sum, t) => sum + t.unreadCount, 0);
              
              return (
                <div key={propertyId} className={styles.group}>
                  {/* Header de grupo con toggle */}
                  <button
                    onClick={() => toggleGroup(propertyId)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 16px",
                      background: "#f8fafc",
                      border: "none",
                      borderBottom: "1px solid #e2e8f0",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>
                        {group.property?.title ?? "Sin propiedad asignada"}
                      </div>
                      {group.property && (
                        <div style={{ fontSize: 12, color: "#64748b" }}>
                          {group.property.price
                            ? new Intl.NumberFormat("es-MX", {
                                style: "currency",
                                currency: group.property.currency ?? "MXN",
                              }).format(group.property.price)
                            : "Precio no disponible"}{" "}
                          · {group.threads.length} {group.threads.length === 1 ? "contacto" : "contactos"}
                        </div>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {groupUnread > 0 && (
                        <span style={{
                          background: "#3b82f6",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 12,
                        }}>
                          {groupUnread}
                        </span>
                      )}
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        style={{
                          transform: isCollapsed ? "rotate(0deg)" : "rotate(180deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        <path
                          d="M4 6L8 10L12 6"
                          stroke="#64748b"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </div>
                  </button>
                  
                  {/* Lista de threads (colapsable) */}
                  {!isCollapsed && (
                    <div className={styles.threadList}>
                      {group.threads.map((thread: ChatThreadDTO) => {
                        const contactName =
                          thread.participants.find(participant => participant.type === "contact")?.displayName ??
                          "Contacto sin nombre";
                        const subtitle = thread.lastMessage?.body ?? "Sin mensajes";
                        const isActive = selectedThread?.id === thread.id;
                        return (
                          <button
                            key={thread.id}
                            type="button"
                            className={`${styles.threadButton} ${isActive ? styles.threadActive : ""}`}
                            onClick={() => handleSelectThread(thread)}
                          >
                            <div style={{ flex: 1 }}>
                              <div className={styles.threadTitle}>{contactName}</div>
                              <div className={styles.threadSubtitle}>{subtitle}</div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                              <span style={{ fontSize: 11, color: "#94a3b8" }}>
                                {formatRelativeTime(thread.lastMessageAt ?? thread.createdAt)}
                              </span>
                              {thread.unreadCount > 0 && (
                                <span className={styles.badge}>{thread.unreadCount}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <section className={styles.messagesPanel}>
          {selectedThread ? (
            <>
              <div className={styles.messagesHeader}>
                <div className={styles.propertyTitle}>{selectedThread.property?.title ?? "Chat sin propiedad"}</div>
                <div className={styles.propertyMeta}>
                  {selectedThread.property?.price
                    ? new Intl.NumberFormat("es-MX", {
                        style: "currency",
                        currency: selectedThread.property.currency ?? "MXN",
                      }).format(selectedThread.property?.price)
                    : "Precio no disponible"}{" "}
                  · {selectedThread.property?.city ?? "Sin ciudad"}
                </div>
              </div>

              <div className={styles.messagesBody} data-messages-container>
                <MessageList
                  messages={messages}
                  currentThread={selectedThread}
                  loading={messagesLoading}
                  error={messagesError}
                  isTyping={isTyping}
                />
              </div>

              <form className={styles.composer} onSubmit={handleSendMessage}>
                <input
                  className={styles.composerInput}
                  placeholder="Escribe un mensaje..."
                  disabled={sending}
                />
                <button className={styles.composerButton} type="submit" disabled={sending}>
                  {sending ? "Enviando..." : "Enviar"}
                </button>
              </form>
              {sendError && (
                <div style={{ padding: '8px 24px', color: '#ef4444', fontSize: 13 }}>
                  Error: {sendError}
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyState}>Selecciona una conversación para comenzar.</div>
          )}
        </section>
      </div>
    </section>
  );
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

const SELLER_ROLES = new Set(["agent", "agent_org", "org_admin", "owner", "seller", "agency", "broker", "lister"]);

async function resolveViewFromSession(): Promise<ViewMode> {
  try {
    const { data } = await supabase.auth.getSession();
    const user = data.session?.user ?? null;
    if (!user) {
      return "seller";
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

    return SELLER_ROLES.has(normalizeRole(roleHint)) ? "seller" : "buyer";
  } catch {
    return "seller";
  }
}

function normalizeRole(roleHint: string | null | undefined): string {
  return (roleHint ?? "").toString().trim().toLowerCase();
}
