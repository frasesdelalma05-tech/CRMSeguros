'use client'

import type { Client, Lead, Opportunity, Policy, Appointment, Task, Campaign, Incident, DocumentItem, Interaction, LoyaltyScore, Notification, DashboardData, AdminUser, InsuranceProduct } from './api'

// Mock Dashboard Data
export const mockDashboardData: DashboardData = {
  kpis: {
    totalClients: 1247,
    activeLeads: 89,
    activePolicies: 3421,
    expiringPolicies: 156,
    todayAppointments: 8,
    openOpportunities: 34,
    estimatedRevenue: 2450000,
    atRiskClients: 23,
    pendingTasks: 47,
    monthlyConversion: 0.32,
  },
  leadsByMonth: [
    { month: 'Ene', leads: 45 }, { month: 'Feb', leads: 52 },
    { month: 'Mar', leads: 38 }, { month: 'Abr', leads: 65 },
    { month: 'May', leads: 59 }, { month: 'Jun', leads: 71 },
    { month: 'Jul', leads: 48 }, { month: 'Ago', leads: 62 },
    { month: 'Sep', leads: 55 }, { month: 'Oct', leads: 78 },
    { month: 'Nov', leads: 68 }, { month: 'Dic', leads: 82 },
  ],
  salesByAgent: [
    { agent: 'María López', sales: 42 }, { agent: 'Carlos Ruiz', sales: 38 },
    { agent: 'Ana Martín', sales: 35 }, { agent: 'Pedro Sánchez', sales: 28 },
    { agent: 'Laura García', sales: 25 },
  ],
  opportunitiesByStatus: [
    { status: 'Abiertas', count: 12 }, { status: 'En Progreso', count: 8 },
    { status: 'Propuesta', count: 6 }, { status: 'Negociación', count: 5 },
    { status: 'Ganadas', count: 18 }, { status: 'Perdidas', count: 3 },
  ],
  appointmentsByType: [
    { type: 'Llamada', count: 24 }, { type: 'Videollamada', count: 15 },
    { type: 'Visita', count: 8 }, { type: 'Reunión', count: 12 },
    { type: 'Seguimiento', count: 18 },
  ],
  upcomingRenewals: [
    { month: 'Ene', renewals: 42 }, { month: 'Feb', renewals: 38 },
    { month: 'Mar', renewals: 55 }, { month: 'Abr', renewals: 31 },
    { month: 'May', renewals: 48 }, { month: 'Jun', renewals: 62 },
  ],
}

