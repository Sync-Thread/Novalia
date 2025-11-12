# ANÁLISIS TÉCNICO PARA IMPLEMENTACIÓN DE MÓDULO DE CHAT EN TIEMPO REAL - PARTE 2.2 (FINAL)

**Fecha**: 11 de Noviembre, 2025  
**Proyecto**: Novalia  
**Módulo**: HU-07 - Comunicación en tiempo real  
**Branch**: feature/chat-integration

---

## 8. FLUJOS DE DATOS DETALLADOS (Continuación)

### d) **Flujo: Estados del mensaje (sent → delivered → read)**

#### **Estado "sent"**
- Se establece cuando `created_at` existe
- Ocurre inmediatamente al insertar en la BD

#### **Estado "delivered"**
```
1. Suscripción Realtime del receptor detecta nuevo mensaje
   ↓
2. Hook useChat actualiza estado local
   setMessages(prev => [...prev, newMessage])
   ↓
3. Llamar a MarkAsDelivered.execute({ messageId })
   ↓
4. Use Case actualiza delivered_at
   UPDATE chat_messages
   SET delivered_at = NOW()
   WHERE id = $1
   ↓
5. Realtime propaga el cambio
   ↓
6. Emisor ve el check de "entregado" (✓✓)
```

**Código** (useMessageStatus.ts):

```typescript
export function useMessageStatus(threadId: string) {
  const { markAsDelivered, markAsRead } = useChatActions();
  
  // Marcar mensajes como entregados cuando se cargan
  useEffect(() => {
    const markUndeliveredMessages = async () => {
      const undelivered = messages.filter(
        m => m.senderUserId !== currentUserId && !m.deliveredAt
      );
      
      for (const message of undelivered) {
        await markAsDelivered({ messageId: message.id });
      }
    };
    
    markUndeliveredMessages();
  }, [messages]);
  
  return { /* ... */ };
}
```

#### **Estado "read"**
```
1. Usuario ve el mensaje en pantalla (detección con Intersection Observer)
   ↓
2. Llamar a MarkAsRead.execute({ messageId })
   ↓
3. Use Case actualiza read_at
   UPDATE chat_messages
   SET read_at = NOW()
   WHERE id = $1
   AND sender_user_id != $current_user_id  -- No marcar propios mensajes
   ↓
4. Actualizar unread_count del thread
   UPDATE chat_threads
   SET metadata = jsonb_set(
     metadata, 
     '{unread_count}', 
     (SELECT COUNT(*) FROM chat_messages 
      WHERE thread_id = $1 AND read_at IS NULL)::text::jsonb
   )
   ↓
5. Realtime propaga el cambio
   ↓
6. Emisor ve el check de "leído" (✓✓ en azul)
```

**Código con Intersection Observer** (MessageItem.tsx):

```typescript
export function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const { markAsRead } = useChatActions();
  const elementRef = useRef<HTMLDivElement>(null);
  const hasBeenMarkedRef = useRef(false);
  
  useEffect(() => {
    // Solo marcar mensajes de otros usuarios que no estén leídos
    if (isOwnMessage || message.readAt || hasBeenMarkedRef.current) {
      return;
    }
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasBeenMarkedRef.current) {
          hasBeenMarkedRef.current = true;
          markAsRead({ messageId: message.id });
        }
      },
      { threshold: 0.5 } // 50% del mensaje visible
    );
    
    if (elementRef.current) {
      observer.observe(elementRef.current);
    }
    
    return () => observer.disconnect();
  }, [message.id, message.readAt, isOwnMessage, markAsRead]);
  
  return (
    <div ref={elementRef} className={styles.messageItem}>
      <MessageBubble message={message} isOwn={isOwnMessage} />
      {isOwnMessage && (
        <MessageStatus 
          deliveredAt={message.deliveredAt}
          readAt={message.readAt}
        />
      )}
    </div>
  );
}
```

**Componente MessageStatus** (MessageStatus.tsx):

```typescript
export function MessageStatus({ deliveredAt, readAt }: MessageStatusProps) {
  if (readAt) {
    return (
      <div className={styles.status}>
        <CheckCheck className={styles.iconRead} size={14} />
        <span className={styles.timestamp}>
          Leído {formatTimestamp(readAt)}
        </span>
      </div>
    );
  }
  
  if (deliveredAt) {
    return (
      <div className={styles.status}>
        <CheckCheck className={styles.iconDelivered} size={14} />
        <span className={styles.timestamp}>Entregado</span>
      </div>
    );
  }
  
  return (
    <div className={styles.status}>
      <Check className={styles.iconSent} size={14} />
      <span className={styles.timestamp}>Enviado</span>
    </div>
  );
}
```

### e) **Flujo: Indicador "escribiendo..."**

```
1. Usuario empieza a escribir en MessageInput
   ↓
2. Evento onChange detecta tecleo
   ↓
3. Hook useTypingIndicator con debounce (500ms)
   ↓
4. Broadcast evento "typing" vía Realtime Channel
   
   channel.send({
     type: 'broadcast',
     event: 'typing',
     payload: { userId, userName, timestamp }
   })
   ↓
5. Otros participantes reciben el evento
   ↓
6. Actualizar estado local
   setTypingUsers(prev => [...prev, { userId, userName }])
   ↓
7. Mostrar TypingIndicator
   "Juan está escribiendo..."
   ↓
8. Timeout de 3 segundos: si no hay más eventos, remover del estado
   setTimeout(() => {
     setTypingUsers(prev => prev.filter(u => u.userId !== userId))
   }, 3000)
```

