# 🔄 REFACTORIZACIÓN: ChatsPage usando Hooks Personalizados

## 📊 Comparación ANTES vs DESPUÉS

### ❌ ANTES (Actual - Sin hooks)

```typescript
// ChatsPage.tsx - 535 líneas de código repetitivo

function ChatExperience() {
  const { useCases } = useChatModule();
  
  // 🔴 DEMASIADO STATE MANUAL
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [composer, setComposer] = useState("");
  const [sending, setSending] = useState(false);
  const [listerInbox, setListerInbox] = useState<ListerInboxDTO | null>(null);
  const [loadingInbox, setLoadingInbox] = useState(true);
  
  // 🔴 LÓGICA REPETITIVA PARA MENSAJES
  const loadMessages = useCallback(async (thread: ChatThreadDTO) => {
    setMessagesLoading(true);
    const result = await useCases.listMessages.execute({ 
      threadId: thread.id, 
      page: 1, 
      pageSize: 50 
    });
    if (result.isErr()) {
      setMessages([]);
    } else {
      setMessages(result.value.items);
    }
    setMessagesLoading(false);
    void useCases.markThreadAsRead.execute(thread.id);
  }, [useCases]);
  
  // 🔴 LÓGICA REPETITIVA PARA INBOX
  const loadInbox = useCallback(async () => {
    setLoadingInbox(true);
    const result = await useCases.listListerInbox.execute();
    if (result.isErr()) {
      // handle error
    } else {
      setListerInbox(result.value);
      // más lógica...
    }
    setLoadingInbox(false);
  }, [useCases]);
  
  // 🔴 LÓGICA REPETITIVA PARA ENVIAR
  const handleSendMessage = useCallback(async (event?: React.FormEvent) => {
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
    setMessages(prev => [...prev, result.value]);
    setSending(false);
  }, [composer, selectedThread, useCases]);
  
  // 🔴 REALTIME MANUAL
  const handleRealtimeMessage = useCallback((message: ChatMessageDTO) => {
    if (!selectedThread || message.threadId !== selectedThread.id) {
      void loadInbox();
      return;
    }
    setMessages(prev => {
      if (prev.some(item => item.id === message.id)) return prev;
      return [...prev, message];
    });
  }, [selectedThread, loadInbox]);
  
  useChatRealtime(selectedThread?.id ?? null, { 
    onMessage: handleRealtimeMessage 
  });
  
  // 200+ líneas más de JSX...
}
```

**Problemas:**
- 🔴 **535 líneas** de código
- 🔴 **10+ estados** manuales
- 🔴 **Lógica duplicada** (loading, error handling)
- 🔴 **Difícil de mantener**
- 🔴 **No reutilizable**

---

### ✅ DESPUÉS (Con hooks personalizados)

```typescript
// ChatsPage.tsx - ~200 líneas (62% menos código)

import { useInbox } from '../hooks/useInbox';
import { useMessages } from '../hooks/useMessages';
import { useSendMessage } from '../hooks/useSendMessage';

function ChatExperience() {
  const [view, setView] = useState<ViewMode>("lister");
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(null);
  const [search, setSearch] = useState("");
  
  // ✅ UN SOLO HOOK PARA TODO EL INBOX
  const { 
    threads, 
    groups, 
    loading: loadingInbox, 
    error: inboxError,
    totalUnread,
    refresh: refreshInbox 
  } = useInbox({ 
    role: view === 'lister' ? 'seller' : 'buyer',
    search 
  });
  
  // ✅ UN SOLO HOOK PARA MENSAJES
  const { 
    messages, 
    loading: messagesLoading, 
    error: messagesError,
    hasMore,
    loadMore,
    isTyping 
  } = useMessages({ 
    threadId: selectedThread?.id || null 
  });
  
  // ✅ UN SOLO HOOK PARA ENVIAR
  const { 
    sendMessage, 
    sending 
  } = useSendMessage({ 
    threadId: selectedThread?.id || null,
    onSuccess: () => {
      // Mensaje enviado
      refreshInbox(); // Actualizar contador
    }
  });
  
  // ✅ ENVIAR MENSAJE - 3 LÍNEAS
  const handleSend = async (text: string) => {
    await sendMessage(text);
  };
  
  // ✅ CAMBIAR THREAD - 1 LÍNEA
  const handleSelectThread = (thread: ChatThreadDTO) => {
    setSelectedThread(thread);
    // useMessages se encarga automáticamente de cargar mensajes
  };
  
  // JSX simplificado...
}
```