// Mock Clients
export const mockClients: Client[] = [
  { id: '1', name: 'Juan', lastName: 'Pérez García', dni: '12345678A', email: 'juan.perez@email.com', phone: '+34 612 345 678', status: 'activo', agentId: '1', agentName: 'María López', tags: ['VIP', 'Auto'], rgpdConsent: true, rgpdDate: '2024-01-15', loyaltyScore: 85, isAtRisk: false, createdAt: '2023-03-15', updatedAt: '2024-11-20' },
  { id: '2', name: 'María', lastName: 'Rodríguez López', dni: '23456789B', email: 'maria.rodriguez@email.com', phone: '+34 623 456 789', status: 'activo', agentId: '2', agentName: 'Carlos Ruiz', tags: ['Hogar'], rgpdConsent: true, rgpdDate: '2024-02-20', loyaltyScore: 72, isAtRisk: false, createdAt: '2023-06-10', updatedAt: '2024-10-15' },
  { id: '3', name: 'Carlos', lastName: 'Martín Sánchez', dni: '34567890C', email: 'carlos.martin@email.com', phone: '+34 634 567 890', status: 'prospecto', agentId: '1', agentName: 'María López', tags: ['Nuevo'], rgpdConsent: false, loyaltyScore: 10, isAtRisk: false, createdAt: '2024-09-05', updatedAt: '2024-11-18' },
  { id: '4', name: 'Ana', lastName: 'Fernández Díaz', dni: '45678901D', email: 'ana.fernandez@email.com', phone: '+34 645 678 901', status: 'activo', agentId: '3', agentName: 'Ana Martín', tags: ['VIP', 'Vida'], rgpdConsent: true, rgpdDate: '2023-11-10', loyaltyScore: 92, isAtRisk: false, createdAt: '2022-08-20', updatedAt: '2024-11-22' },
  { id: '5', name: 'Pedro', lastName: 'Gómez Ruiz', dni: '56789012E', email: 'pedro.gomez@email.com', phone: '+34 656 789 012', status: 'inactivo', agentId: '2', agentName: 'Carlos Ruiz', tags: ['Riesgo'], rgpdConsent: true, rgpdDate: '2023-05-10', loyaltyScore: 25, isAtRisk: true, createdAt: '2022-01-15', updatedAt: '2024-10-01' },
  { id: '6', name: 'Laura', lastName: 'Sánchez Moreno', dni: '67890123F', email: 'laura.sanchez@email.com', phone: '+34 667 890 123', status: 'activo', agentId: '4', agentName: 'Pedro Sánchez', tags: ['Auto', 'Hogar'], rgpdConsent: true, rgpdDate: '2024-03-05', loyaltyScore: 68, isAtRisk: false, createdAt: '2023-09-12', updatedAt: '2024-11-19' },
  { id: '7', name: 'Miguel', lastName: 'Díaz Navarro', dni: '78901234G', email: 'miguel.diaz@email.com', phone: '+34 678 901 234', status: 'activo', agentId: '1', agentName: 'María López', tags: ['Empresarial'], rgpdConsent: true, rgpdDate: '2023-07-22', loyaltyScore: 78, isAtRisk: false, createdAt: '2023-01-08', updatedAt: '2024-11-15' },
  { id: '8', name: 'Elena', lastName: 'Torres Jiménez', dni: '89012345H', email: 'elena.torres@email.com', phone: '+34 689 012 345', status: 'prospecto', agentId: '5', agentName: 'Laura García', tags: ['Nuevo', 'Vida'], rgpdConsent: false, loyaltyScore: 5, isAtRisk: false, createdAt: '2024-11-01', updatedAt: '2024-11-20' },
  { id: '9', name: 'Roberto', lastName: 'Vidal Castellano', dni: '90123456I', email: 'roberto.vidal@email.com', phone: '+34 690 123 456', status: 'activo', agentId: '3', agentName: 'Ana Martín', tags: ['VIP', 'Salud'], rgpdConsent: true, rgpdDate: '2022-12-01', loyaltyScore: 88, isAtRisk: false, createdAt: '2022-04-18', updatedAt: '2024-11-21' },
  { id: '10', name: 'Isabel', lastName: 'Ortiz Romero', dni: '01234567J', email: 'isabel.ortiz@email.com', phone: '+34 601 234 567', status: 'activo', agentId: '2', agentName: 'Carlos Ruiz', tags: ['Hogar', 'Auto'], rgpdConsent: true, rgpdDate: '2024-01-20', loyaltyScore: 30, isAtRisk: true, createdAt: '2024-02-10', updatedAt: '2024-11-10' },
]