**Código** (useTypingIndicator.ts):

```typescript
export function useTypingIndicator(threadId: string) {
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const { user } = useAuth();
  const channel = useRealtimeChannel(threadId);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Escuchar eventos de typing
  useEffect(() => {
    if (!channel) return;
    
    const handleTyping = (payload: { userId: string; userName: string }) => {
      if (payload.userId === user?.id) return; // Ignorar propios eventos
      
      // Agregar/actualizar usuario escribiendo
      setTypingUsers(prev => {
        const exists = prev.some(u => u.userId === payload.userId);
        if (exists) {
          return prev; // Ya está en la lista
        }
        return [...prev, payload];
      });
      
      // Cancelar timeout anterior
      const existingTimeout = timeoutRefs.current.get(payload.userId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      // Nuevo timeout para remover después de 3s
      const timeout = setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u.userId !== payload.userId));
        timeoutRefs.current.delete(payload.userId);
      }, 3000);
      
      timeoutRefs.current.set(payload.userId, timeout);
    };
    
    channel.on('broadcast', { event: 'typing' }, handleTyping);
    
    return () => {
      channel.off('broadcast', handleTyping);
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    };
  }, [channel, user?.id]);
  
  // Función para emitir evento de typing
  const emitTyping = useCallback(
    debounce(() => {
      if (!channel || !user) return;
      
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          userName: user.fullName || 'Usuario',
          timestamp: Date.now()
        }
      });
    }, 500), // Debounce de 500ms
    [channel, user]
  );
  
  return { typingUsers, emitTyping };
}
```

**Uso en MessageInput** (MessageInput.tsx):

```typescript
export function MessageInput({ threadId, onSend }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { emitTyping } = useTypingIndicator(threadId);
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Emitir evento de typing (con debounce interno)
    if (e.target.value.length > 0) {
      emitTyping();
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    await onSend(message);
    setMessage('');
  };
  
  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <textarea
        value={message}
        onChange={handleChange}
        placeholder="Escribe un mensaje..."
        maxLength={5000}
        rows={1}
        className={styles.input}
      />
      <button type="submit" disabled={!message.trim()}>
        <Send size={20} />
      </button>
    </form>
  );
}
```

**Componente TypingIndicator** (TypingIndicator.tsx):

```typescript
export function TypingIndicator({ users }: { users: TypingUser[] }) {
  if (users.length === 0) return null;
  
  const text = users.length === 1
    ? `${users[0].userName} está escribiendo...`
    : users.length === 2
    ? `${users[0].userName} y ${users[1].userName} están escribiendo...`
    : `${users.length} personas están escribiendo...`;
  
  return (
    <div className={styles.typingIndicator}>
      <div className={styles.dots}>
        <span />
        <span />
        <span />
      </div>
      <span className={styles.text}>{text}</span>
    </div>
  );
}
```

---

## 9. ESTADO Y CONTEXTO

### a) **Estrategia recomendada: Context API + Reducer**

Para el módulo de chat, **NO usar Zustand** (para mantener consistencia con el resto del proyecto que usa hooks y containers).

En su lugar, usar:
- **Context API** para estado global del chat
- **useReducer** para lógica compleja de actualización
- **Custom hooks** para encapsular lógica

### b) **Estructura del estado global**

**Archivo**: `src/modules/chat/UI/context/ChatContext.tsx`

