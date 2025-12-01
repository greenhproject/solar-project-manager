/**
 * Cliente para la API de OpenSolar
 * 
 * Autenticación: Usa email/contraseña para obtener tokens Bearer
 * Los tokens expiran cada 7 días y se renuevan automáticamente
 */

import { ENV } from './env';

const OPENSOLAR_API_URL = 'https://api.opensolar.com';
const TOKEN_REFRESH_DAYS = 6; // Renovar 1 día antes de expirar

interface OpenSolarAuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

interface OpenSolarProject {
  id: number;
  title: string;
  address: string;
  created_date: string;
  contacts_data?: Array<{
    id: number;
    display?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  }>;
  project_type?: string;
  status?: string;
}

interface OpenSolarProjectsResponse {
  count: number;
  results: OpenSolarProject[];
}

interface OpenSolarModule {
  module_activation_id: number;
  code: string;
  manufacturer_name: string;
  quantity: number;
}

interface OpenSolarInverter {
  inverter_activation_id: number;
  code: string;
  manufacturer_name: string;
  quantity: number;
}

interface OpenSolarBattery {
  battery_activation_id: number;
  code: string;
  manufacturer_name: string;
  quantity: number;
  total_kwh?: number;
}

interface OpenSolarSystem {
  id: number;
  name: string;
  kw_stc: number;
  module_quantity: number;
  battery_total_kwh: number;
  output_annual_kwh: number;
  consumption_offset_percentage: number;
  is_current: boolean;
  modules: OpenSolarModule[];
  inverters: OpenSolarInverter[];
  batteries: OpenSolarBattery[];
  others: any[];
  project: string;
}

/**
 * Cliente singleton para OpenSolar API
 */
class OpenSolarClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  /**
   * Autentica con OpenSolar y obtiene un token Bearer
   */
  private async authenticate(): Promise<string> {
    if (!ENV.openSolarEmail || !ENV.openSolarPassword) {
      throw new Error('OPENSOLAR_EMAIL y OPENSOLAR_PASSWORD deben estar configurados');
    }

    const response = await fetch(`${OPENSOLAR_API_URL}/api-token-auth/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: ENV.openSolarEmail,
        password: ENV.openSolarPassword,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Autenticación OpenSolar falló (${response.status}): ${errorText}`);
    }

    const data: OpenSolarAuthResponse = await response.json();
    
    // Guardar token y fecha de expiración
    this.token = data.token;
    this.tokenExpiry = new Date();
    this.tokenExpiry.setDate(this.tokenExpiry.getDate() + TOKEN_REFRESH_DAYS);

    console.log(`[OpenSolar] Token obtenido exitosamente para ${data.user.email}`);
    return this.token;
  }

  /**
   * Obtiene un token válido (autentica si es necesario)
   */
  private async getValidToken(): Promise<string> {
    const now = new Date();
    
    // Si no hay token o está expirado, autenticar
    if (!this.token || !this.tokenExpiry || now >= this.tokenExpiry) {
      console.log('[OpenSolar] Token expirado o no disponible, autenticando...');
      return await this.authenticate();
    }

    return this.token;
  }

  /**
   * Hace una petición a la API de OpenSolar con manejo automático de tokens
   */
  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getValidToken();

    const response = await fetch(`${OPENSOLAR_API_URL}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // Si el token expiró (401), renovar y reintentar una vez
    if (response.status === 401) {
      console.log('[OpenSolar] Token expirado (401), renovando...');
      this.token = null; // Forzar renovación
      const newToken = await this.getValidToken();

      const retryResponse = await fetch(`${OPENSOLAR_API_URL}${endpoint}`, {
        ...options,
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!retryResponse.ok) {
        const errorText = await retryResponse.text();
        throw new Error(`OpenSolar API error (${retryResponse.status}): ${errorText}`);
      }

      return await retryResponse.json();
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenSolar API error (${response.status}): ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Obtiene la lista de proyectos de la organización
   */
  async getProjects(limit = 100): Promise<OpenSolarProject[]> {
    if (!ENV.openSolarOrgId) {
      console.error('[OpenSolar] OPENSOLAR_ORG_ID no configurado');
      throw new Error('OPENSOLAR_ORG_ID no configurado. Necesitas el ID de tu organización.');
    }

    try {
      console.log(`[OpenSolar] Obteniendo proyectos de org ${ENV.openSolarOrgId}`);
      const data = await this.makeRequest<any>(
        `/api/orgs/${ENV.openSolarOrgId}/projects/?limit=${limit}`
      );
      console.log('[OpenSolar] Respuesta de API:', JSON.stringify(data).substring(0, 200));
      
      // La API puede retornar { results: [...] } o directamente un array
      const projects = Array.isArray(data) ? data : (data.results || []);
      console.log(`[OpenSolar] Obtenidos ${projects.length} proyectos`);
      return projects;
    } catch (error: any) {
      console.error('[OpenSolar] Error al obtener proyectos:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene los sistemas (diseños) de un proyecto específico
   */
  async getSystems(projectId: string): Promise<OpenSolarSystem[]> {
    if (!ENV.openSolarOrgId) {
      throw new Error('OPENSOLAR_ORG_ID no configurado');
    }

    try {
      console.log(`[OpenSolar] Obteniendo sistemas del proyecto ${projectId}`);
      const data = await this.makeRequest<any>(
        `/api/orgs/${ENV.openSolarOrgId}/systems/?fieldset=list&project=${projectId}`
      );
      
      // La API puede retornar un array directamente o { results: [...] }
      const systems = Array.isArray(data) ? data : (data.results || []);
      console.log(`[OpenSolar] Obtenidos ${systems.length} sistemas para proyecto ${projectId}`);
      
      if (systems.length > 0) {
        console.log(`[OpenSolar] Sistema principal: ${systems[0].kw_stc} kW, ${systems[0].modules?.length || 0} tipos de paneles`);
      }
      
      return systems;
    } catch (error: any) {
      console.error(`[OpenSolar] Error al obtener sistemas del proyecto ${projectId}:`, error.message);
      // No lanzar error, retornar array vacío para que la sincronización continúe
      return [];
    }
  }

  /**
   * Obtiene un proyecto específico por ID
   * Nota: OpenSolar no tiene endpoint directo para obtener proyecto por ID,
   * entonces buscamos en la lista de proyectos de la organización
   */
  async getProjectById(projectId: string): Promise<OpenSolarProject> {
    try {
      console.log(`[OpenSolar] Buscando proyecto con ID: ${projectId}`);
      
      // Obtener todos los proyectos de la organización
      const projects = await this.getProjects();
      
      // Buscar el proyecto por ID
      const project = projects.find(p => p.id.toString() === projectId.toString());
      
      if (!project) {
        throw new Error(`Proyecto con ID ${projectId} no encontrado en la organización`);
      }
      
      console.log(`[OpenSolar] Proyecto encontrado: ${project.title}`);
      return project;
    } catch (error: any) {
      console.error(`[OpenSolar] Error al obtener proyecto ${projectId}:`, error.message);
      throw error;
    }
  }

  /**
   * Construye una descripción detallada con los equipos del sistema
   */
  private buildEquipmentDescription(systems: OpenSolarSystem[]): string {
    if (!systems || systems.length === 0) {
      return '';
    }

    // Usar el sistema actual o el primero disponible
    const system = systems.find(s => s.is_current) || systems[0];
    
    let description = `Sistema Solar:\n`;
    description += `- Capacidad: ${system.kw_stc} kW\n`;
    description += `- Producción anual estimada: ${system.output_annual_kwh.toLocaleString()} kWh\n`;
    
    if (system.consumption_offset_percentage > 0) {
      description += `- Compensación de consumo: ${system.consumption_offset_percentage}%\n`;
    }

    // Paneles solares
    if (system.modules && system.modules.length > 0) {
      description += `\nPaneles Solares:\n`;
      system.modules.forEach(module => {
        description += `- ${module.quantity}x ${module.manufacturer_name} ${module.code}\n`;
      });
    }

    // Inversores
    if (system.inverters && system.inverters.length > 0) {
      description += `\nInversores:\n`;
      system.inverters.forEach(inv => {
        description += `- ${inv.quantity}x ${inv.manufacturer_name} ${inv.code}\n`;
      });
    }

    // Baterías
    if (system.batteries && system.batteries.length > 0) {
      description += `\nBaterías:\n`;
      system.batteries.forEach(bat => {
        const capacity = bat.total_kwh ? ` (${bat.total_kwh} kWh)` : '';
        description += `- ${bat.quantity}x ${bat.manufacturer_name} ${bat.code}${capacity}\n`;
      });
    }

    if (system.battery_total_kwh > 0 && (!system.batteries || system.batteries.length === 0)) {
      description += `\nCapacidad total de baterías: ${system.battery_total_kwh} kWh\n`;
    }

    return description;
  }

  /**
   * Mapea un proyecto de OpenSolar al formato del formulario
   * Incluye información de equipos si están disponibles
   */
  async mapProjectToFormWithEquipment(project: OpenSolarProject) {
    const primaryContact = project.contacts_data?.[0];

    // Obtener sistemas (diseños) del proyecto
    const systems = await this.getSystems(project.id.toString());
    const equipmentDescription = this.buildEquipmentDescription(systems);

    return {
      name: project.title || 'Proyecto sin nombre',
      location: project.address || '',
      clientName: primaryContact?.display || primaryContact?.first_name || '',
      clientEmail: primaryContact?.email || '',
      clientPhone: primaryContact?.phone || '',
      description: equipmentDescription || `Proyecto importado desde OpenSolar (ID: ${project.id})`,
      startDate: project.created_date ? new Date(project.created_date) : new Date(),
    };
  }

  /**
   * Mapea un proyecto de OpenSolar al formato del formulario (versión síncrona, sin equipos)
   * @deprecated Usar mapProjectToFormWithEquipment para incluir información de equipos
   */
  mapProjectToForm(project: OpenSolarProject) {
    const primaryContact = project.contacts_data?.[0];

    return {
      name: project.title || 'Proyecto sin nombre',
      location: project.address || '',
      clientName: primaryContact?.display || primaryContact?.first_name || '',
      clientEmail: primaryContact?.email || '',
      clientPhone: primaryContact?.phone || '',
      description: `Proyecto importado desde OpenSolar (ID: ${project.id})`,
      startDate: project.created_date ? new Date(project.created_date) : new Date(),
    };
  }
}

// Exportar instancia singleton
export const openSolarClient = new OpenSolarClient();
