// ============================================================
// SHARED PERMISSION HELPERS
// Used across all API routes for consistent role/permission checking
// ============================================================

export const ADMIN_ROLES = ['super_administrador', 'administrador'] as const;
export const ALL_ROLES = ['super_administrador', 'administrador', 'corredor', 'atencion_cliente', 'solo_lectura'] as const;

export function hasAdminAccess(roleName: string): boolean {
  return (ADMIN_ROLES as readonly string[]).includes(roleName);
}

export function isSuperAdmin(roleName: string): boolean {
  return roleName === 'super_administrador';
}

export function isAdministrador(roleName: string): boolean {
  return roleName === 'administrador';
}

export function isCorredor(roleName: string): boolean {
  return roleName === 'corredor';
}

export function isAtencionCliente(roleName: string): boolean {
  return roleName === 'atencion_cliente';
}

export function isSoloLectura(roleName: string): boolean {
  return roleName === 'solo_lectura';
}

/**
 * Roles that can create clients
 */
export function canCreateClients(roleName: string): boolean {
  return ['super_administrador', 'administrador', 'corredor'].includes(roleName);
}

/**
 * Roles that can update clients
 */
export function canUpdateClients(roleName: string): boolean {
  return ['super_administrador', 'administrador', 'corredor'].includes(roleName);
}

/**
 * Roles that can delete clients (super_admin only)
 */
export function canDeleteClients(roleName: string): boolean {
  return roleName === 'super_administrador';
}

/**
 * Roles that can create policies
 */
export function canCreatePolicies(roleName: string): boolean {
  return ['super_administrador', 'administrador', 'corredor'].includes(roleName);
}

/**
 * Roles that can update policies
 */
export function canUpdatePolicies(roleName: string): boolean {
  return ['super_administrador', 'administrador'].includes(roleName);
}

/**
 * Roles that can delete policies (super_admin only)
 */
export function canDeletePolicies(roleName: string): boolean {
  return roleName === 'super_administrador';
}

/**
 * Roles that can search by DNI/NIE
 */
export function canSearchDni(roleName: string): boolean {
  return ['super_administrador', 'administrador', 'corredor', 'atencion_cliente'].includes(roleName);
}

/**
 * Roles that can reassign clients/policies
 */
export function canReassign(roleName: string): boolean {
  return ['super_administrador', 'administrador'].includes(roleName);
}

/**
 * Roles that can create incidents
 */
export function canCreateIncidents(roleName: string): boolean {
  return ['super_administrador', 'administrador', 'corredor', 'atencion_cliente'].includes(roleName);
}

/**
 * Roles that can create interactions/notes
 */
export function canCreateInteractions(roleName: string): boolean {
  return ['super_administrador', 'administrador', 'corredor', 'atencion_cliente'].includes(roleName);
}

/**
 * Check if a role can only read (no create/update/delete)
 */
export function isReadOnlyRole(roleName: string): boolean {
  return roleName === 'solo_lectura';
}

/**
 * Get the list of agent/broker role names
 */
export function getAgentRoleNames(): string[] {
  return ['corredor'];
}

/**
 * Determine which clients a user can see based on role
 * Returns a filter to be applied to the Prisma query
 */
export function getClientVisibilityFilter(roleName: string, userId: string): Record<string, unknown> | null {
  // super_admin and administrador can see all clients
  if (hasAdminAccess(roleName)) return null;

  // corredor sees own clients by default
  if (isCorredor(roleName)) return { ownerAgentId: userId };

  // atencion_cliente can search by DNI and view found clients, but not browse all
  // They see clients they found through search, or clients with open incidents assigned to them
  if (isAtencionCliente(roleName)) return null; // Can view individual clients found via search

  // solo_lectura sees all clients (but cannot modify)
  if (isSoloLectura(roleName)) return null;

  return null;
}

/**
 * Determine which policies a user can see based on role
 */
export function getPolicyVisibilityFilter(roleName: string, userId: string): Record<string, unknown> | null {
  // super_admin and administrador can see all policies
  if (hasAdminAccess(roleName)) return null;

  // corredor sees policies where they are the soldByAgent or ownerAgent
  if (isCorredor(roleName)) {
    return {
      OR: [
        { soldByAgentId: userId },
        { ownerAgentId: userId },
      ],
    };
  }

  // atencion_cliente and solo_lectura can view policies but not modify
  if (isAtencionCliente(roleName) || isSoloLectura(roleName)) return null;

  return null;
}