// Mock Leads
export const mockLeads: Lead[] = [
  { id: '1', clientId: '3', clientName: 'Carlos Martín', product: 'Seguro de Auto', estimatedPremium: 650, probability: 30, status: 'nuevo', agentId: '1', agentName: 'María López', nextAction: 'Primera llamada', nextActionDate: '2024-12-01', notes: 'Interesado en seguro de auto', createdAt: '2024-11-15', updatedAt: '2024-11-15' },
  { id: '2', clientId: '8', clientName: 'Elena Torres', product: 'Seguro de Vida', estimatedPremium: 1200, probability: 40, status: 'contactado', agentId: '5', agentName: 'Laura García', nextAction: 'Enviar información', nextActionDate: '2024-11-28', notes: 'Ha solicitado más información', createdAt: '2024-11-01', updatedAt: '2024-11-20' },
  { id: '3', clientId: '5', clientName: 'Pedro Gómez', product: 'Seguro de Hogar', estimatedPremium: 450, probability: 60, status: 'cita_programada', agentId: '2', agentName: 'Carlos Ruiz', nextAction: 'Cita presencial', nextActionDate: '2024-11-25', notes: 'Reunión para revisar opciones', createdAt: '2024-10-20', updatedAt: '2024-11-18' },
  { id: '4', clientId: '6', clientName: 'Laura Sánchez', product: 'Seguro Empresarial', estimatedPremium: 3500, probability: 50, status: 'en_estudio', agentId: '1', agentName: 'María López', nextAction: 'Preparar propuesta', nextActionDate: '2024-11-30', notes: 'Analizando necesidades empresariales', createdAt: '2024-10-15', updatedAt: '2024-11-19' },
  { id: '5', clientId: '7', clientName: 'Miguel Díaz', product: 'Seguro de Salud', estimatedPremium: 890, probability: 70, status: 'propuesta_enviada', agentId: '3', agentName: 'Ana Martín', nextAction: 'Seguimiento propuesta', nextActionDate: '2024-11-27', notes: 'Propuesta enviada, esperando respuesta', createdAt: '2024-09-25', updatedAt: '2024-11-22' },
  { id: '6', clientId: '4', clientName: 'Ana Fernández', product: 'Seguro de Vida Premium', estimatedPremium: 2400, probability: 80, status: 'negociacion', agentId: '3', agentName: 'Ana Martín', nextAction: 'Negociar condiciones', nextActionDate: '2024-11-26', notes: 'Negociando primas y coberturas', createdAt: '2024-09-10', updatedAt: '2024-11-21' },
  { id: '7', clientId: '1', clientName: 'Juan Pérez', product: 'Seguro de Auto Premium', estimatedPremium: 980, probability: 100, status: 'ganado', agentId: '1', agentName: 'María López', nextAction: 'Activar póliza', nextActionDate: '2024-11-23', notes: 'Cliente aceptó la propuesta', createdAt: '2024-08-15', updatedAt: '2024-11-22' },
  { id: '8', clientId: '10', clientName: 'Isabel Ortiz', product: 'Seguro de Hogar Plus', estimatedPremium: 560, probability: 0, status: 'perdido', agentId: '2', agentName: 'Carlos Ruiz', nextAction: '', nextActionDate: '', notes: 'Cliente eligió competencia', createdAt: '2024-09-01', updatedAt: '2024-10-15' },
]

// Mock Opportunities
export const mockOpportunities: Opportunity[] = [
  { id: '1', clientId: '3', clientName: 'Carlos Martín', product: 'Seguro de Auto', premium: 650, probability: 30, status: 'abierta', agentId: '1', agentName: 'María López', closeDate: '2025-01-15', createdAt: '2024-11-15', updatedAt: '2024-11-15' },
  { id: '2', clientId: '4', clientName: 'Ana Fernández', product: 'Seguro de Vida Premium', premium: 2400, probability: 80, status: 'negociacion', agentId: '3', agentName: 'Ana Martín', closeDate: '2024-12-01', createdAt: '2024-09-10', updatedAt: '2024-11-21' },
  { id: '3', clientId: '5', clientName: 'Pedro Gómez', product: 'Seguro de Hogar', premium: 450, probability: 60, status: 'en_progreso', agentId: '2', agentName: 'Carlos Ruiz', closeDate: '2024-12-20', createdAt: '2024-10-20', updatedAt: '2024-11-18' },
  { id: '4', clientId: '6', clientName: 'Laura Sánchez', product: 'Seguro Empresarial', premium: 3500, probability: 50, status: 'propuesta', agentId: '1', agentName: 'María López', closeDate: '2025-01-10', createdAt: '2024-10-15', updatedAt: '2024-11-19' },
  { id: '5', clientId: '7', clientName: 'Miguel Díaz', product: 'Seguro de Salud', premium: 890, probability: 70, status: 'propuesta', agentId: '3', agentName: 'Ana Martín', closeDate: '2024-12-15', createdAt: '2024-09-25', updatedAt: '2024-11-22' },
  { id: '6', clientId: '1', clientName: 'Juan Pérez', product: 'Seguro de Auto Premium', premium: 980, probability: 100, status: 'ganada', agentId: '1', agentName: 'María López', closeDate: '2024-11-22', createdAt: '2024-08-15', updatedAt: '2024-11-22' },
  { id: '7', clientId: '10', clientName: 'Isabel Ortiz', product: 'Seguro de Hogar Plus', premium: 560, probability: 0, status: 'perdida', agentId: '2', agentName: 'Carlos Ruiz', closeDate: '2024-10-15', createdAt: '2024-09-01', updatedAt: '2024-10-15' },
]

