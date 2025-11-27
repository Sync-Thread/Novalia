import { useNavigate } from 'react-router-dom';
import type { ChatNotification } from '../../hooks/useChatNotifications';
import styles from './ChatNotificationsDropdown.module.css';

interface ChatNotificationsDropdownProps {
  notifications: ChatNotification[];
  loading: boolean;
  onClose: () => void;
  onNotificationClick?: (notification: ChatNotification) => void;
}

export function ChatNotificationsDropdown({
  notifications,
  loading,
  onClose,
  onNotificationClick,
}: ChatNotificationsDropdownProps) {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: ChatNotification) => {
    onNotificationClick?.(notification);
    onClose();
    // Navegar a la página de chats
    navigate('/chats');
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `Hace ${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `Hace ${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Ayer';
    if (diffInDays < 7) return `Hace ${diffInDays}d`;
    
    return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
  };

  const truncateMessage = (message: string | null, maxLength = 50) => {
    if (!message) return '';
    return message.length > maxLength ? `${message.substring(0, maxLength)}...` : message;
  };

  return (
    <div className={styles.dropdown}>
      <div className={styles.header}>
        <h3 className={styles.title}>Notificaciones</h3>
      </div>

      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            <p>Cargando notificaciones...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className={styles.empty}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              className={styles.emptyIcon}
            >
              <path
                d="M12 4.25A4.75 4.75 0 0 1 16.75 9v1.18c0 .68.21 1.34.61 1.89l1.09 1.54c.75 1.06.04 2.54-1.29 2.54H6.84c-1.33 0-2.04-1.48-1.29-2.54l1.09-1.54c.4-.55.61-1.21.61-1.89V9A4.75 4.75 0 0 1 12 4.25Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M9.5 16.15v.1a2.5 2.5 0 0 0 5 0v-.1"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className={styles.emptyText}>No tienes notificaciones nuevas</p>
            <p className={styles.emptySubtext}>Te notificaremos cuando recibas nuevos mensajes</p>
          </div>
        ) : (
          <div className={styles.list}>
            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                className={styles.notificationItem}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className={styles.notificationIcon}>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
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
                <div className={styles.notificationContent}>
                  <div className={styles.notificationHeader}>
                    <span className={styles.senderName}>{notification.senderName}</span>
                    <span className={styles.timestamp}>{formatTime(notification.timestamp)}</span>
                  </div>
                  <div className={styles.propertyTitle}>{notification.propertyTitle}</div>
                  <div className={styles.messagePreview}>
                    {truncateMessage(notification.lastMessage)}
                  </div>
                </div>
                {notification.unreadCount > 0 && (
                  <div className={styles.unreadBadge}>
                    {notification.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 0 && (
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.viewAllButton}
            onClick={() => {
              onClose();
              navigate('/chats');
            }}
          >
            Ver todos los mensajes
          </button>
        </div>
      )}
    </div>
  );
}
