import { useEffect, useMemo, useState } from "react";
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";
import type { ListerThreadGroupDTO } from "../../application/dto/InboxDTO";
import { formatRelativeTime } from "../../utils/formatRelativeTime";
import styles from "./ChatsPage.module.css";
import { ChatThreadPanel } from "./ChatThreadPanel";
import { ChevronDown, MessageCircle, Eye, Users } from "lucide-react";

type BaseLayoutProps = {
  selectedThread: ChatThreadDTO | null;
  onSelectThread: (thread: ChatThreadDTO) => void;
  messages: ChatMessageDTO[];
  messagesLoading: boolean;
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

type BuyerChatLayoutProps = BaseLayoutProps & {
  threads: ChatThreadDTO[];
  isLoading: boolean;
  totalUnread: number;
  search: string;
  onSearchChange: (value: string) => void;
};

type SellerChatLayoutProps = BaseLayoutProps & {
  groups: ListerThreadGroupDTO[];
  isLoading: boolean;
  totalUnread: number;
  search: string;
  onSearchChange: (value: string) => void;
};

export function BuyerChatLayout({
  threads,
  isLoading,
  totalUnread,
  search,
  onSearchChange,
  selectedThread,
  onSelectThread,
  messages,
  messagesLoading,
  messagesError,
  hasMore,
  onLoadMore,
  isTyping,
  composer,
  onComposerChange,
  onSendMessage,
  sending,
  sendError,
}: BuyerChatLayoutProps) {
  const filteredThreads = useMemo(() => filterThreads(threads, search), [threads, search]);

  return (
    <>
      <header className={styles.contextRow}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0, color: "#0f172a" }}>Mis conversaciones</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b" }}>
            Sigue tus chats por propiedad y mantente al tanto de las respuestas.
          </p>
        </div>
      </header>

      <div className={styles.panels}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <p style={{ margin: "0 0 8px", fontSize: 14, color: "#475569" }}>
              {isLoading
                ? "Cargando conversaciones..."
                : totalUnread > 0
                  ? `${totalUnread} mensajes sin leer`
                  : "Al día con tus conversaciones"}
            </p>
            <input
              className={styles.searchInput}
              placeholder="Buscar por contacto o propiedad..."
              value={search}
              onChange={event => onSearchChange(event.target.value)}
            />
          </div>

          <div style={{ overflowY: "auto" }}>
            {filteredThreads.length === 0 && (
              <p style={{ padding: 24, color: "#94a3b8", fontSize: 14 }}>
                {isLoading ? "Cargando..." : "No hay conversaciones disponibles"}
              </p>
            )}
            {filteredThreads.map(thread => {
              const propertyTitle = thread.property?.title ?? "Propiedad sin título";
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
                  onClick={() => onSelectThread(thread)}
                >
                  <div className={styles.threadTitle}>{contactName}</div>
                  <div className={styles.threadSubtitle}>
                    {propertyTitle} · {subtitle}
                  </div>
                  <div className={styles.threadMeta}>
                    <span>{formatRelativeTime(thread.lastMessageAt ?? thread.createdAt)}</span>
                    {thread.unreadCount > 0 && <span className={styles.badge}>{thread.unreadCount}</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <ChatThreadPanel
          thread={selectedThread}
          messages={messages}
          isLoading={messagesLoading}
          messagesError={messagesError}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          isTyping={isTyping}
          composer={composer}
          onComposerChange={onComposerChange}
          onSendMessage={onSendMessage}
          sending={sending}
          sendError={sendError}
        />
      </div>
    </>
  );
}

export function SellerChatLayout({
  groups,
  isLoading,
  totalUnread,
  search,
  onSearchChange,
  selectedThread,
  onSelectThread,
  messages,
  messagesLoading,
  messagesError,
  hasMore,
  onLoadMore,
  isTyping,
  composer,
  onComposerChange,
  onSendMessage,
  sending,
  sendError,
}: SellerChatLayoutProps) {
  const filteredGroups = useMemo(() => filterGroups(groups, search), [groups, search]);
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null);

  useEffect(() => {
    if (!filteredGroups.length) {
      setExpandedPropertyId(null);
      return;
    }
    if (!expandedPropertyId) {
      setExpandedPropertyId(resolvePropertyId(filteredGroups[0]));
      return;
    }
    const exists = filteredGroups.some(group => resolvePropertyId(group) === expandedPropertyId);
    if (!exists) {
      setExpandedPropertyId(resolvePropertyId(filteredGroups[0]));
    }
  }, [filteredGroups, expandedPropertyId]);

  return (
    <div className={styles.panels}>
        <section className={styles.propertyColumn}>
          <div className={styles.propertyColumnHeader}>
            <div>
              <p className={styles.propertyColumnLabel}>
                {isLoading
                  ? "Sincronizando conversaciones..."
                  : totalUnread > 0
                    ? `${totalUnread} mensajes pendientes`
                    : "Todo al día"}
              </p>
            </div>
            <input
              className={styles.searchInput}
              placeholder="Buscar por propiedad o contacto..."
              value={search}
              onChange={event => onSearchChange(event.target.value)}
            />
          </div>

          <div className={styles.propertyList}>
            {filteredGroups.length === 0 && (
              <p style={{ padding: 24, color: "#94a3b8", fontSize: 14 }}>
                {isLoading ? "Cargando..." : "No hay propiedades con chats activos"}
              </p>
            )}
            {filteredGroups.map(group => {
              const propertyId = resolvePropertyId(group);
              const expanded = expandedPropertyId === propertyId;
              return (
                <SellerPropertyCard
                  key={propertyId ?? group.threads[0]?.id ?? uniqueKey()}
                  group={group}
                  expanded={expanded}
                  onToggle={() => setExpandedPropertyId(expanded ? null : propertyId)}
                  onSelectThread={onSelectThread}
                  selectedThreadId={selectedThread?.id ?? null}
                />
              );
            })}
          </div>
        </section>

        <ChatThreadPanel
          thread={selectedThread}
          messages={messages}
          isLoading={messagesLoading}
          messagesError={messagesError}
          hasMore={hasMore}
          onLoadMore={onLoadMore}
          isTyping={isTyping}
          composer={composer}
          onComposerChange={onComposerChange}
          onSendMessage={onSendMessage}
          sending={sending}
          sendError={sendError}
        />
    </div>
  );
}

type SellerPropertyCardProps = {
  group: ListerThreadGroupDTO;
  expanded: boolean;
  onToggle: () => void;
  onSelectThread: (thread: ChatThreadDTO) => void;
  selectedThreadId: string | null;
};


function SellerPropertyCard({ group, expanded, onToggle, onSelectThread, selectedThreadId }: SellerPropertyCardProps) {
  const property = group.property;
  const cover = property?.coverImageUrl ?? placeholderImage(property?.id);

  return (
    <div className={styles.propertyBlock}>
      <button
        type="button"
        className={`${styles.propertyCard} ${expanded ? styles.propertyCardExpanded : ''}`}
        onClick={onToggle}
      >
        <div className={styles.propertyPreview}>
          <img className={styles.propertyImage} src={cover} alt={property?.title ?? 'Vista previa'} />
          <div className={styles.propertyInfo}>
            <div className={styles.propertyTitleRow}>
              <h3>{property?.title ?? 'Propiedad sin título'}</h3>
              {group.unreadCount > 0 && <span className={styles.badge}>{group.unreadCount}</span>}
            </div>
            <div className={styles.propertyStats}>
              <span>
                <MessageCircle size={14} />
                {group.threadCount}
              </span>
              <span>
                <Users size={14} />
                {group.threads.length}
              </span>
              <span>
                <Eye size={14} />
                {group.unreadCount}
              </span>
            </div>
          </div>
          <ChevronDown size={16} className={`${styles.propertyArrow} ${expanded ? styles.propertyArrowOpen : ''}`} />
        </div>
      </button>

      {expanded && (
        <div className={styles.propertyThreads}>
          {group.threads.map(thread => {
            const contactName =
              thread.participants.find(participant => participant.type === 'contact')?.displayName ??
              'Contacto sin nombre';
            const isActive = selectedThreadId === thread.id;
            return (
              <button
                key={thread.id}
                type="button"
                className={`${styles.threadRow} ${isActive ? styles.threadRowActive : ''}`}
                onClick={() => onSelectThread(thread)}
              >
                <div>
                  <p className={styles.threadRowTitle}>{contactName}</p>
                  <p className={styles.threadRowSubtitle}>{thread.lastMessage?.body ?? 'Sin mensajes'}</p>
                </div>
                <div className={styles.threadRowMeta}>
                  <span>{formatRelativeTime(thread.lastMessageAt ?? thread.createdAt)}</span>
                  {thread.unreadCount > 0 && <span className={styles.badge}>{thread.unreadCount}</span>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function filterThreads(threads: ChatThreadDTO[], term: string) {
  if (!term.trim()) return threads;
  const normalized = term.trim().toLowerCase();
  return threads.filter(thread => {
    const property = thread.property?.title?.toLowerCase() ?? "";
    const contact =
      thread.participants.find(participant => participant.type === "contact")?.displayName?.toLowerCase() ?? "";
    return property.includes(normalized) || contact.includes(normalized) || (thread.lastMessage?.body ?? "").toLowerCase().includes(normalized);
  });
}

function filterGroups(groups: ListerThreadGroupDTO[], term: string) {
  if (!term.trim()) return groups;
  const normalized = term.trim().toLowerCase();
  return groups.filter(group => {
    const property = group.property?.title?.toLowerCase() ?? "";
    const hasMatchInThreads = group.threads.some(thread =>
      filterThreads([thread], normalized).length > 0,
    );
    return property.includes(normalized) || hasMatchInThreads;
  });
}

function resolvePropertyId(group: ListerThreadGroupDTO): string | null {
  return group.property?.id ?? group.threads[0]?.id ?? null;
}

function placeholderImage(seed?: string | null) {
  const hash = encodeURIComponent(seed ?? "novalia");
  return `https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=400&q=60&sat=-15&blend-mode=multiply&blend=%23f8fafc&sig=${hash}`;
}

function uniqueKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}