```typescript
// Estado global del chat
interface ChatState {
  // Threads
  threads: ThreadDTO[];
  activeThreadId: string | null;
  threadsLoading: boolean;
  threadsError: string | null;
  
  // Messages del thread activo
  messages: MessageDTO[];
  messagesLoading: boolean;
  messagesError: string | null;
  
  // Estado de UI
  unreadCount: number;
  typingUsers: TypingUser[];
  
  // Metadata
  lastSync: Date | null;
}

// Acciones
type ChatAction =
  | { type: 'SET_THREADS'; payload: ThreadDTO[] }
  | { type: 'ADD_THREAD'; payload: ThreadDTO }
  | { type: 'UPDATE_THREAD'; payload: { id: string; changes: Partial<ThreadDTO> } }
  | { type: 'SET_ACTIVE_THREAD'; payload: string | null }
  | { type: 'SET_MESSAGES'; payload: MessageDTO[] }
  | { type: 'ADD_MESSAGE'; payload: MessageDTO }
  | { type: 'UPDATE_MESSAGE'; payload: { id: string; changes: Partial<MessageDTO> } }
  | { type: 'SET_TYPING_USERS'; payload: TypingUser[] }
  | { type: 'ADD_TYPING_USER'; payload: TypingUser }
  | { type: 'REMOVE_TYPING_USER'; payload: string }
  | { type: 'SET_UNREAD_COUNT'; payload: number }
  | { type: 'SET_LOADING'; payload: { scope: 'threads' | 'messages'; loading: boolean } }
  | { type: 'SET_ERROR'; payload: { scope: 'threads' | 'messages'; error: string | null } };

// Reducer
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_THREADS':
      return { ...state, threads: action.payload, threadsLoading: false };
    
    case 'ADD_THREAD':
      return {
        ...state,
        threads: [action.payload, ...state.threads]
      };
    
    case 'UPDATE_THREAD':
      return {
        ...state,
        threads: state.threads.map(t =>
          t.id === action.payload.id
            ? { ...t, ...action.payload.changes }
            : t
        )
      };
    
    case 'SET_ACTIVE_THREAD':
      return { ...state, activeThreadId: action.payload };
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload, messagesLoading: false };
    
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.id
            ? { ...m, ...action.payload.changes }
            : m
        )
      };
    
    case 'ADD_TYPING_USER':
      return {
        ...state,
        typingUsers: state.typingUsers.some(u => u.userId === action.payload.userId)
          ? state.typingUsers
          : [...state.typingUsers, action.payload]
      };
    
    case 'REMOVE_TYPING_USER':
      return {
        ...state,
        typingUsers: state.typingUsers.filter(u => u.userId !== action.payload)
      };
    
    case 'SET_UNREAD_COUNT':
      return { ...state, unreadCount: action.payload };
    
    case 'SET_LOADING':
      return {
        ...state,
        [`${action.payload.scope}Loading`]: action.payload.loading
      };
    
    case 'SET_ERROR':
      return {
        ...state,
        [`${action.payload.scope}Error`]: action.payload.error
      };
    
    default:
      return state;
  }
}

// Context
const ChatContext = createContext<{
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
} | null>(null);

// Provider
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, {
    threads: [],
    activeThreadId: null,
    threadsLoading: true,
    threadsError: null,
    messages: [],
    messagesLoading: false,
    messagesError: null,
    unreadCount: 0,
    typingUsers: [],
    lastSync: null
  });
  
  return (
    <ChatContext.Provider value={{ state, dispatch }}>
      {children}
    </ChatContext.Provider>
  );
}

// Hook para consumir el contexto
export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within ChatProvider');
  }
  return context;
}
```

### c) **Hooks especializados que usan el contexto**

#### **useChatThreads.ts** (para inbox)

```typescript
export function useChatThreads() {
  const { state, dispatch } = useChatContext();
  const { listThreads } = useChatActions();
  
  // Cargar threads al montar
  useEffect(() => {
    const loadThreads = async () => {
      dispatch({ type: 'SET_LOADING', payload: { scope: 'threads', loading: true } });
      
      const result = await listThreads({ sortBy: 'recent' });
      
      if (result.isOk()) {
        dispatch({ type: 'SET_THREADS', payload: result.value.items });
        
        // Calcular contador de no leídos
        const unread = result.value.items.reduce(
          (sum, thread) => sum + (thread.unreadCount || 0),
          0
        );
        dispatch({ type: 'SET_UNREAD_COUNT', payload: unread });
      } else {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { scope: 'threads', error: result.error.message } 
        });
      }
    };
    
    loadThreads();
  }, []);
  
  // Suscribirse a cambios en threads vía Realtime
  useRealtimeThreads({
    onThreadUpdated: (thread) => {
      dispatch({ type: 'UPDATE_THREAD', payload: { id: thread.id, changes: thread } });
    },
    onNewThread: (thread) => {
      dispatch({ type: 'ADD_THREAD', payload: thread });
    }
  });
  
  return {
    threads: state.threads,
    loading: state.threadsLoading,
    error: state.threadsError,
    unreadCount: state.unreadCount
  };
}
```

#### **useChatMessages.ts** (para conversación)

```typescript
export function useChatMessages(threadId: string) {
  const { state, dispatch } = useChatContext();
  const { getMessages } = useChatActions();
  
  // Cargar mensajes del thread
  useEffect(() => {
    if (!threadId) return;
    
    const loadMessages = async () => {
      dispatch({ type: 'SET_LOADING', payload: { scope: 'messages', loading: true } });
      
      const result = await getMessages({ threadId });
      
      if (result.isOk()) {
        dispatch({ type: 'SET_MESSAGES', payload: result.value });
      } else {
        dispatch({ 
          type: 'SET_ERROR', 
          payload: { scope: 'messages', error: result.error.message } 
        });
      }
    };
    
    loadMessages();
  }, [threadId]);
  
  // Suscripción a nuevos mensajes
  useRealtimeMessages(threadId, {
    onNewMessage: (message) => {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    },
    onMessageUpdated: (message) => {
      dispatch({ 
        type: 'UPDATE_MESSAGE', 
        payload: { id: message.id, changes: message } 
      });
    }
  });
  
  return {
    messages: state.messages,
    loading: state.messagesLoading,
    error: state.messagesError
  };
}
```

### d) **Alternativa con React Query (opcional)**

Si el proyecto crece, considerar migrar a **React Query** para:
- Cache automático
- Refetch en background
- Optimistic updates
- Invalidación inteligente

