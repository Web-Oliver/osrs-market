import React from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export interface NotificationToastProps {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  onDismiss: (id: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  id,
  message,
  type,
  onDismiss
}) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          containerClasses: 'bg-green-50 border-green-200 text-green-800',
          iconClasses: 'text-green-600',
          Icon: CheckCircle
        };
      case 'error':
        return {
          containerClasses: 'bg-red-50 border-red-200 text-red-800',
          iconClasses: 'text-red-600',
          Icon: XCircle
        };
      case 'warning':
        return {
          containerClasses: 'bg-yellow-50 border-yellow-200 text-yellow-800',
          iconClasses: 'text-yellow-600',
          Icon: AlertTriangle
        };
      case 'info':
        return {
          containerClasses: 'bg-blue-50 border-blue-200 text-blue-800',
          iconClasses: 'text-blue-600',
          Icon: Info
        };
      default:
        return {
          containerClasses: 'bg-gray-50 border-gray-200 text-gray-800',
          iconClasses: 'text-gray-600',
          Icon: Info
        };
    }
  };

  const { containerClasses, iconClasses, Icon } = getTypeStyles();

  const handleDismiss = () => {
    onDismiss(id);
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't dismiss when clicking on the close button
    if (e.target === e.currentTarget) {
      handleDismiss();
    }
  };

  return (
    <div
      className={`relative flex items-center gap-3 p-4 m-2 rounded-lg shadow-lg border bg-opacity-90 backdrop-blur-sm cursor-pointer transition-all duration-300 ease-in-out transform animate-in slide-in-from-right-5 ${containerClasses}`}
      onClick={handleClick}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <Icon className={`h-5 w-5 flex-shrink-0 ${iconClasses}`} />
      
      <div className="flex-1 text-sm font-medium">
        {message}
      </div>
      
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-black/10 transition-colors duration-200"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};