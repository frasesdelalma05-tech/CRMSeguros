'use client'

const API_BASE = '/api'

function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('seguricrm_token')
  }
  return null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Error de servidor' }))
    throw new Error(error.error || error.message || `Error ${res.status}`)
  }

  return res.json()
}

// Types matching the backend responses
export interface Client {
  id: string
  name: string
  lastName: string
  documentType?: string
  documentNumber?: string
  email: string
  phone?: string
  mobile?: string
  address?: string
  city?: string
  province?: string
  postalCode?: string
  status: string
  source?: string
  ownerAgentId?: string
  rgpdConsent: boolean
  rgpdConsentDate?: string
  observations?: string
  tags?: string
  createdAt: string
  updatedAt: string
  ownerAgent?: { id: string; name: string; lastName: string }
  policies?: Policy[]
  leads?: Lead[]
  loyaltyScore?: LoyaltyScore
}

export interface Lead {
  id: string
  clientId: string
  agentId?: string
  source?: string
  status: string
  estimatedPremium?: number
  probability: number
  product?: string
  notes?: string
  nextAction?: string
  nextActionDate?: string
  closingDate?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
  agent?: { id: string; name: string; lastName: string }
}

export interface Opportunity {
  id: string
  clientId: string
  leadId?: string
  product: string
  estimatedPremium: number
  probability: number
  status: string
  agentId?: string
  closingDate?: string
  notes?: string
  nextAction?: string
  nextActionDate?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
  agent?: { id: string; name: string; lastName: string }
}

export interface Policy {
  id: string
  policyNumber: string
  clientId: string
  productId?: string
  productName: string
  startDate: string
  endDate: string
  status: string
  premium: number
  paymentMethod?: string
  coverages?: string
  renewalDate?: string
  cancellationDate?: string
  cancellationReason?: string
  soldByAgentId?: string
  ownerAgentId?: string
  soldByAgent?: { id: string; name: string; lastName: string }
  ownerAgent?: { id: string; name: string; lastName: string }
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
  product?: { id: string; name: string; category: string }
}

export interface Appointment {
  id: string
  clientId?: string
  agentId: string
  title: string
  description?: string
  type: string
  status: string
  date: string
  endDate?: string
  location?: string
  notes?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
  agent?: { id: string; name: string; lastName: string }
}

export interface Task {
  id: string
  title: string
  description?: string
  clientId?: string
  opportunityId?: string
  policyId?: string
  assigneeId: string
  dueDate: string
  priority: string
  status: string
  completedAt?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
  assignee?: { id: string; name: string; lastName: string }
}

export interface Campaign {
  id: string
  name: string
  objective?: string
  type: string
  segment?: string
  productId?: string
  startDate: string
  endDate?: string
  status: string
  responsibleId?: string
  metrics?: string
  createdAt: string
  updatedAt: string
  responsible?: { id: string; name: string; lastName: string }
  members?: CampaignMember[]
}

export interface CampaignMember {
  id: string
  campaignId: string
  clientId: string
  status: string
  responseDate?: string
  notes?: string
  client?: { id: string; name: string; lastName: string }
}

export interface Incident {
  id: string
  title: string
  description: string
  priority: string
  status: string
  clientId?: string
  policyId?: string
  assignedTo?: string
  resolution?: string
  internalNotes?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
  policy?: { id: string; policyNumber: string }
}

export interface DocumentItem {
  id: string
  name: string
  type: string
  mimeType?: string
  size?: number
  url: string
  clientId?: string
  policyId?: string
  opportunityId?: string
  incidentId?: string
  uploadedBy?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
}

export interface Interaction {
  id: string
  clientId: string
  leadId?: string
  type: string
  direction?: string
  subject?: string
  notes: string
  agentId?: string
  createdAt: string
  updatedAt: string
}

export interface LoyaltyScore {
  id: string
  clientId: string
  score: number
  activePolicies: number
  totalPremium: number
  yearsAsClient: number
  lastContactDate?: string
  isAtRisk: boolean
  riskReason?: string
  recommendedActions?: string
  createdAt: string
  updatedAt: string
  client?: { id: string; name: string; lastName: string }
}

export interface Notification {
  id: string
  title: string
  message: string
  type: string
  userId?: string
  policyId?: string
  isRead: boolean
  readAt?: string
  createdAt: string
  updatedAt: string
}

export interface InsuranceProduct {
  id: string
  name: string
  category: string
  description?: string
  basePremium?: number
  coverages?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  lastName: string
  phone?: string
  position?: string
  roleId: string
  isActive: boolean
  lastLogin?: string
  createdAt: string
  updatedAt: string
  role?: { id: string; name: string; description?: string }
  permissions?: { id: string; name: string; module: string; action: string }[]
}

