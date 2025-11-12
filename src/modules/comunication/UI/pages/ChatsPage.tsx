import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChatThreadDTO } from "../../application/dto/ChatThreadDTO";
import type { ChatMessageDTO } from "../../application/dto/ChatMessageDTO";
import type { ListerInboxDTO, ClientInboxDTO } from "../../application/dto/InboxDTO";
import styles from "../components/ChatsPage.module.css";
import { ChatProvider, useChatModule } from "../contexts/ChatProvider";
import { useChatRealtime } from "../hooks/useChatRealtime";
import { supabase } from "../../../../core/supabase/client";
import { BuyerChatLayout, SellerChatLayout } from "../components/ChatLayouts";

export default function ChatsPage() {
  return (
    <ChatProvider>
      <ChatExperience />
    </ChatProvider>
  );
}

type ViewMode = "lister" | "client";

function ChatExperience() {
  const { useCases } = useChatModule();
  const [view, setView] = useState<ViewMode>("lister");
  const [viewResolving, setViewResolving] = useState(true);
  const [listerInbox, setListerInbox] = useState<ListerInboxDTO | null>(null);
  const [clientInbox, setClientInbox] = useState<ClientInboxDTO | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [sellerSearch, setSellerSearch] = useState("");
  const [buyerSearch, setBuyerSearch] = useState("");

  const applyMockConversation = useCallback(
    (mode: ViewMode) => {
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
    },
    [],
  );

  const loadMessages = useCallback(
    async (thread: ChatThreadDTO) => {
      setMessagesLoading(true);
      const result = await useCases.listMessages.execute({ threadId: thread.id, page: 1, pageSize: 50 });
      if (result.isErr()) {
        setMessages([]);
      } else {
        setMessages(result.value.items);
      }
      setMessagesLoading(false);
      void useCases.markThreadAsRead.execute(thread.id);
    },
    [useCases.listMessages, useCases.markThreadAsRead],
  );

  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    if (view === "lister") {
      const result = await useCases.listListerInbox.execute();
      if (result.isErr()) {
        applyMockConversation("lister");
        return;
      }
      setListerInbox(result.value);
      const candidate = result.value.groups[0]?.threads[0] ?? null;
      if (candidate) {
        setSelectedThread(candidate);
        void loadMessages(candidate);
      } else {
        applyMockConversation("lister");
        return;
      }
    } else {
      const result = await useCases.listClientInbox.execute();
      if (result.isErr()) {
        applyMockConversation("client");
        return;
      }
      setClientInbox(result.value);
      if (result.value.thread) {
        setSelectedThread(result.value.thread);
        void loadMessages(result.value.thread);
      } else {
        applyMockConversation("client");
        return;
      }
    }
    setLoadingInbox(false);
  }, [useCases.listListerInbox, useCases.listClientInbox, view, loadMessages, applyMockConversation]);

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
      setMessages(prev => {
        if (prev.some(item => item.id === message.id)) {
          return prev;
        }
        return [...prev, message];
      });
    },
    [selectedThread, loadInbox],
  );

  useChatRealtime(selectedThread?.id ?? null, { onMessage: handleRealtimeMessage });

  const sellerGroups = useMemo(() => listerInbox?.groups ?? [], [listerInbox]);
  const buyerThreads = useMemo(() => {
    if (clientInbox?.thread) {
      return [clientInbox.thread];
    }
    return selectedThread ? [selectedThread] : [];
  }, [clientInbox, selectedThread]);

  const totalUnreadSeller = listerInbox?.totalUnread ?? 0;
  const totalUnreadBuyer = clientInbox?.unreadCount ?? (selectedThread?.unreadCount ?? 0);

  const handleSelectThread = useCallback(
    (thread: ChatThreadDTO) => {
      setSelectedThread(thread);
      void loadMessages(thread);
    },
    [loadMessages],
  );

  const handleSendMessage = useCallback(async () => {
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
    setMessages(prev => [...prev, result.value]);
    setSending(false);
    void useCases.markThreadAsRead.execute(selectedThread.id);
  }, [composer, selectedThread, useCases.sendMessage, useCases.markThreadAsRead]);

  const isLoadingInbox = viewResolving || loadingInbox;

  return (
    <section className={styles.page}>
      {view === "lister" ? (
        <SellerChatLayout
          groups={sellerGroups}
          isLoading={isLoadingInbox}
          totalUnread={totalUnreadSeller}
          search={sellerSearch}
          onSearchChange={setSellerSearch}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
          messages={messages}
          messagesLoading={messagesLoading}
          composer={composer}
          onComposerChange={setComposer}
          onSendMessage={handleSendMessage}
          sending={sending}
        />
      ) : (
        <BuyerChatLayout
          threads={buyerThreads}
          isLoading={isLoadingInbox}
          totalUnread={totalUnreadBuyer}
          search={buyerSearch}
          onSearchChange={setBuyerSearch}
          selectedThread={selectedThread}
          onSelectThread={handleSelectThread}
          messages={messages}
          messagesLoading={messagesLoading}
          composer={composer}
          onComposerChange={setComposer}
          onSendMessage={handleSendMessage}
          sending={sending}
        />
      )}
    </section>
  );
}

const SELLER_ROLES = new Set(["agent", "agent_org", "org_admin", "owner", "seller", "agency", "broker", "lister"]);

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

function buildMockConversation() {
  const now = new Date();
  const minusMinutes = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

  const mockProperty = {
    id: "prop-mock-1",
    title: "Casa moderna en Polanco",
    price: 2850000,
    currency: "MXN",
    city: "CDMX",
    state: "Ciudad de México",
    coverImageUrl: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=60",
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