**Beneficios:**
- ✅ **~200 líneas** (62% menos código)
- ✅ **3 hooks simples** vs 10+ estados
- ✅ **Lógica centralizada** en hooks
- ✅ **Fácil de mantener**
- ✅ **Reutilizable** en otros componentes

---

## 🎯 VALOR REAL DE LOS HOOKS

### 1️⃣ **useInbox** - Maneja TODO el inbox

**Antes (50+ líneas):**
```typescript
const [listerInbox, setListerInbox] = useState(null);
const [loadingInbox, setLoadingInbox] = useState(true);
const [error, setError] = useState(null);

const loadInbox = useCallback(async () => {
  setLoadingInbox(true);
  setError(null);
  const result = await useCases.listListerInbox.execute();
  if (result.isErr()) {
    setError(result.error.message);
  } else {
    setListerInbox(result.value);
    // filtrar por búsqueda
    // contar no leídos
    // más lógica...
  }
  setLoadingInbox(false);
}, [useCases]);

useEffect(() => {
  void loadInbox();
}, [loadInbox]);
```

**Después (1 línea):**
```typescript
const { threads, loading, totalUnread } = useInbox({ 
  role: 'seller', 
  search 
});
```

### 2️⃣ **useMessages** - Maneja mensajes + paginación + realtime

**Antes (80+ líneas):**
```typescript
const [messages, setMessages] = useState([]);
const [loading, setLoading] = useState(false);
const [hasMore, setHasMore] = useState(false);

const loadMessages = useCallback(async (threadId) => {
  setLoading(true);
  const result = await useCases.listMessages.execute({ threadId });
  // manejar resultado
  // actualizar estado
  setLoading(false);
}, []);

// Realtime manual
const handleNewMessage = useCallback((msg) => {
  setMessages(prev => [...prev, msg]);
}, []);

useChatRealtime(threadId, { onMessage: handleNewMessage });

// Marcar como leído
useEffect(() => {
  if (threadId && messages.length > 0) {
    void useCases.markThreadAsRead.execute(threadId);
  }
}, [threadId, messages]);
```

**Después (1 línea):**
```typescript
const { messages, loading, hasMore, loadMore, isTyping } = useMessages({ 
  threadId 
});
// ✅ Auto-carga mensajes cuando cambia threadId
// ✅ Auto-subscribe a realtime
// ✅ Auto-marca como leído
// ✅ Maneja paginación
```

### 3️⃣ **useSendMessage** - Maneja envío + optimistic updates

**Antes (40+ líneas):**
```typescript
const [sending, setSending] = useState(false);
const [error, setError] = useState(null);

const handleSend = useCallback(async (body: string) => {
  if (!threadId || !body.trim()) return;
  setSending(true);
  setError(null);
  
  const result = await useCases.sendMessage.execute({ threadId, body });
  
  if (result.isErr()) {
    setError(result.error.message);
    setSending(false);
    return;
  }
  
  // Agregar a lista local
  setMessages(prev => [...prev, result.value]);
  setSending(false);
}, [threadId, useCases]);
```

**Después (3 líneas):**
```typescript
const { sendMessage, sending, error } = useSendMessage({ 
  threadId,
  onSuccess: () => console.log('Enviado!')
});

await sendMessage("Hola mundo");
```

---

## 📈 IMPACTO EN EL PROYECTO

### Reducción de Código