// Mock Policies
export const mockPolicies: Policy[] = [
  { id: '1', policyNumber: 'POL-2024-001', clientId: '1', clientName: 'Juan Pérez García', product: 'Seguro de Auto', startDate: '2024-01-15', endDate: '2025-01-15', status: 'activa', premium: 650, paymentMethod: 'mensual', createdAt: '2024-01-15', updatedAt: '2024-11-20' },
  { id: '2', policyNumber: 'POL-2024-002', clientId: '2', clientName: 'María Rodríguez López', product: 'Seguro de Hogar', startDate: '2024-02-20', endDate: '2025-02-20', status: 'activa', premium: 450, paymentMethod: 'trimestral', createdAt: '2024-02-20', updatedAt: '2024-10-15' },
  { id: '3', policyNumber: 'POL-2023-015', clientId: '4', clientName: 'Ana Fernández Díaz', product: 'Seguro de Vida', startDate: '2023-11-10', endDate: '2024-11-10', status: 'en_renovacion', premium: 1200, paymentMethod: 'anual', createdAt: '2023-11-10', updatedAt: '2024-11-22' },
  { id: '4', policyNumber: 'POL-2023-008', clientId: '5', clientName: 'Pedro Gómez Ruiz', product: 'Seguro de Salud', startDate: '2023-05-10', endDate: '2024-05-10', status: 'vencida', premium: 890, paymentMethod: 'mensual', createdAt: '2023-05-10', updatedAt: '2024-10-01' },
  { id: '5', policyNumber: 'POL-2024-003', clientId: '6', clientName: 'Laura Sánchez Moreno', product: 'Seguro de Auto', startDate: '2024-03-05', endDate: '2025-03-05', status: 'activa', premium: 720, paymentMethod: 'semestral', createdAt: '2024-03-05', updatedAt: '2024-11-19' },
  { id: '6', policyNumber: 'POL-2024-004', clientId: '6', clientName: 'Laura Sánchez Moreno', product: 'Seguro de Hogar', startDate: '2024-03-05', endDate: '2025-03-05', status: 'activa', premium: 380, paymentMethod: 'mensual', createdAt: '2024-03-05', updatedAt: '2024-11-19' },
  { id: '7', policyNumber: 'POL-2023-020', clientId: '7', clientName: 'Miguel Díaz Navarro', product: 'Seguro Empresarial', startDate: '2023-07-22', endDate: '2024-07-22', status: 'cancelada', premium: 3500, paymentMethod: 'anual', createdAt: '2023-07-22', updatedAt: '2024-08-01' },
  { id: '8', policyNumber: 'POL-2024-005', clientId: '9', clientName: 'Roberto Vidal Castellano', product: 'Seguro de Salud Premium', startDate: '2024-06-01', endDate: '2025-06-01', status: 'activa', premium: 1100, paymentMethod: 'mensual', createdAt: '2024-06-01', updatedAt: '2024-11-21' },
  { id: '9', policyNumber: 'POL-2023-025', clientId: '1', clientName: 'Juan Pérez García', product: 'Seguro de Vida', startDate: '2023-03-15', endDate: '2024-03-15', status: 'vencida', premium: 950, paymentMethod: 'anual', createdAt: '2023-03-15', updatedAt: '2024-04-01' },
  { id: '10', policyNumber: 'POL-2024-010', clientId: '10', clientName: 'Isabel Ortiz Romero', product: 'Seguro de Hogar', startDate: '2024-01-20', endDate: '2025-01-20', status: 'en_renovacion', premium: 420, paymentMethod: 'trimestral', createdAt: '2024-01-20', updatedAt: '2024-11-10' },
]