export interface DniSearchResult {
  id: string
  name: string
  lastName: string
  documentType?: string
  documentNumber?: string
  email: string
  phone?: string
  mobile?: string
  status: string
  ownerAgentId?: string
  ownerAgent?: { id: string; name: string; lastName: string; email?: string; position?: string }
  policies: {
    id: string
    policyNumber: string
    productName: string
    status: string
    premium: number
    startDate: string
    endDate: string
    soldByAgentId?: string
    ownerAgentId?: string
    soldByAgent?: { id: string; name: string; lastName: string }
    ownerAgent?: { id: string; name: string; lastName: string }
  }[]
  leads: {
    id: string
    product?: string
    status: string
    agentId?: string
    agent?: { id: string; name: string; lastName: string }
  }[]
  canEdit: boolean
  belongsToCurrentUser: boolean
  _count: { policies: number; opportunities: number }
}

export interface AuditLogEntry {
  id: string
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  details: string | null
  ipAddress: string | null
  createdAt: string
  user?: {
    id: string
    name: string
    lastName: string
    email: string
    role: { name: string }
  }
}

export interface DashboardData {
  kpis: {
    totalClients: number
    activeLeads: number
    activePolicies: number
    expiringPolicies: number
    todayAppointments: number
    openOpportunities: number
    estimatedRevenue: number
    atRiskClients: number
    pendingTasks: number
    monthlyConversion: number
  }
  leadsByMonth: { month: string; leads: number }[]
  salesByAgent: { agent: string; sales: number }[]
  opportunitiesByStatus: { status: string; count: number }[]
  appointmentsByType: { type: string; count: number }[]
  upcomingRenewals: { month: string; renewals: number }[]
}

