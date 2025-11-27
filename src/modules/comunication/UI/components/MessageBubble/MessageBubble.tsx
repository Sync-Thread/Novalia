import type { ChatMessageDTO } from '../../../application/dto/ChatMessageDTO';
import { DocumentAttachment } from '../DocumentAttachment';
import styles from './MessageBubble.module.css';

interface MessageBubbleProps {
  message: ChatMessageDTO;
  isMine: boolean;
  senderName?: string | null;
  showSender?: boolean;
}

/**
 * Componente de burbuja de mensaje individual
 * 
 * @param message - Mensaje a mostrar
 * @param isMine - Si el mensaje es del usuario actual
 * @param senderName - Nombre del remitente (para mensajes de otros)
 * @param showSender - Mostrar nombre del remitente
 */
export function MessageBubble({ message, isMine, senderName, showSender = false }: MessageBubbleProps) {
  const isSystem = message.senderType === 'system';
  const isDocument = message.payload?.type === 'document';

  if (isSystem) {
    return (
      <div className={`${styles.bubble} ${styles.bubbleSystem}`}>
        <div className={styles.content}>
          <div className={styles.messageBody}>{message.body}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.bubble} ${isMine ? styles.bubbleFromSelf : styles.bubbleFromOther}`}>
      <div className={`${styles.content} ${isMine ? styles.fromSelf : styles.fromOther}`}>
        {showSender && !isMine && senderName && (
          <div className={styles.senderName}>{senderName}</div>
        )}
        
        {isDocument ? (
          <DocumentAttachment
            fileName={message.payload.fileName as string}
            s3Key={message.payload.s3Key as string}
            documentUrl={message.payload.documentUrl as string | undefined}
            contractProperty={message.payload.contractProperty as string | undefined}
          />
        ) : (
          <div className={styles.messageBody}>{message.body}</div>
        )}
        
        <div className={styles.meta}>
          <span className={styles.timestamp}>{formatTime(message.createdAt)}</span>
          
          {isMine && (
            <span className={`${styles.status} ${getStatusClass(message.status)}`}>
              {getStatusIcon(message.status)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const timeStr = date.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
  
  if (isToday) {
    return timeStr;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  
  if (isYesterday) {
    return `Ayer ${timeStr}`;
  }
  
  return date.toLocaleDateString('es-MX', { 
    day: '2-digit', 
    month: 'short' 
  }) + ' ' + timeStr;
}

function getStatusIcon(status: ChatMessageDTO['status']): string {
  switch (status) {
    case 'sent':
      return '✓';
    case 'delivered':
      return '✓✓';
    case 'read':
      return '✓✓';
    default:
      return '';
  }
}

function getStatusClass(status: ChatMessageDTO['status']): string {
  switch (status) {
    case 'sent':
      return styles.statusSent;
    case 'delivered':
      return styles.statusDelivered;
    case 'read':
      return styles.statusRead;
    default:
      return '';
  }
}