// Mock Appointments
export const mockAppointments: Appointment[] = [
  { id: '1', title: 'Revisión póliza de Auto', clientId: '1', clientName: 'Juan Pérez García', agentId: '1', agentName: 'María López', date: '2024-12-02T10:00:00', type: 'reunion', status: 'programada', notes: 'Revisión anual de coberturas', createdAt: '2024-11-20' },
  { id: '2', title: 'Seguimiento seguro de Vida', clientId: '4', clientName: 'Ana Fernández Díaz', agentId: '3', agentName: 'Ana Martín', date: '2024-12-02T11:30:00', type: 'videollamada', status: 'programada', notes: 'Discutir renovación', createdAt: '2024-11-21' },
  { id: '3', title: 'Primera consulta', clientId: '3', clientName: 'Carlos Martín Sánchez', agentId: '1', agentName: 'María López', date: '2024-12-02T14:00:00', type: 'llamada', status: 'programada', notes: 'Interesado en seguro de auto', createdAt: '2024-11-22' },
  { id: '4', title: 'Visita domicilio', clientId: '2', clientName: 'María Rodríguez López', agentId: '2', agentName: 'Carlos Ruiz', date: '2024-12-03T09:00:00', type: 'visita', status: 'programada', notes: 'Inspección hogar para seguro', createdAt: '2024-11-19' },
  { id: '5', title: 'Revisión pólizas empresariales', clientId: '7', clientName: 'Miguel Díaz Navarro', agentId: '1', agentName: 'María López', date: '2024-12-03T16:00:00', type: 'reunion', status: 'programada', notes: 'Revisar nuevas necesidades', createdAt: '2024-11-18' },
  { id: '6', title: 'Seguimiento lead', clientId: '8', clientName: 'Elena Torres Jiménez', agentId: '5', agentName: 'Laura García', date: '2024-12-04T10:30:00', type: 'llamada', status: 'programada', notes: 'Enviar información seguro de vida', createdAt: '2024-11-20' },
  { id: '7', title: 'Renovación seguro Salud', clientId: '9', clientName: 'Roberto Vidal Castellano', agentId: '3', agentName: 'Ana Martín', date: '2024-11-28T12:00:00', type: 'videollamada', status: 'completada', notes: 'Cliente satisfecho, renovará', createdAt: '2024-11-15' },
  { id: '8', title: 'Consulta general', clientId: '10', clientName: 'Isabel Ortiz Romero', agentId: '2', agentName: 'Carlos Ruiz', date: '2024-11-25T15:00:00', type: 'seguimiento', status: 'cancelada', notes: 'Cliente canceló', createdAt: '2024-11-10' },
]

// Mock Tasks
export const mockTasks: Task[] = [
  { id: '1', title: 'Preparar propuesta seguro empresarial', clientId: '6', clientName: 'Laura Sánchez', assignedTo: '1', assignedToName: 'María López', dueDate: '2024-11-30', priority: 'alta', status: 'en_progreso', description: 'Elaborar propuesta personalizada para cliente', createdAt: '2024-11-19' },
  { id: '2', title: 'Renovar póliza de Vida - Ana Fernández', clientId: '4', clientName: 'Ana Fernández', assignedTo: '3', assignedToName: 'Ana Martín', dueDate: '2024-11-25', priority: 'urgente', status: 'pendiente', description: 'Póliza vence el 10 de noviembre', createdAt: '2024-11-15' },
  { id: '3', title: 'Enviar documentación RGPD', clientId: '3', clientName: 'Carlos Martín', assignedTo: '1', assignedToName: 'María López', dueDate: '2024-12-05', priority: 'media', status: 'pendiente', description: 'Enviar consentimiento RGPD al nuevo prospecto', createdAt: '2024-11-20' },
  { id: '4', title: 'Llamar clientes en riesgo', clientId: '5', clientName: 'Pedro Gómez', assignedTo: '2', assignedToName: 'Carlos Ruiz', dueDate: '2024-11-28', priority: 'alta', status: 'pendiente', description: 'Contactar clientes con score de fidelización bajo', createdAt: '2024-11-18' },
  { id: '5', title: 'Actualizar base de datos', assignedTo: '4', assignedToName: 'Pedro Sánchez', dueDate: '2024-12-10', priority: 'baja', status: 'pendiente', description: 'Limpiar y actualizar información de clientes', createdAt: '2024-11-22' },
  { id: '6', title: 'Revisión trimestral pólizas', assignedTo: '1', assignedToName: 'María López', dueDate: '2024-12-15', priority: 'media', status: 'en_progreso', description: 'Revisar todas las pólizas del trimestre', createdAt: '2024-11-20' },
  { id: '7', title: 'Preparar informe mensual', assignedTo: '4', assignedToName: 'Pedro Sánchez', dueDate: '2024-12-01', priority: 'alta', status: 'completada', description: 'Informe de ventas del mes de noviembre', createdAt: '2024-11-10' },
]