```typescript
// Ejemplo con React Query
export function useChatThreads() {
  const { listThreads } = useChatActions();
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['chat', 'threads'],
    queryFn: async () => {
      const result = await listThreads({ sortBy: 'recent' });
      if (result.isErr()) throw new Error(result.error.message);
      return result.value.items;
    },
    staleTime: 30000, // 30 segundos
    refetchInterval: 60000 // Refetch cada minuto
  });
  
  return {
    threads: data || [],
    loading: isLoading,
    error: error?.message || null,
    refresh: refetch
  };
}
```

---

## 10. CASOS EDGE Y MANEJO DE ERRORES

### a) **Reconexión automática de WebSocket**

**Problema**: Pérdida de conexión Realtime por red inestable.

**Solución**: Supabase maneja reconexión automáticamente, pero podemos mejorar:

```typescript
// useRealtimeConnection.ts
export function useRealtimeConnection() {
  const [connectionState, setConnectionState] = useState<
    'connected' | 'connecting' | 'disconnected'
  >('connecting');
  const { supabase } = useSupabase();
  
  useEffect(() => {
    const channel = supabase.channel('connection_monitor');
    
    channel
      .on('system', { event: '*' }, (payload) => {
        if (payload.type === 'connected') {
          setConnectionState('connected');
        } else if (payload.type === 'error') {
          setConnectionState('disconnected');
        }
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);
  
  // Retry manual si falla
  const retry = useCallback(async () => {
    setConnectionState('connecting');
    await supabase.realtime.connect();
  }, [supabase]);
  
  return { connectionState, retry };
}
```

**Mostrar UI de estado**:

```typescript
export function ConnectionStatus() {
  const { connectionState, retry } = useRealtimeConnection();
  
  if (connectionState === 'connected') return null;
  
  return (
    <div className={styles.connectionBanner}>
      {connectionState === 'connecting' && (
        <>
          <Loader size={16} className={styles.spinner} />
          Conectando...
        </>
      )}
      {connectionState === 'disconnected' && (
        <>
          <WifiOff size={16} />
          Sin conexión
          <button onClick={retry}>Reintentar</button>
        </>
      )}
    </div>
  );
}
```

### b) **Mensajes pendientes cuando el usuario está offline**

**Estrategia**: Queue local + sincronización al reconectar

```typescript
// usePendingMessages.ts
interface PendingMessage {
  id: string;
  threadId: string;
  body: string;
  timestamp: number;
  retries: number;
}

export function usePendingMessages() {
  const [queue, setQueue] = useState<PendingMessage[]>([]);
  const { sendMessage } = useChatActions();
  const { connectionState } = useRealtimeConnection();
  
  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem('chat_pending_messages', JSON.stringify(queue));
  }, [queue]);
  
  // Cargar al montar
  useEffect(() => {
    const stored = localStorage.getItem('chat_pending_messages');
    if (stored) {
      setQueue(JSON.parse(stored));
    }
  }, []);
  
  // Enviar cuando se reconecte
  useEffect(() => {
    if (connectionState === 'connected' && queue.length > 0) {
      processPendingQueue();
    }
  }, [connectionState, queue.length]);
  
  const addToPending = useCallback((message: Omit<PendingMessage, 'retries'>) => {
    setQueue(prev => [...prev, { ...message, retries: 0 }]);
  }, []);
  
  const processPendingQueue = async () => {
    const toProcess = [...queue];
    
    for (const pending of toProcess) {
      try {
        const result = await sendMessage({
          threadId: pending.threadId,
          body: pending.body
        });
        
        if (result.isOk()) {
          // Remover de la queue
          setQueue(prev => prev.filter(m => m.id !== pending.id));
        } else {
          // Incrementar retries
          setQueue(prev => prev.map(m =>
            m.id === pending.id
              ? { ...m, retries: m.retries + 1 }
              : m
          ));
          
          // Si llegó a max retries, remover y notificar
          if (pending.retries >= 3) {
            setQueue(prev => prev.filter(m => m.id !== pending.id));
            console.error('Failed to send message after 3 retries:', pending);
          }
        }
      } catch (error) {
        console.error('Error processing pending message:', error);
      }
    }
  };
  
  return { addToPending, pendingCount: queue.length };
}
```

**Uso en SendMessage**:

```typescript
const handleSend = async (body: string) => {
  const tempId = generateId();
  
  // Agregar mensaje optimista a la UI
  const optimisticMessage = {
    id: tempId,
    threadId,
    body,
    senderType: 'user',
    senderUserId: user.id,
    createdAt: new Date().toISOString(),
    deliveredAt: null,
    readAt: null,
    pending: true
  };
  
  dispatch({ type: 'ADD_MESSAGE', payload: optimisticMessage });
  
  try {
    const result = await sendMessage({ threadId, body });
    
    if (result.isOk()) {
      // Reemplazar mensaje optimista con el real
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: tempId, changes: { ...result.value, pending: false } }
      });
    } else {
      // Marcar como fallido y agregar a pending
      dispatch({
        type: 'UPDATE_MESSAGE',
        payload: { id: tempId, changes: { failed: true } }
      });
      
      addToPending({ id: tempId, threadId, body, timestamp: Date.now() });
    }
  } catch (error) {
    dispatch({
      type: 'UPDATE_MESSAGE',
      payload: { id: tempId, changes: { failed: true } }
    });
  }
};
```

