import { useState, useCallback } from 'react';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  timestamp: number;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  dismissNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

export const useNotifications = (): UseNotificationsReturn => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: Notification['type']) => {
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    
    const newNotification: Notification = {
      id,
      message,
      type,
      timestamp
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      dismissNotification(id);
    }, 5000);

    return id;
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((message: string) => {
    addNotification(message, 'success');
  }, [addNotification]);

  const showError = useCallback((message: string) => {
    addNotification(message, 'error');
  }, [addNotification]);

  const showWarning = useCallback((message: string) => {
    addNotification(message, 'warning');
  }, [addNotification]);

  const showInfo = useCallback((message: string) => {
    addNotification(message, 'info');
  }, [addNotification]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    dismissNotification,
    clearAllNotifications
  };
};