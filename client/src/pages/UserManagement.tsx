import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Shield, Wrench, Trash2, Loader2, Crown, Clock, CheckCircle2, XCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useTimezone } from "@/hooks/useTimezone";


const MASTER_EMAIL = "greenhproject@gmail.com";

export default function UserManagement() {
  const { formatRelative: tzFormatRelative } = useTimezone();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const currentUser = meQuery.data ?? null;
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const { data: pendingUsers, refetch: refetchPending } = trpc.users.pendingApproval.useQuery();
  const updateRole = trpc.users.updateRole.useMutation();
  const deleteUser = trpc.users.delete.useMutation();
  const approveUser = trpc.users.approveUser.useMutation();
  const rejectUser = trpc.users.rejectUser.useMutation();
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const [approveRole, setApproveRole] = useState<"admin" | "engineer" | "ingeniero_tramites" | "admin_financiero" | "client">("engineer");

  const handleRoleChange = async (
    userId: number,
    newRole: "admin" | "engineer" | "ingeniero_tramites" | "admin_financiero" | "client"
  ) => {
    setUpdatingUserId(userId);
    try {
      await updateRole.mutateAsync({ userId, role: newRole });
      toast.success("Rol actualizado exitosamente");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar rol");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      await deleteUser.mutateAsync({ userId });
      toast.success("Usuario eliminado exitosamente");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al eliminar usuario");
    }
  };

  const handleApproveUser = async (userId: number) => {
    try {
      await approveUser.mutateAsync({ userId, role: approveRole });
      toast.success("Usuario aprobado exitosamente");
      refetchPending();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al aprobar usuario");
    }
  };

  const handleRejectUser = async (userId: number) => {
    try {
      await rejectUser.mutateAsync({ userId });
      toast.success("Usuario rechazado");
      refetchPending();
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Error al rechazar usuario");
    }
  };

  const isMasterUser = (email: string | null) => {
    return email === MASTER_EMAIL;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500 dark:text-orange-400" />
      </div>
    );
  }

  const adminUsers = users?.filter(u => u.role === "admin" || u.role === "admin_financiero") || [];
  const engineerUsers = users?.filter(u => u.role === "engineer" || u.role === "ingeniero_tramites") || [];
  const clientUsers = users?.filter(u => u.role === "client") || [];
  const pendingCount = pendingUsers?.length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Gestión de Usuarios
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Administra roles y permisos de usuarios del sistema
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Usuarios</CardDescription>
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl">{users?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Administradores</CardDescription>
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl text-orange-600 dark:text-orange-400">
              {adminUsers.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ingenieros</CardDescription>
            <CardTitle className="text-xl sm:text-2xl lg:text-3xl text-blue-600 dark:text-blue-400">
              {engineerUsers.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className={pendingCount > 0 ? "border-yellow-400 dark:border-yellow-500" : ""}>
          <CardHeader className="pb-3">
            <CardDescription className="flex items-center gap-1">
              {pendingCount > 0 && <Clock className="h-3 w-3 text-yellow-500" />}
              Pendientes
            </CardDescription>
            <CardTitle className={`text-xl sm:text-2xl lg:text-3xl ${pendingCount > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
              {pendingCount}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue={pendingCount > 0 ? "pending" : "active"} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="relative">
            <Clock className="h-4 w-4 mr-1" />
            Pendientes
            {pendingCount > 0 && (
              <span className="ml-1 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="active">
            <Users className="h-4 w-4 mr-1" />
            Activos
          </TabsTrigger>
          <TabsTrigger value="clients">
            <UserPlus className="h-4 w-4 mr-1" />
            Clientes
          </TabsTrigger>
        </TabsList>

        {/* TAB: Usuarios Pendientes */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          {pendingCount === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-300 dark:text-green-600" />
                <p className="font-medium">No hay usuarios pendientes de aprobación</p>
                <p className="text-sm mt-1">Todos los registros han sido procesados</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {pendingUsers?.map(user => (
                <Card key={user.id} className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-white font-bold text-lg">
                          {user.name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{user.name || "Sin nombre"}</CardTitle>
                          <CardDescription>{user.email}</CardDescription>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Registrado {user.createdAt ? formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: es }) : "recientemente"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-16 sm:ml-0">
                        <Select
                          value={approveRole}
                          onValueChange={(v) => setApproveRole(v as any)}
                        >
                          <SelectTrigger className="w-[150px]">
                            <SelectValue placeholder="Rol" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="engineer">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Ingeniero
                              </div>
                            </SelectItem>
                            <SelectItem value="ingeniero_tramites">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Ing. Trámites
                              </div>
                            </SelectItem>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="admin_financiero">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin Financiero
                              </div>
                            </SelectItem>
                            <SelectItem value="client">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Cliente
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleApproveUser(user.id)}
                          disabled={approveUser.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="destructive">
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Rechazar usuario?</AlertDialogTitle>
                              <AlertDialogDescription>
                                El usuario {user.name} ({user.email}) no podrá acceder al sistema.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRejectUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Rechazar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* TAB: Usuarios Activos */}
        <TabsContent value="active" className="space-y-6 mt-4">

      {/* Administradores */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-500 dark:text-orange-400" />
          Administradores ({adminUsers.length})
        </h2>

        <div className="grid gap-4">
          {adminUsers.map(user => {
            const isMaster = isMasterUser(user.email);
            const isCurrentUser = currentUser?.id === user.id;

            return (
              <Card
                key={user.id}
                className={isMaster ? "border-2 border-orange-500" : ""}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-lg">
                        {user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">
                            {user.name || "Sin nombre"}
                          </CardTitle>
                          {isMaster && (
                            <Badge className="bg-gradient-to-r from-orange-500 to-amber-500 gap-1">
                              <Crown className="h-3 w-3" />
                              Usuario Maestro
                            </Badge>
                          )}
                          {isCurrentUser && <Badge variant="outline">Tú</Badge>}
                        </div>
                        <CardDescription className="mt-1">
                          {user.email}
                        </CardDescription>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          <span>
                            Último acceso:{" "}
                            {tzFormatRelative(user.lastSignedIn)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!isMaster && (
                        <>
                          <Select
                            value={user.role}
                            onValueChange={value =>
                              handleRoleChange(
                                user.id,
                                value as "admin" | "engineer" | "ingeniero_tramites" | "admin_financiero" | "client"
                              )
                            }
                            disabled={updatingUserId === user.id}
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="admin_financiero">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin Financiero
                                </div>
                              </SelectItem>
                              <SelectItem value="engineer">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Ingeniero
                                </div>
                              </SelectItem>
                              <SelectItem value="ingeniero_tramites">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Ing. Trámites
                                </div>
                              </SelectItem>
                              <SelectItem value="client">
                                <div className="flex items-center gap-2">
                                  <UserPlus className="h-4 w-4" />
                                  Cliente
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:text-red-400 hover:bg-red-50 dark:bg-red-900/20"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  ¿Eliminar usuario?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción no se puede deshacer. Se eliminará
                                  permanentemente el usuario {user.name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteUser(user.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                      {isMaster && (
                        <Badge variant="outline" className="text-gray-500 dark:text-gray-400 dark:text-gray-500">
                          Protegido
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Ingenieros */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-500" />
          Ingenieros ({engineerUsers.length})
        </h2>

        {engineerUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>No hay ingenieros registrados</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {engineerUsers.map(user => {
              const isCurrentUser = currentUser?.id === user.id;

              return (
                <Card key={user.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-indigo-400 flex items-center justify-center text-white font-bold text-lg">
                          {user.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">
                              {user.name || "Sin nombre"}
                            </CardTitle>
                            {isCurrentUser && (
                              <Badge variant="outline">Tú</Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {user.email}
                          </CardDescription>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                            <span>
                              Último acceso:{" "}
                              {tzFormatRelative(user.lastSignedIn)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Select
                          value={user.role}
                          onValueChange={value =>
                            handleRoleChange(
                              user.id,
                              value as "admin" | "engineer" | "ingeniero_tramites" | "admin_financiero" | "client"
                            )
                          }
                          disabled={updatingUserId === user.id}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="admin_financiero">
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                Admin Financiero
                              </div>
                            </SelectItem>
                            <SelectItem value="engineer">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Ingeniero
                              </div>
                            </SelectItem>
                            <SelectItem value="ingeniero_tramites">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Ing. Trámites
                              </div>
                            </SelectItem>
                            <SelectItem value="client">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-4 w-4" />
                                Cliente
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar usuario?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará
                                permanentemente el usuario {user.name}.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        )}
      </div>
        </TabsContent>

        {/* TAB: Clientes */}
        <TabsContent value="clients" className="space-y-4 mt-4">
          {clientUsers.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500 dark:text-gray-400">
                <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                <p className="font-medium">No hay clientes registrados</p>
                <p className="text-sm mt-1">Los clientes se crean automáticamente vía SSO o pueden ser aprobados manualmente</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {clientUsers.map(user => (
                <Card key={user.id}>
                  <CardHeader className="p-4">
                    <div className="flex flex-col gap-3">
                      {/* Fila superior: Avatar + Info + Delete */}
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-green-400 to-emerald-400 flex items-center justify-center text-white font-bold text-sm">
                          {user.name?.charAt(0).toUpperCase() || "C"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {user.name || "Sin nombre"}
                          </CardTitle>
                          <CardDescription className="mt-0.5 text-xs truncate">
                            {user.email}
                          </CardDescription>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Último acceso: {tzFormatRelative(user.lastSignedIn)}
                          </p>
                        </div>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                ¿Eliminar cliente?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará el usuario {user.name} y su acceso a todos los proyectos asignados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      {/* Fila inferior: Selector de rol */}
                      <div className="flex items-center gap-2 pl-13">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Rol:</span>
                        <Select
                          value={user.role}
                          onValueChange={value =>
                            handleRoleChange(
                              user.id,
                              value as "admin" | "engineer" | "ingeniero_tramites" | "admin_financiero" | "client"
                            )
                          }
                          disabled={updatingUserId === user.id}
                        >
                          <SelectTrigger className="w-[130px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5" />
                                Admin
                              </div>
                            </SelectItem>
                            <SelectItem value="admin_financiero">
                              <div className="flex items-center gap-2">
                                <Shield className="h-3.5 w-3.5" />
                                Admin Fin.
                              </div>
                            </SelectItem>
                            <SelectItem value="engineer">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-3.5 w-3.5" />
                                Ingeniero
                              </div>
                            </SelectItem>
                            <SelectItem value="ingeniero_tramites">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-3.5 w-3.5" />
                                Ing. Trámites
                              </div>
                            </SelectItem>
                            <SelectItem value="client">
                              <div className="flex items-center gap-2">
                                <UserPlus className="h-3.5 w-3.5" />
                                Cliente
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
