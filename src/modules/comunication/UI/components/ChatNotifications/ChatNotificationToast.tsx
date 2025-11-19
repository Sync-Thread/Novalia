import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ChatNotification } from '../../hooks/useChatNotifications';
import styles from './ChatNotificationToast.module.css';

interface ChatNotificationToastProps {
  notification: ChatNotification | null;
  onClose: () => void;
  duration?: number;
}

export function ChatNotificationToast({
  notification,
  onClose,
  duration = 5000,
}: ChatNotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Esperar a que termine la animación
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [notification, duration, onClose]);

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
      navigate('/chats');
    }, 300);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  if (!notification) return null;

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-MX', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const truncateMessage = (message: string | null, maxLength = 60) => {
    if (!message) return '';
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  };

  return (
    <div className={`${styles.container} ${isVisible ? styles.visible : styles.hidden}`}>
      <button
        type="button"
        className={styles.toast}
        onClick={handleClick}
      >
        <div className={styles.iconContainer}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className={styles.icon}
          >
            <path
              d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Zm0 0 8 6 8-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className={styles.content}>
          <div className={styles.header}>
            <span className={styles.sender}>{notification.senderName}</span>
            <span className={styles.time}>{formatTime(notification.timestamp)}</span>
          </div>
          <div className={styles.property}>{notification.propertyTitle}</div>
          <div className={styles.message}>
            {truncateMessage(notification.lastMessage)}
          </div>
        </div>

        <button
          type="button"
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="Cerrar notificación"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="m7 7 10 10M17 7 7 17"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </button>
    </div>
  );
}
