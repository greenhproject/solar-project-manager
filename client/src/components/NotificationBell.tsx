import { useState } from "react";
import { Bell } from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const utils = trpc.useUtils();

  // Obtener notificaciones no leídas
  const { data: notifications = [] } = trpc.notifications.getUserNotifications.useQuery(
    { limit: 10, unreadOnly: false },
    { refetchInterval: 30000 } // Actualizar cada 30 segundos
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUserNotifications.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.getUserNotifications.invalidate();
    },
  });

  const deleteMutation = trpc.notifications.delete.useMutation({
    onSuccess: () => {
      utils.notifications.getUserNotifications.invalidate();
    },
  });

  const handleNotificationClick = (id: number, isRead: boolean) => {
    if (!isRead) {
      markAsReadMutation.mutate({ id });
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "milestone_due_soon":
        return "⏰";
      case "milestone_overdue":
        return "⚠️";
      case "project_completed":
        return "🎉";
      case "project_assigned":
        return "📋";
      case "project_updated":
        return "🔄";
      case "milestone_reminder":
        return "🔔";
      default:
        return "📢";
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="flex items-center justify-between px-2 py-2">
          <h3 className="font-semibold text-sm">Notificaciones</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Marcar todas como leídas
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No tienes notificaciones
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`flex flex-col items-start gap-1 p-3 cursor-pointer ${
                !notification.isRead ? "bg-accent/50" : ""
              }`}
              onClick={() => handleNotificationClick(notification.id, notification.isRead)}
            >
              <div className="flex items-start gap-2 w-full">
                <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.sentAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="h-2 w-2 rounded-full bg-orange-500 flex-shrink-0 mt-1" />
                )}
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