### c) **Fallo en la creación del thread**

**Validaciones**:

```typescript
export class CreateThread {
  async execute(input: CreateThreadInput): Promise<Result<ThreadDTO>> {
    // 1. Validar que la propiedad exista
    const propertyResult = await this.deps.propertyRepo.getById(input.propertyId);
    if (propertyResult.isErr()) {
      return Result.fail({
        code: 'PROPERTY_NOT_FOUND',
        message: 'La propiedad no existe o fue eliminada'
      });
    }
    
    // 2. Validar que el usuario no esté bloqueado
    if (input.userId) {
      const isBlocked = await this.deps.userRepo.isBlocked(input.userId);
      if (isBlocked) {
        return Result.fail({
          code: 'USER_BLOCKED',
          message: 'Tu cuenta ha sido suspendida'
        });
      }
    }
    
    // 3. Validar límite de threads por usuario (anti-spam)
    if (input.contactId) {
      const recentCount = await this.deps.threadRepo.countRecentByContact(
        input.contactId,
        { withinMinutes: 60 }
      );
      
      if (recentCount >= 5) {
        return Result.fail({
          code: 'RATE_LIMIT',
          message: 'Has creado demasiados chats. Intenta más tarde.'
        });
      }
    }
    
    // 4. Crear thread
    // ...
  }
}
```

**Manejo en UI**:

```typescript
const handleOpenChat = async () => {
  const result = await createThread({ propertyId, userId: user.id });
  
  if (result.isErr()) {
    switch (result.error.code) {
      case 'PROPERTY_NOT_FOUND':
        showToast('Esta propiedad ya no está disponible', 'error');
        navigate('/');
        break;
      
      case 'USER_BLOCKED':
        showToast('Tu cuenta ha sido suspendida. Contacta soporte.', 'error');
        break;
      
      case 'RATE_LIMIT':
        showToast('Demasiados intentos. Espera un momento.', 'warning');
        break;
      
      default:
        showToast('Error al iniciar chat. Intenta nuevamente.', 'error');
    }
    return;
  }
  
  setThreadId(result.value.id);
  setIsOpen(true);
};
```

### d) **Validaciones en cada capa**

#### **Domain Layer**

```typescript
// MessageBody value object
export class MessageBody {
  private readonly value: string;
  
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new InvariantViolationError('Message body cannot be empty');
    }
    
    if (value.length > 5000) {
      throw new InvariantViolationError('Message body too long (max 5000 chars)');
    }
    
    // Validar contenido peligroso (opcional)
    if (this.containsDangerousContent(value)) {
      throw new InvariantViolationError('Message contains prohibited content');
    }
    
    this.value = value.trim();
  }
  
  toString(): string {
    return this.value;
  }
  
  private containsDangerousContent(text: string): boolean {
    // Regex básico para detectar scripts
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i // onclick=, onerror=, etc.
    ];
    
    return dangerousPatterns.some(pattern => pattern.test(text));
  }
}
```

#### **Application Layer**

```typescript
// Zod schema
export const sendMessageSchema = z.object({
  threadId: z.string().uuid('Invalid thread ID'),
  body: z.string()
    .min(1, 'Message cannot be empty')
    .max(5000, 'Message too long (max 5000 characters)')
    .transform(s => s.trim()),
  attachments: z.array(z.object({
    type: z.enum(['image', 'document']),
    url: z.string().url(),
    name: z.string()
  })).optional()
});
```

#### **Infrastructure Layer**

```typescript
// Sanitización antes de insertar
export class SupabaseChatMessageRepo {
  async create(dto: MessageDTO): Promise<Result<MessageDTO>> {
    const sanitized = {
      ...dto,
      body: this.sanitizeHtml(dto.body), // Escapar HTML
      payload: dto.payload ? JSON.stringify(dto.payload) : null
    };
    
    const { data, error } = await this.client
      .from('chat_messages')
      .insert(sanitized)
      .select()
      .single();
    
    if (error) {
      // Mapear errores específicos de Postgres
      if (error.code === '23503') { // FK violation
        return Result.fail({
          code: 'THREAD_NOT_FOUND',
          message: 'Thread does not exist'
        });
      }
      
      return Result.fail(mapPostgrestError(error));
    }
    
    return Result.ok(mapRowToDTO(data));
  }
  
  private sanitizeHtml(text: string): string {
    return text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }
}
```

---

## 11. TESTING

### a) **Estructura de archivos de test**

```
src/tests/
├── domain/
│   └── chat/
│       ├── ChatThread.test.ts
│       ├── ChatMessage.test.ts
│       └── MessageBody.test.ts
├── application/
│   └── chat/
│       ├── SendMessage.test.ts
│       ├── CreateThread.test.ts
│       └── MarkAsRead.test.ts
└── e2e/
    └── chat/
        ├── chat-widget.spec.ts
        ├── inbox.spec.ts
        └── realtime.spec.ts
```

### b) **Tests de Domain**

