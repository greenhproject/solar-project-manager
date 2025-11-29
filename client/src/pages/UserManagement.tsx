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
import { Users, Shield, Wrench, Trash2, Loader2, Crown } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "@/_core/hooks/useAuth";

const MASTER_EMAIL = "greenhproject@gmail.com";

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, refetch } = trpc.users.list.useQuery();
  const updateRole = trpc.users.updateRole.useMutation();
  const deleteUser = trpc.users.delete.useMutation();
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);

  const handleRoleChange = async (
    userId: number,
    newRole: "admin" | "engineer"
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

  const isMasterUser = (email: string | null) => {
    return email === MASTER_EMAIL;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const adminUsers = users?.filter(u => u.role === "admin") || [];
  const engineerUsers = users?.filter(u => u.role === "engineer") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Gestión de Usuarios
        </h1>
        <p className="text-gray-600 mt-2">
          Administra roles y permisos de usuarios del sistema
        </p>
      </div>

      {/* Estadísticas */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Usuarios</CardDescription>
            <CardTitle className="text-3xl">{users?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Administradores</CardDescription>
            <CardTitle className="text-3xl text-orange-600">
              {adminUsers.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Ingenieros</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {engineerUsers.length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Administradores */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-orange-500" />
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
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span>
                            Último acceso:{" "}
                            {formatDistanceToNow(new Date(user.lastSignedIn), {
                              addSuffix: true,
                              locale: es,
                            })}
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
                                value as "admin" | "engineer"
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
                              <SelectItem value="engineer">
                                <div className="flex items-center gap-2">
                                  <Wrench className="h-4 w-4" />
                                  Ingeniero
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                        <Badge variant="outline" className="text-gray-500">
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
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Wrench className="h-5 w-5 text-blue-500" />
          Ingenieros ({engineerUsers.length})
        </h2>

        {engineerUsers.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>
                              Último acceso:{" "}
                              {formatDistanceToNow(
                                new Date(user.lastSignedIn),
                                { addSuffix: true, locale: es }
                              )}
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
                              value as "admin" | "engineer"
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
                            <SelectItem value="engineer">
                              <div className="flex items-center gap-2">
                                <Wrench className="h-4 w-4" />
                                Ingeniero
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    </div>
  );
}