// Mock Campaigns
export const mockCampaigns: Campaign[] = [
  { id: '1', name: 'Campaña Navidad 2024', type: 'email', segment: 'Clientes activos', status: 'activa', startDate: '2024-11-15', endDate: '2024-12-31', responsible: '1', responsibleName: 'María López', budget: 5000, metrics: { sent: 800, opened: 450, clicked: 180, converted: 42 }, createdAt: '2024-11-01' },
  { id: '2', name: 'Renovaciones Enero', type: 'sms', segment: 'Pólizas por vencer', status: 'activa', startDate: '2024-12-01', endDate: '2024-12-31', responsible: '2', responsibleName: 'Carlos Ruiz', budget: 1500, metrics: { sent: 156, opened: 120, clicked: 65, converted: 28 }, createdAt: '2024-11-10' },
  { id: '3', name: 'Prospectos Auto Q1', type: 'llamada', segment: 'Leads nuevos', status: 'borrador', startDate: '2025-01-15', endDate: '2025-03-31', responsible: '3', responsibleName: 'Ana Martín', budget: 8000, metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 }, createdAt: '2024-11-20' },
  { id: '4', name: 'Fidelización VIP', type: 'evento', segment: 'Clientes VIP', status: 'completada', startDate: '2024-10-01', endDate: '2024-10-31', responsible: '1', responsibleName: 'María López', budget: 12000, metrics: { sent: 50, opened: 48, clicked: 45, converted: 38 }, createdAt: '2024-09-15' },
  { id: '5', name: 'Redes Sociales Hogar', type: 'redes', segment: 'Público general', status: 'pausada', startDate: '2024-10-15', endDate: '2024-12-15', responsible: '5', responsibleName: 'Laura García', budget: 3000, metrics: { sent: 5000, opened: 2100, clicked: 420, converted: 15 }, createdAt: '2024-10-01' },
]

// Mock Incidents
export const mockIncidents: Incident[] = [
  { id: '1', title: 'Siniestro accidente de tráfico', clientId: '1', clientName: 'Juan Pérez García', policyId: '1', policyNumber: 'POL-2024-001', priority: 'urgente', status: 'en_progreso', responsible: '1', responsibleName: 'María López', description: 'Accidente en carretera, vehículo con daños', createdAt: '2024-11-20', updatedAt: '2024-11-22' },
  { id: '2', title: 'Daño por agua en hogar', clientId: '2', clientName: 'María Rodríguez López', policyId: '2', policyNumber: 'POL-2024-002', priority: 'alta', status: 'abierta', responsible: '2', responsibleName: 'Carlos Ruiz', description: 'Inundación en cocina por tubería rota', createdAt: '2024-11-18', updatedAt: '2024-11-18' },
  { id: '3', title: 'Consulta cobertura dental', clientId: '9', clientName: 'Roberto Vidal Castellano', policyId: '8', policyNumber: 'POL-2024-005', priority: 'media', status: 'resuelta', responsible: '3', responsibleName: 'Ana Martín', description: 'Consulta sobre cobertura de tratamiento dental', createdAt: '2024-11-10', updatedAt: '2024-11-15' },
  { id: '4', title: 'Reclamación retraso pago', clientId: '5', clientName: 'Pedro Gómez Ruiz', policyId: '4', policyNumber: 'POL-2023-008', priority: 'alta', status: 'abierta', responsible: '2', responsibleName: 'Carlos Ruiz', description: 'Reclamación por retraso en pago de indemnización', createdAt: '2024-11-22', updatedAt: '2024-11-22' },
  { id: '5', title: 'Robo en domicilio', clientId: '10', clientName: 'Isabel Ortiz Romero', policyId: '10', policyNumber: 'POL-2024-010', priority: 'urgente', status: 'en_progreso', responsible: '2', responsibleName: 'Carlos Ruiz', description: 'Robo de objetos de valor en el domicilio', createdAt: '2024-11-21', updatedAt: '2024-11-22' },
]