// API methods
export const api = {
  // Auth
  login: async (email: string, password: string) => {
    const res = await request<{ data: { accessToken: string; refreshToken: string; user: { id: string; email: string; name: string; lastName: string; phone?: string; avatar?: string; role: string; roleId: string; permissions?: string[] } } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return {
      user: {
        id: res.data.user.id,
        email: res.data.user.email,
        name: res.data.user.name,
        lastName: res.data.user.lastName,
        phone: res.data.user.phone,
        avatar: res.data.user.avatar,
        role: res.data.user.role,
        roleId: res.data.user.roleId,
        permissions: res.data.user.permissions,
      },
      token: res.data.accessToken,
    }
  },

  register: async (data: { name: string; lastName: string; email: string; password: string; roleId?: string }) => {
    const res = await request<{ data: { user: { id: string; email: string; name: string; lastName: string; role: string; roleId: string } } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    return {
      user: {
        id: res.data.user.id,
        email: res.data.user.email,
        name: res.data.user.name,
        lastName: res.data.user.lastName,
        role: res.data.user.role,
        roleId: res.data.user.roleId,
      },
    }
  },

  getMe: () =>
    request<{ data: { id: string; email: string; name: string; lastName: string; phone?: string; role: { name: string } } }>('/auth/me'),

  // Dashboard
  getDashboard: () =>
    request<DashboardData>('/dashboard'),

  // Clients
  getClients: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Client[]; total: number; page: number; limit: number }>(`/clients${query}`)
  },
  getClient: (id: string) =>
    request<{ data: Client }>(`/clients/${id}`),
  createClient: (data: Record<string, unknown>) =>
    request<{ data: Client }>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  updateClient: (id: string, data: Record<string, unknown>) =>
    request<{ data: Client }>(`/clients/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteClient: (id: string) =>
    request<{ data: Client }>(`/clients/${id}`, { method: 'DELETE' }),

  // Leads
  getLeads: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Lead[]; total: number }>(`/leads${query}`)
  },
  createLead: (data: Record<string, unknown>) =>
    request<{ data: Lead }>('/leads', { method: 'POST', body: JSON.stringify(data) }),
  updateLead: (id: string, data: Record<string, unknown>) =>
    request<{ data: Lead }>(`/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteLead: (id: string) =>
    request<void>(`/leads/${id}`, { method: 'DELETE' }),

  // Opportunities
  getOpportunities: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Opportunity[]; total: number }>(`/opportunities${query}`)
  },
  createOpportunity: (data: Record<string, unknown>) =>
    request<{ data: Opportunity }>('/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  updateOpportunity: (id: string, data: Record<string, unknown>) =>
    request<{ data: Opportunity }>(`/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Policies
  getPolicies: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Policy[]; total: number }>(`/policies${query}`)
  },
  createPolicy: (data: Record<string, unknown>) =>
    request<{ data: Policy }>('/policies', { method: 'POST', body: JSON.stringify(data) }),
  updatePolicy: (id: string, data: Record<string, unknown>) =>
    request<{ data: Policy }>(`/policies/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Appointments
  getAppointments: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Appointment[]; total: number }>(`/appointments${query}`)
  },
  createAppointment: (data: Record<string, unknown>) =>
    request<{ data: Appointment }>('/appointments', { method: 'POST', body: JSON.stringify(data) }),
  updateAppointment: (id: string, data: Record<string, unknown>) =>
    request<{ data: Appointment }>(`/appointments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Task[]; total: number }>(`/tasks${query}`)
  },
  createTask: (data: Record<string, unknown>) =>
    request<{ data: Task }>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: string, data: Record<string, unknown>) =>
    request<{ data: Task }>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Campaigns
  getCampaigns: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Campaign[] }>(`/campaigns${query}`)
  },
  createCampaign: (data: Record<string, unknown>) =>
    request<{ data: Campaign }>('/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  updateCampaign: (id: string, data: Record<string, unknown>) =>
    request<{ data: Campaign }>(`/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Incidents
  getIncidents: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Incident[]; total: number }>(`/incidents${query}`)
  },
  createIncident: (data: Record<string, unknown>) =>
    request<{ data: Incident }>('/incidents', { method: 'POST', body: JSON.stringify(data) }),
  updateIncident: (id: string, data: Record<string, unknown>) =>
    request<{ data: Incident }>(`/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Documents
  getDocuments: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: DocumentItem[]; total: number }>(`/documents${query}`)
  },
  createDocument: (data: Record<string, unknown>) =>
    request<{ data: DocumentItem }>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (id: string) =>
    request<void>(`/documents/${id}`, { method: 'DELETE' }),

  // Loyalty
  getLoyaltyScores: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: LoyaltyScore[] }>(`/loyalty${query}`)
  },
  getClientLoyalty: (clientId: string) =>
    request<{ data: LoyaltyScore }>(`/loyalty/${clientId}`),
  updateLoyalty: (clientId: string, data: Record<string, unknown>) =>
    request<{ data: LoyaltyScore }>(`/loyalty/${clientId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Interactions
  getInteractions: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Interaction[] }>(`/interactions${query}`)
  },
  createInteraction: (data: Record<string, unknown>) =>
    request<{ data: Interaction }>('/interactions', { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: () =>
    request<{ data: Notification[] }>('/notifications'),
  markNotificationsRead: (ids: string[]) =>
    request<void>('/notifications', { method: 'PUT', body: JSON.stringify({ ids }) }),

  // Reports
  getReport: (type: string) =>
    request<{ data: Record<string, unknown>[] }>(`/reports?type=${type}`),

  // Admin - Roles
  getRoles: () =>
    request<{ data: { id: string; name: string; description?: string; permissions: { id: string; name: string; module: string; action: string }[]; _count: { users: number } }[] }>('/admin/roles'),

  // Admin - Users
  getUsers: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: AdminUser[]; total: number; page: number; limit: number }>(`/admin/users${query}`)
  },
  getUser: (id: string) =>
    request<{ data: AdminUser }>(`/admin/users/${id}`),
  createUser: (data: Record<string, unknown>) =>
    request<{ data: AdminUser }>('/admin/users', { method: 'POST', body: JSON.stringify(data) }),
  updateUser: (id: string, data: Record<string, unknown>) =>
    request<{ data: AdminUser }>(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUser: (id: string) =>
    request<void>(`/admin/users/${id}`, { method: 'DELETE' }),
  updateUserRole: (id: string, roleId: string) =>
    request<{ data: AdminUser }>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ roleId }) }),
  toggleUserStatus: (id: string) =>
    request<{ data: AdminUser }>(`/admin/users/${id}/toggle-status`, { method: 'PATCH' }),

  // DNI/NIE Search (legacy endpoint)
  searchByDni: (dni: string) =>
    request<{ data: DniSearchResult[] }>(`/clients/search-dni?dni=${encodeURIComponent(dni)}`),

  // Document search (new centralized endpoint)
  searchClientByDocument: (document: string) =>
    request<{ data: DniSearchResult[] }>(`/search/client?document=${encodeURIComponent(document)}`),

  // Global search
  globalSearch: (q: string) =>
    request<{ data: { clients: Client[]; policies: Policy[]; leads: Lead[]; agents: AdminUser[] } }>(`/search/global?q=${encodeURIComponent(q)}`),

  // Reassign client to different corredor
  reassignClient: (clientId: string, ownerAgentId: string) =>
    request<{ data: Client }>(`/clients/${clientId}/reassign`, { method: 'PATCH', body: JSON.stringify({ ownerAgentId }) }),

  // Reassign policy to different corredor (owner agent)
  reassignPolicy: (policyId: string, ownerAgentId: string) =>
    request<{ data: Policy }>(`/policies/${policyId}/reassign`, { method: 'PATCH', body: JSON.stringify({ ownerAgentId }) }),

  // Admin - Products
  getProducts: () =>
    request<{ data: InsuranceProduct[] }>('/admin/products'),
  createProduct: (data: Record<string, unknown>) =>
    request<{ data: InsuranceProduct }>('/admin/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (id: string, data: Record<string, unknown>) =>
    request<{ data: InsuranceProduct }>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Admin - Summary
  getAdminSummary: () =>
    request<{ data: { kpis: { totalAdmins?: number; totalCorredores: number; totalClients: number; totalPolicies: number; totalPremium: number }; admins?: Array<{ id: string; name: string; lastName: string; email: string; isActive: boolean; corredoresCount: number; clientsCount: number; policiesCount: number; premium: number }>; agents?: Array<{ id: string; name: string; lastName: string; email: string; isActive: boolean; clientsCount: number; policiesCount: number; premium: number }> } }>('/admin/summary'),

  // Admin - Administradores
  getAdmins: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: Array<AdminUser & { managerId?: string; documentType?: string; documentNumber?: string; office?: string; stats: { corredoresCount: number; clientsCount: number; policiesCount: number; premium: number } }>; total: number; page: number; limit: number }>(`/admin/admins${query}`)
  },
  createAdmin: (data: Record<string, unknown>) =>
    request<{ data: AdminUser }>('/admin/admins', { method: 'POST', body: JSON.stringify(data) }),
  updateAdmin: (id: string, data: Record<string, unknown>) =>
    request<{ data: AdminUser }>(`/admin/admins/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdmin: (id: string) =>
    request<{ message: string }>(`/admin/admins/${id}`, { method: 'DELETE' }),

  // Admin - Agents (corredores)
  getAgents: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: (AdminUser & { _count: { assignedClients: number; soldPolicies: number; ownedPolicies: number; assignedLeads: number }; manager?: { id: string; name: string; lastName: string; email: string } })[]; total: number; page: number; limit: number }>(`/admin/agents${query}`)
  },
  createAgent: (data: Record<string, unknown>) =>
    request<{ data: AdminUser & { manager?: { id: string; name: string; lastName: string; email: string }; _count: { assignedClients: number; soldPolicies: number; ownedPolicies: number; assignedLeads: number } } }>('/admin/agents', { method: 'POST', body: JSON.stringify(data) }),
  updateAgent: (id: string, data: Record<string, unknown>) =>
    request<{ data: AdminUser & { manager?: { id: string; name: string; lastName: string; email: string }; _count: { assignedClients: number; soldPolicies: number; ownedPolicies: number; assignedLeads: number } } }>(`/admin/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  toggleAgentStatus: (id: string) =>
    request<{ data: AdminUser; message: string }>(`/admin/agents/${id}/toggle-status`, { method: 'PATCH' }),
  getAgentPortfolio: (id: string) =>
    request<{ data: { agent: { id: string; name: string; lastName: string; email: string; phone?: string; office?: string; isActive: boolean; manager?: { id: string; name: string; lastName: string; email: string } }; clients: Array<{ id: string; name: string; lastName: string; email: string; phone?: string; status: string }>; policies: Array<{ id: string; policyNumber: string; productName: string; status: string; premium: number; startDate: string; endDate: string; client: { id: string; name: string; lastName: string; email: string }; product?: { id: string; name: string; category: string } }>; appointments: Array<{ id: string; title: string; type: string; status: string; date: string; endDate?: string; client?: { id: string; name: string; lastName: string } }>; totalPremium: number; stats: { totalClients: number; totalPolicies: number; activePolicies: number; totalAppointments: number; totalPremium: number } } }>(`/admin/agents/${id}/portfolio`),
  deleteAgent: (id: string) =>
    request<{ message: string }>(`/admin/agents/${id}`, { method: 'DELETE' }),

  // Admin - Reset Password
  resetUserPassword: (id: string, newPassword: string) =>
    request<{ message: string }>(`/admin/users/${id}/reset-password`, { method: 'PATCH', body: JSON.stringify({ newPassword }) }),

  // Admin - Audit Logs
  getAuditLogs: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ data: AuditLogEntry[]; total: number; page: number; limit: number }>(`/admin/audit${query}`)
  },
}