| Componente | Antes | Después | Ahorro |
|------------|-------|---------|--------|
| **ChatsPage** | 535 líneas | ~200 líneas | **62%** ↓ |
| **ChatWidget** | ~300 líneas | ~120 líneas | **60%** ↓ |
| **Total** | 835 líneas | 320 líneas | **61% menos código** |

### Reducción de Bugs

- ✅ **No más estados inconsistentes** (todo centralizado en hooks)
- ✅ **No más memory leaks** (hooks limpian subscriptions)
- ✅ **No más race conditions** (hooks manejan secuencias)

### Facilidad de Testing

**Antes:**
```typescript
// Testear ChatsPage = testear 535 líneas con 10+ estados
```

**Después:**
```typescript
// Testear 3 hooks independientes + 1 componente simple
describe('useMessages', () => {
  it('should load messages on mount', () => {
    // test hook en aislamiento
  });
});
```

---

## 🚀 PLAN DE REFACTORIZACIÓN

### Paso 1: Agregar exports de hooks (5 min)

```typescript
// src/modules/comunication/UI/hooks/index.ts
export { useInbox } from './useInbox';
export { useMessages } from './useMessages';
export { useSendMessage } from './useSendMessage';
export { useChatRealtime } from './useChatRealtime';
```

### Paso 2: Refactorizar ChatsPage (30 min)

1. Importar hooks
2. Reemplazar lógica de inbox con `useInbox`
3. Reemplazar lógica de mensajes con `useMessages`
4. Reemplazar lógica de envío con `useSendMessage`
5. Eliminar estados innecesarios
6. Eliminar callbacks complejos

### Paso 3: Probar (15 min)

1. Verificar que inbox carga correctamente
2. Verificar que mensajes aparecen
3. Verificar que enviar mensaje funciona
4. Verificar que realtime funciona

---

## 🎯 RESULTADO FINAL

### ChatsPage SIMPLIFICADO:

```typescript
function ChatExperience() {
  const [view, setView] = useState<ViewMode>("lister");
  const [selectedThread, setSelectedThread] = useState<ChatThreadDTO | null>(null);
  const [search, setSearch] = useState("");
  
  // 3 hooks = TODO el estado y lógica
  const inbox = useInbox({ role: view === 'lister' ? 'seller' : 'buyer', search });
  const chat = useMessages({ threadId: selectedThread?.id || null });
  const sender = useSendMessage({ 
    threadId: selectedThread?.id || null,
    onSuccess: () => inbox.refresh()
  });
  
  return (
    <div className={styles.page}>
      {/* Sidebar con threads */}
      <ThreadListSidebar 
        threads={inbox.threads}
        loading={inbox.loading}
        onSelect={setSelectedThread}
      />
      
      {/* Chat area */}
      <ChatArea
        messages={chat.messages}
        loading={chat.loading}
        sending={sender.sending}
        onSend={sender.sendMessage}
      />
    </div>
  );
}
```

**Características:**
- ✅ ~100 líneas de código
- ✅ Fácil de leer y entender
- ✅ Fácil de mantener
- ✅ Fácil de testear
- ✅ Reutilizable en otros componentes

---

## 💡 CONCLUSIÓN

Los hooks que agregaste **SON CRÍTICOS** pero aún no están siendo usados.

### Para ver el beneficio REAL:

1. **Refactoriza ChatsPage** para usar los hooks
2. **Verás que el código se reduce 60%**
3. **Será mucho más fácil agregar ChatWidget**
4. **Será mucho más fácil hacer debugging**

### Próximos pasos:

1. ✅ **YA HICISTE:** Crear los 3 hooks personalizados
2. ⏭️ **SIGUIENTE:** Refactorizar ChatsPage para usarlos
3. ⏭️ **DESPUÉS:** Crear ChatWidget (será MUY fácil con los hooks)

---

**💪 Los hooks son la BASE para todo el módulo de chat. Sin usarlos, es como tener un Ferrari en el garaje sin usarlo!**