```typescript
// tests/domain/chat/ChatMessage.test.ts
import { describe, it, expect } from 'vitest';
import { ChatMessage } from '../../../modules/chat/domain/entities/ChatMessage';
import { MessageBody } from '../../../modules/chat/domain/value-objects/MessageBody';
import { UniqueEntityID } from '../../../modules/chat/domain/value-objects/UniqueEntityID';

describe('ChatMessage Entity', () => {
  const createValidMessage = () => {
    return new ChatMessage({
      id: new UniqueEntityID('msg-1'),
      threadId: new UniqueEntityID('thread-1'),
      senderType: 'user',
      senderUserId: new UniqueEntityID('user-1'),
      body: new MessageBody('Hello world'),
      createdAt: new Date('2025-01-01T10:00:00Z')
    });
  };
  
  it('should create a valid message', () => {
    const message = createValidMessage();
    
    expect(message.id.toString()).toBe('msg-1');
    expect(message.status).toBe('sent');
    expect(message.body.toString()).toBe('Hello world');
  });
  
  it('should update status to delivered', () => {
    const message = createValidMessage();
    const deliveredAt = new Date('2025-01-01T10:00:05Z');
    
    message.markAsDelivered(deliveredAt);
    
    expect(message.status).toBe('delivered');
    expect(message.deliveredAt).toEqual(deliveredAt);
  });
  
  it('should update status to read', () => {
    const message = createValidMessage();
    message.markAsDelivered(new Date('2025-01-01T10:00:05Z'));
    
    const readAt = new Date('2025-01-01T10:00:10Z');
    message.markAsRead(readAt);
    
    expect(message.status).toBe('read');
    expect(message.readAt).toEqual(readAt);
  });
  
  it('should throw if trying to mark as read before delivered', () => {
    const message = createValidMessage();
    const readAt = new Date('2025-01-01T10:00:10Z');
    
    expect(() => message.markAsRead(readAt)).toThrow();
  });
});

// tests/domain/chat/MessageBody.test.ts
describe('MessageBody Value Object', () => {
  it('should create valid message body', () => {
    const body = new MessageBody('Hello');
    expect(body.toString()).toBe('Hello');
  });
  
  it('should trim whitespace', () => {
    const body = new MessageBody('  Hello  ');
    expect(body.toString()).toBe('Hello');
  });
  
  it('should throw on empty string', () => {
    expect(() => new MessageBody('')).toThrow('Message body cannot be empty');
  });
  
  it('should throw on whitespace only', () => {
    expect(() => new MessageBody('   ')).toThrow('Message body cannot be empty');
  });
  
  it('should throw on too long message', () => {
    const longText = 'a'.repeat(5001);
    expect(() => new MessageBody(longText)).toThrow('Message body too long');
  });
  
  it('should reject dangerous content', () => {
    expect(() => new MessageBody('<script>alert(1)</script>')).toThrow(
      'Message contains prohibited content'
    );
  });
});
```

### c) **Tests de Application (Use Cases)**

```typescript
// tests/application/chat/SendMessage.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SendMessage } from '../../../modules/chat/application/use-cases/message/SendMessage';
import { FakeChatMessageRepo } from '../../../modules/chat/application/fakes/FakeChatMessageRepo';
import { FakeChatThreadRepo } from '../../../modules/chat/application/fakes/FakeChatThreadRepo';
import { FakeAuthService } from '../../../modules/chat/application/fakes/FakeAuthService';

describe('SendMessage Use Case', () => {
  let useCase: SendMessage;
  let messageRepo: FakeChatMessageRepo;
  let threadRepo: FakeChatThreadRepo;
  let authService: FakeAuthService;
  
  beforeEach(() => {
    messageRepo = new FakeChatMessageRepo();
    threadRepo = new FakeChatThreadRepo();
    authService = new FakeAuthService();
    
    useCase = new SendMessage({
      messageRepo,
      threadRepo,
      auth: authService,
      clock: { now: () => new Date('2025-01-01T10:00:00Z') }
    });
  });
  
  it('should send message successfully', async () => {
    // Arrange
    authService.setCurrentUser({
      userId: 'user-1',
      orgId: 'org-1',
      fullName: 'John Doe'
    });
    
    threadRepo.addThread({
      id: 'thread-1',
      orgId: 'org-1',
      propertyId: 'prop-1',
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01T09:00:00Z')
    });
    
    // Act
    const result = await useCase.execute({
      threadId: 'thread-1',
      body: 'Hello!'
    });
    
    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.value.body).toBe('Hello!');
    expect(result.value.senderUserId).toBe('user-1');
    expect(messageRepo.messages).toHaveLength(1);
  });
  
  it('should fail if user not authenticated', async () => {
    authService.setCurrentUser(null);
    
    const result = await useCase.execute({
      threadId: 'thread-1',
      body: 'Hello!'
    });
    
    expect(result.isErr()).toBe(true);
    expect(result.error.code).toBe('AUTH');
  });
  
  it('should fail if thread not found', async () => {
    authService.setCurrentUser({
      userId: 'user-1',
      orgId: 'org-1',
      fullName: 'John Doe'
    });
    
    const result = await useCase.execute({
      threadId: 'nonexistent',
      body: 'Hello!'
    });
    
    expect(result.isErr()).toBe(true);
    expect(result.error.code).toBe('NOT_FOUND');
  });
  
  it('should update thread last_message_at', async () => {
    authService.setCurrentUser({
      userId: 'user-1',
      orgId: 'org-1',
      fullName: 'John Doe'
    });
    
    threadRepo.addThread({
      id: 'thread-1',
      orgId: 'org-1',
      propertyId: 'prop-1',
      createdBy: 'user-1',
      createdAt: new Date('2025-01-01T09:00:00Z'),
      lastMessageAt: null
    });
    
    await useCase.execute({
      threadId: 'thread-1',
      body: 'Hello!'
    });
    
    const thread = threadRepo.getById('thread-1');
    expect(thread.lastMessageAt).toEqual(new Date('2025-01-01T10:00:00Z'));
  });
});
```