// Mock Documents
export const mockDocuments: DocumentItem[] = [
  { id: '1', name: 'Póliza Auto Juan Pérez', type: 'poliza', clientId: '1', clientName: 'Juan Pérez García', policyId: '1', policyNumber: 'POL-2024-001', date: '2024-01-15', size: '2.4 MB', createdAt: '2024-01-15' },
  { id: '2', name: 'Contrato Hogar María Rodríguez', type: 'contrato', clientId: '2', clientName: 'María Rodríguez López', policyId: '2', policyNumber: 'POL-2024-002', date: '2024-02-20', size: '3.1 MB', createdAt: '2024-02-20' },
  { id: '3', name: 'DNI Ana Fernández', type: 'identificacion', clientId: '4', clientName: 'Ana Fernández Díaz', date: '2023-11-10', size: '1.2 MB', createdAt: '2023-11-10' },
  { id: '4', name: 'Factura Vida Ana Fernández', type: 'factura', clientId: '4', clientName: 'Ana Fernández Díaz', policyId: '3', policyNumber: 'POL-2023-015', date: '2024-11-01', size: '0.5 MB', createdAt: '2024-11-01' },
  { id: '5', name: 'Póliza Salud Roberto Vidal', type: 'poliza', clientId: '9', clientName: 'Roberto Vidal Castellano', policyId: '8', policyNumber: 'POL-2024-005', date: '2024-06-01', size: '2.8 MB', createdAt: '2024-06-01' },
  { id: '6', name: 'Contrato Auto Laura Sánchez', type: 'contrato', clientId: '6', clientName: 'Laura Sánchez Moreno', policyId: '5', policyNumber: 'POL-2024-003', date: '2024-03-05', size: '2.6 MB', createdAt: '2024-03-05' },
]

// Mock Interactions
export const mockInteractions: Interaction[] = [
  { id: '1', clientId: '1', type: 'llamada', description: 'Llamada de seguimiento sobre renovación de póliza', agentId: '1', agentName: 'María López', date: '2024-11-20', createdAt: '2024-11-20' },
  { id: '2', clientId: '1', type: 'email', description: 'Envío de documentación para actualización de datos', agentId: '1', agentName: 'María López', date: '2024-11-15', createdAt: '2024-11-15' },
  { id: '3', clientId: '1', type: 'reunion', description: 'Reunión presencial para revisar coberturas', agentId: '1', agentName: 'María López', date: '2024-11-10', createdAt: '2024-11-10' },
  { id: '4', clientId: '4', type: 'nota', description: 'Cliente muy satisfecho, posible upselling', agentId: '3', agentName: 'Ana Martín', date: '2024-11-18', createdAt: '2024-11-18' },
  { id: '5', clientId: '4', type: 'whatsapp', description: 'Recordatorio de reunión por WhatsApp', agentId: '3', agentName: 'Ana Martín', date: '2024-11-17', createdAt: '2024-11-17' },
  { id: '6', clientId: '5', type: 'llamada', description: 'Intento de contacto - sin respuesta', agentId: '2', agentName: 'Carlos Ruiz', date: '2024-11-12', createdAt: '2024-11-12' },
  { id: '7', clientId: '5', type: 'email', description: 'Email con ofertas especiales para retención', agentId: '2', agentName: 'Carlos Ruiz', date: '2024-11-05', createdAt: '2024-11-05' },
]

