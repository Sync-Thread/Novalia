import { useState, useCallback } from 'react';
import { useChatModule } from '../contexts/ChatProvider';
import type { ChatMessageDTO } from '../../application/dto/ChatMessageDTO';

interface UseSendMessageOptions {
  threadId: string | null;
  onSuccess?: (message: ChatMessageDTO) => void;
  onError?: (error: string) => void;
}

interface UseSendMessageReturn {
  sendMessage: (body: string, payload?: Record<string, unknown> | null) => Promise<boolean>;
  sending: boolean;
  error: string | null;
  lastSentMessage: ChatMessageDTO | null;
}

/**
 * Hook para enviar mensajes en un thread
 * 
 * @param threadId - ID del thread donde enviar el mensaje
 * @param onSuccess - Callback cuando el mensaje se envía exitosamente
 * @param onError - Callback cuando hay un error al enviar
 * 
 * @example
 * ```tsx
 * function MessageInput({ threadId }: { threadId: string }) {
 *   const [text, setText] = useState('');
 *   const { sendMessage, sending, error } = useSendMessage({ 
 *     threadId,
 *     onSuccess: () => setText(''),
 *   });
 *   
 *   const handleSend = async () => {
 *     if (!text.trim()) return;
 *     const success = await sendMessage(text);
 *     if (success) {
 *       console.log('Mensaje enviado!');
 *     }
 *   };
 *   
 *   return (
 *     <div>
 *       <input 
 *         value={text} 
 *         onChange={e => setText(e.target.value)}
 *         disabled={sending}
 *       />
 *       <button onClick={handleSend} disabled={sending || !text.trim()}>
 *         {sending ? 'Enviando...' : 'Enviar'}
 *       </button>
 *       {error && <span className="error">{error}</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useSendMessage({
  threadId,
  onSuccess,
  onError,
}: UseSendMessageOptions): UseSendMessageReturn {
  const { useCases } = useChatModule();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<ChatMessageDTO | null>(null);

  /**
   * Enviar un mensaje
   * @param body - Texto del mensaje
   * @param payload - Datos adicionales opcionales (para adjuntos, metadata, etc.)
   * @returns true si se envió exitosamente, false si hubo un error
   */
  const sendMessage = useCallback(
    async (body: string, payload?: Record<string, unknown> | null): Promise<boolean> => {
      // Validaciones
      if (!threadId) {
        const errorMsg = 'No hay un thread seleccionado';
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      }

      if (!body.trim()) {
        const errorMsg = 'El mensaje no puede estar vacío';
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      }

      setSending(true);
      setError(null);

      try {
        console.log('📤 Sending message:', { threadId, body: body.trim(), payload });
        
        const result = await useCases.sendMessage.execute({
          threadId,
          body: body.trim(),
          payload: payload ?? null,
        });

        console.log('📨 Send result:', result);

        if (result.isErr()) {
          const errorMsg = typeof result.error === 'object' && result.error !== null && 'message' in result.error
            ? (result.error as { message: string }).message
            : 'Error al enviar el mensaje';
          console.error('❌ Error al enviar:', errorMsg, 'Full error:', result.error);
          setError(errorMsg);
          onError?.(errorMsg);
          return false;
        }

        const sentMessage = result.value;
        console.log('✅ Message sent successfully:', sentMessage);
        setLastSentMessage(sentMessage);
        onSuccess?.(sentMessage);
        
        return true;
      } catch (err) {
        console.error('❌ Error al enviar mensaje (catch):', err);
        console.error('Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
        const errorMsg = err instanceof Error ? err.message : 'Error inesperado al enviar el mensaje';
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      } finally {
        setSending(false);
      }
    },
    [threadId, useCases, onSuccess, onError],
  );

  return {
    sendMessage,
    sending,
    error,
    lastSentMessage,
  };
}