### d) **Mock de Supabase Realtime**

```typescript
// tests/application/fakes/FakeRealtimeService.ts
export class FakeRealtimeService implements RealtimeService {
  private subscribers: Map<string, RealtimeSubscription[]> = new Map();
  
  async subscribeToThread(
    threadId: string,
    callbacks: RealtimeCallbacks
  ): Promise<Result<void>> {
    const subscription: RealtimeSubscription = {
      threadId,
      callbacks
    };
    
    const existing = this.subscribers.get(threadId) || [];
    this.subscribers.set(threadId, [...existing, subscription]);
    
    return Result.ok(undefined);
  }
  
  async unsubscribe(threadId: string): Promise<void> {
    this.subscribers.delete(threadId);
  }
  
  async broadcastTyping(threadId: string, userId: string): Promise<void> {
    // No-op en tests
  }
  
  // Helper para tests: simular nuevo mensaje
  simulateNewMessage(threadId: string, message: MessageDTO): void {
    const subs = this.subscribers.get(threadId) || [];
    subs.forEach(sub => sub.callbacks.onNewMessage(message));
  }
  
  // Helper para tests: simular typing
  simulateTyping(threadId: string, userId: string): void {
    const subs = this.subscribers.get(threadId) || [];
    subs.forEach(sub => sub.callbacks.onTyping?.(userId));
  }
}
```

### e) **Tests E2E con Playwright**

```typescript
// tests/e2e/chat/chat-widget.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Widget', () => {
  test('should open chat widget on contact button click', async ({ page }) => {
    await page.goto('/properties/123');
    
    // Esperar a que cargue la página
    await expect(page.locator('h1')).toBeVisible();
    
    // Click en botón de contacto
    await page.click('button:has-text("Contactar")');
    
    // Verificar que el widget se abre
    await expect(page.locator('[data-testid="chat-widget"]')).toBeVisible();
  });
  
  test('should show lead capture form for unauthenticated users', async ({ page }) => {
    await page.goto('/properties/123');
    await page.click('button:has-text("Contactar")');
    
    // Verificar formulario de captura
    await expect(page.locator('input[name="fullName"]')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="phone"]')).toBeVisible();
  });
  
  test('should send message after capturing lead', async ({ page }) => {
    await page.goto('/properties/123');
    await page.click('button:has-text("Contactar")');
    
    // Completar formulario
    await page.fill('input[name="fullName"]', 'John Doe');
    await page.fill('input[name="email"]', 'john@example.com');
    await page.fill('input[name="phone"]', '1234567890');
    await page.fill('textarea[name="message"]', 'Hola, me interesa esta propiedad');
    
    // Enviar
    await page.click('button[type="submit"]');
    
    // Verificar que se muestra el mensaje
    await expect(page.locator('text=Hola, me interesa esta propiedad')).toBeVisible();
  });
  
  test('should display typing indicator', async ({ page, context }) => {
    // Abrir dos páginas (dos usuarios)
    const page1 = page;
    const page2 = await context.newPage();
    
    // Usuario 1 abre chat
    await page1.goto('/inbox');
    await page1.click('[data-thread-id="thread-1"]');
    
    // Usuario 2 abre el mismo chat
    await page2.goto('/inbox');
    await page2.click('[data-thread-id="thread-1"]');
    
    // Usuario 2 empieza a escribir
    await page2.fill('textarea[placeholder="Escribe un mensaje..."]', 'Hola');
    
    // Usuario 1 debe ver el indicador
    await expect(page1.locator('text=está escribiendo...')).toBeVisible({ timeout: 5000 });
  });
});
```

### f) **Utilities de testing ya implementadas**

El proyecto usa:
- **Vitest** para unit tests
- **@testing-library/react** para component tests
- **Playwright** para E2E tests

Estructura existente:
```
src/tests/
├── application/    # Tests de use cases
├── domain/         # Tests de entidades
└── e2e/            # Tests end-to-end
```

**Ejemplo de test de componente**:

```typescript
// tests/ui/ChatWidget.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChatWidget } from '../../../modules/chat/UI/components/ChatWidget';

describe('ChatWidget Component', () => {
  it('should render chat button', () => {
    render(<ChatWidget propertyId="123" propertyTitle="Casa en venta" />);
    
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
  
  it('should open dialog on button click', async () => {
    render(<ChatWidget propertyId="123" propertyTitle="Casa en venta" />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
```

