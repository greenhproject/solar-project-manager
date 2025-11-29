import axios from "axios";

/**
 * Cliente para integración con OpenSolar API
 *
 * NOTA: Para producción, se recomienda configurar las credenciales de OpenSolar
 * como variables de entorno secretas a través del panel de configuración.
 *
 * Alternativamente, puede desplegarse un backend Flask separado en Render/Railway
 * que maneje la autenticación con OpenSolar y actúe como proxy.
 */

interface OpenSolarConfig {
  apiUrl?: string;
  apiKey?: string;
  organizationId?: string;
}

interface OpenSolarProject {
  id: string;
  name: string;
  status: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  // Agregar más campos según la documentación de OpenSolar
}

interface SyncResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

export class OpenSolarClient {
  private apiUrl: string;
  private apiKey: string;
  private organizationId: string;

  constructor(config: OpenSolarConfig = {}) {
    // Configuración desde variables de entorno o parámetros
    this.apiUrl =
      config.apiUrl ||
      process.env.OPENSOLAR_API_URL ||
      "https://api.opensolar.com/v1";
    this.apiKey = config.apiKey || process.env.OPENSOLAR_API_KEY || "";
    this.organizationId =
      config.organizationId || process.env.OPENSOLAR_ORG_ID || "";

    if (!this.apiKey) {
      console.warn(
        "[OpenSolar] API Key no configurada. La sincronización no funcionará."
      );
    }
  }

  /**
   * Verifica si el cliente está configurado correctamente
   */
  isConfigured(): boolean {
    return Boolean(this.apiKey && this.organizationId);
  }

  /**
   * Obtiene un proyecto de OpenSolar por su ID
   */
  async getProject(projectId: string): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Cliente de OpenSolar no configurado",
        error: "Faltan credenciales de API",
      };
    }

    try {
      const response = await axios.get(`${this.apiUrl}/projects/${projectId}`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return {
        success: true,
        message: "Proyecto obtenido exitosamente",
        data: response.data,
      };
    } catch (error: any) {
      console.error("[OpenSolar] Error al obtener proyecto:", error.message);
      return {
        success: false,
        message: "Error al obtener proyecto de OpenSolar",
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Lista todos los proyectos de la organización
   */
  async listProjects(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Cliente de OpenSolar no configurado",
        error: "Faltan credenciales de API",
      };
    }

    try {
      const response = await axios.get(
        `${this.apiUrl}/organizations/${this.organizationId}/projects`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        message: "Proyectos listados exitosamente",
        data: response.data,
      };
    } catch (error: any) {
      console.error("[OpenSolar] Error al listar proyectos:", error.message);
      return {
        success: false,
        message: "Error al listar proyectos de OpenSolar",
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Sincroniza datos de un proyecto desde OpenSolar
   * Retorna los datos del proyecto que pueden ser usados para actualizar la base de datos local
   */
  async syncProjectFromOpenSolar(openSolarId: string): Promise<SyncResult> {
    const result = await this.getProject(openSolarId);

    if (!result.success) {
      return result;
    }

    // Transformar datos de OpenSolar al formato de nuestra aplicación
    const openSolarProject = result.data as OpenSolarProject;

    const transformedData = {
      name: openSolarProject.name,
      location: openSolarProject.address,
      // Mapear más campos según sea necesario
      syncedAt: new Date(),
    };

    return {
      success: true,
      message: "Datos sincronizados exitosamente",
      data: transformedData,
    };
  }

  /**
   * Crea un proyecto en OpenSolar
   */
  async createProject(projectData: {
    name: string;
    address?: string;
    [key: string]: any;
  }): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Cliente de OpenSolar no configurado",
        error: "Faltan credenciales de API",
      };
    }

    try {
      const response = await axios.post(
        `${this.apiUrl}/organizations/${this.organizationId}/projects`,
        projectData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        message: "Proyecto creado en OpenSolar",
        data: response.data,
      };
    } catch (error: any) {
      console.error("[OpenSolar] Error al crear proyecto:", error.message);
      return {
        success: false,
        message: "Error al crear proyecto en OpenSolar",
        error: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Actualiza un proyecto en OpenSolar
   */
  async updateProject(
    projectId: string,
    updates: Record<string, any>
  ): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        message: "Cliente de OpenSolar no configurado",
        error: "Faltan credenciales de API",
      };
    }

    try {
      const response = await axios.patch(
        `${this.apiUrl}/projects/${projectId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      return {
        success: true,
        message: "Proyecto actualizado en OpenSolar",
        data: response.data,
      };
    } catch (error: any) {
      console.error("[OpenSolar] Error al actualizar proyecto:", error.message);
      return {
        success: false,
        message: "Error al actualizar proyecto en OpenSolar",
        error: error.response?.data?.message || error.message,
      };
    }
  }
}

// Instancia singleton del cliente
let openSolarClient: OpenSolarClient | null = null;

/**
 * Obtiene la instancia del cliente de OpenSolar
 */
export function getOpenSolarClient(): OpenSolarClient {
  if (!openSolarClient) {
    openSolarClient = new OpenSolarClient();
  }
  return openSolarClient;
}

/**
 * Verifica el estado de la conexión con OpenSolar
 */
export async function checkOpenSolarConnection(): Promise<SyncResult> {
  const client = getOpenSolarClient();

  if (!client.isConfigured()) {
    return {
      success: false,
      message: "OpenSolar no está configurado",
      error:
        "Faltan credenciales de API. Configure OPENSOLAR_API_KEY y OPENSOLAR_ORG_ID.",
    };
  }

  // Intentar listar proyectos como test de conexión
  return await client.listProjects();
}