// Mock Loyalty Clients
export const mockLoyaltyClients: LoyaltyScore[] = [
  { id: '4', clientName: 'Ana Fernández Díaz', loyaltyScore: 92, isAtRisk: false, policyCount: 3, yearsAsClient: 2, lastInteraction: '2024-11-18', recommendedAction: 'Programa VIP - Ofrecer productos premium' },
  { id: '9', clientName: 'Roberto Vidal Castellano', loyaltyScore: 88, isAtRisk: false, policyCount: 2, yearsAsClient: 2, lastInteraction: '2024-11-15', recommendedAction: 'Renovación anticipada con descuento' },
  { id: '1', clientName: 'Juan Pérez García', loyaltyScore: 85, isAtRisk: false, policyCount: 2, yearsAsClient: 1, lastInteraction: '2024-11-20', recommendedAction: 'Cross-selling - Seguro de Vida' },
  { id: '7', clientName: 'Miguel Díaz Navarro', loyaltyScore: 78, isAtRisk: false, policyCount: 1, yearsAsClient: 2, lastInteraction: '2024-11-15', recommendedAction: 'Ofrecer seguro empresarial adicional' },
  { id: '2', clientName: 'María Rodríguez López', loyaltyScore: 72, isAtRisk: false, policyCount: 1, yearsAsClient: 1, lastInteraction: '2024-10-15', recommendedAction: 'Contactar para upselling' },
  { id: '6', clientName: 'Laura Sánchez Moreno', loyaltyScore: 68, isAtRisk: false, policyCount: 2, yearsAsClient: 1, lastInteraction: '2024-11-19', recommendedAction: 'Enviar encuesta de satisfacción' },
  { id: '10', clientName: 'Isabel Ortiz Romero', loyaltyScore: 30, isAtRisk: true, policyCount: 1, yearsAsClient: 1, lastInteraction: '2024-11-10', recommendedAction: 'Contacto urgente - Oferta especial retención' },
  { id: '5', clientName: 'Pedro Gómez Ruiz', loyaltyScore: 25, isAtRisk: true, policyCount: 0, yearsAsClient: 2, lastInteraction: '2024-10-01', recommendedAction: 'Campaña de retención personalizada' },
]

// Mock Notifications
export const mockNotifications: Notification[] = [
  { id: '1', title: 'Póliza por vencer', message: 'La póliza POL-2023-015 de Ana Fernández vence en 5 días', type: 'warning', read: false, createdAt: '2024-11-22T08:00:00' },
  { id: '2', title: 'Nuevo lead asignado', message: 'Se te ha asignado un nuevo lead: Elena Torres', type: 'info', read: false, createdAt: '2024-11-21T14:30:00' },
  { id: '3', title: 'Tarea completada', message: 'Informe mensual completado por Pedro Sánchez', type: 'success', read: true, createdAt: '2024-11-20T16:00:00' },
  { id: '4', title: 'Siniestro urgente', message: 'Nuevo siniestro reportado por Juan Pérez - Accidente de tráfico', type: 'error', read: false, createdAt: '2024-11-20T09:15:00' },
  { id: '5', title: 'Cita programada', message: 'Cita con María Rodríguez mañana a las 9:00', type: 'info', read: true, createdAt: '2024-11-19T17:00:00' },
]

// Mock Admin Users
export const mockAdminUsers: AdminUser[] = [
  { id: '1', name: 'María', lastName: 'López Hernández', email: 'maria.lopez@seguricrm.com', role: 'admin', status: 'activo', createdAt: '2022-01-15' },
  { id: '2', name: 'Carlos', lastName: ' Ruiz Martín', email: 'carlos.ruiz@seguricrm.com', role: 'agent', status: 'activo', createdAt: '2022-03-20' },
  { id: '3', name: 'Ana', lastName: 'Martín Díaz', email: 'ana.martin@seguricrm.com', role: 'atencion_cliente', status: 'activo', createdAt: '2022-06-10' },
  { id: '4', name: 'Pedro', lastName: 'Sánchez Gómez', email: 'pedro.sanchez@seguricrm.com', role: 'agent', status: 'activo', createdAt: '2023-01-08' },
  { id: '5', name: 'Laura', lastName: 'García Torres', email: 'laura.garcia@seguricrm.com', role: 'agent', status: 'activo', createdAt: '2023-09-15' },
]

// Mock Products
export const mockProducts: InsuranceProduct[] = [
  { id: '1', name: 'Seguro de Auto', category: 'Auto', description: 'Cobertura completa para vehículos', active: true },
  { id: '2', name: 'Seguro de Hogar', category: 'Hogar', description: 'Protección para tu vivienda', active: true },
  { id: '3', name: 'Seguro de Vida', category: 'Vida', description: 'Protección familiar ante imprevistos', active: true },
  { id: '4', name: 'Seguro de Salud', category: 'Salud', description: 'Cobertura médica completa', active: true },
  { id: '5', name: 'Seguro Empresarial', category: 'Empresarial', description: 'Protección para empresas y negocios', active: true },
  { id: '6', name: 'Seguro de Viaje', category: 'Viaje', description: 'Cobertura durante tus viajes', active: true },
  { id: '7', name: 'Seguro de Decesos', category: 'Decesos', description: 'Cobertura por fallecimiento', active: false },
]