---

## RESUMEN Y PRÓXIMOS PASOS

### ✅ **Lo que tienes ahora**

1. **Arquitectura clara** siguiendo Clean Architecture del proyecto
2. **Schema de BD completo** en las migraciones existentes
3. **Estructura de carpetas detallada** para el módulo de chat
4. **Flujos de datos específicos** para cada caso de uso
5. **Integración definida** con properties, auth, telemetry, messaging
6. **Estrategia de estado** con Context API + Reducer
7. **Manejo de errores robusto** en todas las capas
8. **Plan de testing completo** con ejemplos concretos

### 🚀 **Orden de implementación recomendado**

#### **FASE 1: Foundation (Semana 1)**
1. Crear estructura de carpetas del módulo `chat/`
2. Implementar **Domain Layer**:
   - Entities: `ChatThread`, `ChatMessage`, `Participant`
   - Value Objects: `MessageBody`, `ThreadId`
   - Enums y errors
3. Implementar **Application Layer**:
   - DTOs
   - Ports (interfaces)
   - Mappers Domain ↔ DTO

#### **FASE 2: Infrastructure (Semana 1-2)**
4. Implementar **Infrastructure Layer**:
   - `SupabaseChatThreadRepo`
   - `SupabaseChatMessageRepo`
   - `SupabaseLeadContactRepo`
   - Mappers DTO ↔ DB Row
5. Crear **DI Container** (`chat.container.ts`)
6. Verificar políticas RLS en Supabase

#### **FASE 3: Use Cases Core (Semana 2)**
7. Implementar use cases esenciales:
   - `CreateThread`
   - `SendMessage`
   - `GetMessages`
   - `ListThreads`
8. Tests unitarios de use cases

#### **FASE 4: UI Básica (Semana 2-3)**
9. Implementar **Context y Estado**:
   - `ChatContext`
   - `chatReducer`
   - Hooks: `useChatContext`, `useChatActions`
10. Componentes base:
   - `MessageBubble`
   - `MessageList`
   - `MessageInput`

#### **FASE 5: ChatWidget (Semana 3)**
11. Implementar **ChatWidget** para PropertyDetailPage:
   - `ChatWidgetButton`
   - `ChatWidgetDialog`
   - `LeadCaptureForm`
12. Integrar en `PropertyDetailPage`
13. Tests E2E del flujo completo

#### **FASE 6: Inbox (Semana 4)**
14. Implementar **ChatInboxPage**:
   - `ThreadList`
   - `ConversationPanel`
   - `ProspectInfoPanel`
15. Agregar ruta en `routes.tsx`

#### **FASE 7: Realtime (Semana 4-5)**
16. Implementar `SupabaseRealtimeService`
17. Hooks de realtime:
   - `useChatRealtime`
   - `useTypingIndicator`
   - `useMessageStatus`
18. Habilitar Realtime en Supabase Dashboard

#### **FASE 8: Features Avanzadas (Semana 5-6)**
19. Estados de mensajes (delivered, read)
20. Indicador "escribiendo..."
21. Notificaciones (email, push)
22. Escalación a WhatsApp
23. Manejo de offline/pending messages

#### **FASE 9: Polish & Testing (Semana 6)**
24. Tests completos (unit, integration, E2E)
25. Optimizaciones de performance
26. Virtualización de listas largas
27. Accesibilidad (ARIA labels, keyboard nav)
28. Documentación

### 📋 **Checklist de validación**

Antes de dar por terminado el módulo:

- [ ] Usuario NO autenticado puede iniciar chat desde PropertyDetailPage
- [ ] Se captura lead (nombre, email, teléfono)
- [ ] Usuario autenticado puede chatear directamente
- [ ] Mensajes en tiempo real funcionan correctamente
- [ ] Estados sent/delivered/read se actualizan
- [ ] Indicador "escribiendo..." funciona
- [ ] Inbox muestra todos los threads ordenados por último mensaje
- [ ] Badge de no leídos es correcto
- [ ] Se pueden archivar threads
- [ ] Notificaciones por email funcionan
- [ ] RLS impide acceso no autorizado
- [ ] Funciona offline (pending messages)
- [ ] Tests >80% coverage
- [ ] No hay memory leaks en suscripciones Realtime

### 🎯 **Archivos clave a crear primero**

```
1. src/modules/chat/domain/entities/ChatMessage.ts
2. src/modules/chat/domain/entities/ChatThread.ts
3. src/modules/chat/application/dto/MessageDTO.ts
4. src/modules/chat/application/dto/ThreadDTO.ts
5. src/modules/chat/application/ports/ChatMessageRepo.ts
6. src/modules/chat/application/ports/ChatThreadRepo.ts
7. src/modules/chat/application/use-cases/message/SendMessage.ts
8. src/modules/chat/infrastructure/adapters/SupabaseChatMessageRepo.ts
9. src/modules/chat/chat.container.ts
10. src/modules/chat/UI/context/ChatContext.tsx
```

---

**¡Listo para empezar la implementación!** 🚀

Si necesitas código específico de algún archivo o tienes dudas sobre algún flujo, avísame y te proporciono el código completo.
