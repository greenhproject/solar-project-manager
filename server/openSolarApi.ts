/**
 * OpenSolar API Integration
 * 
 * Provides functions to authenticate and fetch project data from OpenSolar
 */

const OPENSOLAR_API_BASE = 'https://api.opensolar.com/api';
const OPENSOLAR_EMAIL = 'gerencia@greenhproject.com';
const OPENSOLAR_PASSWORD = 'Ghp2025@';

interface OpenSolarAuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    org_id: number;
  };
}

interface OpenSolarProject {
  id: number;
  title: string;
  address: string;
  locality: string;
  state: string;
  country_name: string;
  lat: number;
  lon: number;
  business_name: string | null;
  contacts_data: Array<{
    first_name: string;
    family_name: string;
    email: string;
    phone: string;
  }>;
  created_date: string;
  modified_date: string;
  stage: number;
  priority: number;
  usage_annual_or_guess: number;
  notes: string;
  systems: any[];
}

/**
 * Authenticate with OpenSolar and get Bearer token
 */
async function authenticateOpenSolar(): Promise<{ token: string; orgId: number }> {
  const response = await fetch(`${OPENSOLAR_API_BASE}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: OPENSOLAR_EMAIL,
      password: OPENSOLAR_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenSolar authentication failed: ${response.statusText}`);
  }

  const data: OpenSolarAuthResponse = await response.json();
  return {
    token: data.token,
    orgId: data.user.org_id,
  };
}

/**
 * Fetch project data from OpenSolar by project ID
 */
export async function getOpenSolarProject(projectId: string) {
  try {
    // Authenticate first
    const { token, orgId } = await authenticateOpenSolar();

    // Fetch project data
    const response = await fetch(
      `${OPENSOLAR_API_BASE}/orgs/${orgId}/projects/${projectId}/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Proyecto no encontrado en OpenSolar');
      }
      throw new Error(`Error al obtener proyecto: ${response.statusText}`);
    }

    const project: OpenSolarProject = await response.json();

    // Map OpenSolar fields to our format
    const primaryContact = project.contacts_data[0];
    const clientName = primaryContact
      ? `${primaryContact.first_name} ${primaryContact.family_name}`.trim()
      : project.business_name || '';

    const fullAddress = [
      project.address,
      project.locality,
      project.state,
      project.country_name
    ].filter(Boolean).join(', ');

    // Build description with technical details
    let description = project.notes || '';
    if (project.usage_annual_or_guess) {
      description += `\n\nConsumo anual estimado: ${project.usage_annual_or_guess} kWh`;
    }
    if (project.systems && project.systems.length > 0) {
      description += `\n\nSistemas solares: ${project.systems.length} diseño(s) disponible(s)`;
    }

    return {
      success: true,
      data: {
        name: project.title,
        location: fullAddress,
        client: clientName,
        description: description.trim(),
        startDate: new Date(project.created_date),
        // Additional metadata
        openSolarId: project.id.toString(),
        coordinates: {
          lat: project.lat,
          lon: project.lon,
        },
        priority: project.priority,
        contactEmail: primaryContact?.email || '',
        contactPhone: primaryContact?.phone || '',
      },
    };
  } catch (error) {
    console.error('Error fetching OpenSolar project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al conectar con OpenSolar',
    };
  }
}
