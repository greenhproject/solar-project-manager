import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  GanttChartSquare,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
// useAuth0Custom removed - using Manus OAuth
import { NotificationBell } from "./NotificationBell";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      toast.success("Sesión cerrada exitosamente");
      window.location.href = "/login";
    } catch (error) {
      toast.error("Error al cerrar sesión");
    }
  };

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      href: "/dashboard",
      roles: ["admin", "engineer"],
    },
    {
      icon: FolderKanban,
      label: "Proyectos",
      href: "/projects",
      roles: ["admin", "engineer"],
    },
    {
      icon: BarChart3,
      label: "Análisis",
      href: "/analytics",
      roles: ["admin", "engineer"],
    },
    {
      icon: TrendingUp,
      label: "Análisis Avanzado",
      href: "/advanced-analytics",
      roles: ["admin", "engineer"],
    },
    {
      icon: GanttChartSquare,
      label: "Diagrama de Gantt",
      href: "/gantt",
      roles: ["admin", "engineer"],
    },
    {
      icon: Calendar,
      label: "Calendario",
      href: "/calendar",
      roles: ["admin", "engineer"],
    },
    {
      icon: Bell,
      label: "Recordatorios",
      href: "/reminders",
      roles: ["admin", "engineer"],
    },
    {
      icon: Bell,
      label: "Notificaciones",
      href: "/notifications",
      roles: ["admin", "engineer"],
    },
    {
      icon: Sparkles,
      label: "Asistente IA",
      href: "/ai-assistant",
      roles: ["admin", "engineer"],
    },
    {
      icon: Users,
      label: "Gestión de Usuarios",
      href: "/users",
      roles: ["admin"],
    },
    {
      icon: Settings,
      label: "Configuración",
      href: "/settings",
      roles: ["admin"],
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    user?.role ? item.roles.includes(user.role) : false
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-gradient-to-b from-white to-orange-50/30 border-r border-orange-100">
      {/* Header */}
      <div
        className={cn("p-6 border-b border-orange-100", isCollapsed && "p-4")}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-apple flex-shrink-0">
            <Sun className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent truncate">
                Solar Manager
              </h2>
              <p className="text-xs text-gray-500 truncate">GreenH Project</p>
            </div>
          )}
          {isAuthenticated && <NotificationBell />}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden flex-shrink-0"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* User Info */}
      {isAuthenticated && user && !isCollapsed && (
        <div className="p-4 border-b border-orange-100">
          <button
            onClick={() => navigate("/profile")}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-orange-100/50 hover:shadow-md hover:border-orange-200 transition-all cursor-pointer"
          >
            <Avatar className="h-10 w-10 border-2 border-orange-200 flex-shrink-0">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-400 text-white font-semibold">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0 text-left">
              <p className="font-semibold text-sm text-gray-900 truncate">
                {user.name || "Usuario"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <span
                className={cn(
                  "inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium",
                  user.role === "admin"
                    ? "bg-orange-100 text-orange-700"
                    : "bg-blue-100 text-blue-700"
                )}
              >
                {user.role === "admin" ? "Admin" : "Ingeniero"}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Collapsed User Avatar */}
      {isAuthenticated && user && isCollapsed && (
        <div className="p-4 border-b border-orange-100 flex justify-center">
          <button
            onClick={() => navigate("/profile")}
            className="hover:opacity-80 transition-opacity"
            title="Ver perfil"
          >
            <Avatar className="h-10 w-10 border-2 border-orange-200">
              <AvatarImage src={user.avatarUrl || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-orange-400 to-amber-400 text-white font-semibold">
                {user.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </button>
        </div>
      )}

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 p-4 space-y-1 overflow-y-auto",
          isCollapsed && "p-2"
        )}
      >
        {filteredMenuItems.map(item => {
          const Icon = item.icon;
          const isActive =
            location === item.href || location.startsWith(item.href + "/");

          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group cursor-pointer",
                  isActive
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-apple"
                    : "text-gray-700 hover:bg-orange-50 hover:text-orange-600",
                  isCollapsed && "justify-center px-2"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-transform group-hover:scale-110 flex-shrink-0",
                    isActive
                      ? "text-white"
                      : "text-gray-500 group-hover:text-orange-500"
                  )}
                />
                {!isCollapsed && (
                  <>
                    <span className="font-medium text-sm flex-1">
                      {item.label}
                    </span>
                    {isActive && (
                      <ChevronRight className="h-4 w-4 text-white" />
                    )}
                  </>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className={cn(
          "p-4 border-t border-orange-100 space-y-2",
          isCollapsed && "p-2"
        )}
      >
        <Separator className="mb-2" />
        <Button
          variant="ghost"
          className={cn(
            "w-full gap-3 text-gray-700 hover:text-red-600 hover:bg-red-50",
            isCollapsed && "justify-center px-2"
          )}
          onClick={handleLogout}
          title={isCollapsed ? "Cerrar Sesión" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          {!isCollapsed && <span className="font-medium">Cerrar Sesión</span>}
        </Button>
        {!isCollapsed && (
          <p className="text-xs text-center text-gray-400 pt-2">
            v2.0.0 • GreenH Project
          </p>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 lg:hidden bg-white shadow-apple border border-orange-100"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5 text-orange-600" />
      </Button>

      {/* Desktop Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden lg:flex fixed top-4 left-4 z-50 bg-white shadow-apple border border-orange-100"
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{ left: isCollapsed ? "4.5rem" : "17rem" }}
      >
        {isCollapsed ? (
          <ChevronRight className="h-5 w-5 text-orange-600" />
        ) : (
          <ChevronLeft className="h-5 w-5 text-orange-600" />
        )}
      </Button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar - Desktop */}
      <aside
        className={cn(
          "hidden lg:flex lg:flex-col h-screen sticky top-0 transition-all duration-300",
          isCollapsed ? "lg:w-20" : "lg:w-72",
          className
        )}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar - Mobile */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
