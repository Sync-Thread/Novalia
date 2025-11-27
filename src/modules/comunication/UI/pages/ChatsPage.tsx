import { useCallback, useEffect, useState } from "react";
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import styles from "../components/ChatsPage.module.css";
import { ChatProvider } from "../contexts/ChatProvider";
import { useInbox } from "../hooks/useInbox";
import { useMessages } from "../hooks/useMessages";
import { useSendMessage } from "../hooks/useSendMessage";
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
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(null);
  const [composer, setComposer] = useState("");
  const [search, setSearch] = useState("");

  const { threads, groups, loading: inboxLoading, error: inboxError, totalUnread, refresh: refreshInbox } = useInbox({
    role: view,
  });

  const {
    messages,
    loading: messagesLoading,
    error: messagesError,
    hasMore,
    loadMore,
    refresh: refreshMessages,
    isTyping,
  } = useMessages({ threadId: selectedThread?.id ?? null });

  const { sendMessage, sending, error: sendError } = useSendMessage({
    threadId: selectedThread?.id ?? null,
  });

  useEffect(() => {
    let active = true;
    const resolveView = async () => {
      try {
        const nextView = await resolveViewFromSession();
        if (active) {
          setView(nextView);
        }
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

  useEffect(() => {
    if (threads.length === 0) {
      setSelectedThread(null);
      return;
    }
    setSelectedThread(previous => {
      if (previous && threads.some(thread => thread.id === previous.id)) {
        return previous;
      }
      return threads[0];
    });
  }, [threads]);

  useEffect(() => {
    setComposer("");
  }, [selectedThread?.id]);

  const handleSelectThread = useCallback((thread: ChatThreadDTO) => {
    setSelectedThread(thread);
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!selectedThread || !composer.trim()) return;
    const success = await sendMessage(composer);
    if (success) {
      setComposer("");
      await Promise.all([refreshInbox(), refreshMessages()]);
    }
  }, [composer, sendMessage, refreshInbox, refreshMessages, selectedThread]);

  const isInboxLoading = viewResolving || inboxLoading;
  const sellerGroups = groups ?? [];

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

      {inboxError && (
        <div className={styles.errorState} style={{ marginBottom: 16 }}>
          {inboxError}
        </div>
      )}

      {view === "seller" ? (
        <SellerChatLayout
          groups={sellerGroups}
          isLoading={isInboxLoading}
          totalUnread={totalUnread}
          search={search}
          onSearchChange={value => setSearch(value)}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
          messages={messages}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isTyping={isTyping}
          composer={composer}
          onComposerChange={value => setComposer(value)}
          onSendMessage={handleSendMessage}
          sending={sending}
          sendError={sendError}
        />
      ) : (
        <BuyerChatLayout
          threads={threads}
          isLoading={isInboxLoading}
          totalUnread={totalUnread}
          search={search}
          onSearchChange={value => setSearch(value)}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
          messages={messages}
          messagesLoading={messagesLoading}
          messagesError={messagesError}
          hasMore={hasMore}
          onLoadMore={loadMore}
          isTyping={isTyping}
          composer={composer}
          onComposerChange={value => setComposer(value)}
          onSendMessage={handleSendMessage}
          sending={sending}
          sendError={sendError}
        />
      )}
    </section>
  );
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
