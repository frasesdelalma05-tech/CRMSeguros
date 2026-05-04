'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, type PageName } from '@/lib/store'
import { api, type Notification, type Client, type Policy, type AdminUser, type Lead, type DniSearchResult } from '@/lib/api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  LayoutDashboard, Users, UserPlus, TrendingUp, Shield, Calendar,
  CheckSquare, Megaphone, Heart, AlertTriangle, FileText, BarChart3,
  Settings, User, LogOut, Bell, Search, Menu, Loader2,
  X, UserCircle, FileCheck, Briefcase,
  Phone, Mail, ArrowRight, CalendarPlus, UserCheck, MessageSquare,
  Euro, AlertCircle, ChevronDown, ChevronUp, Copy, ExternalLink,
  Edit, ArrowRightLeft, Eye,
} from 'lucide-react'
import BottomNavigation from '@/components/bottom-navigation'
import FAB from '@/components/fab'

// Display type for notifications
interface NotificationDisplay {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

function mapApiNotification(n: Notification): NotificationDisplay {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.isRead,
    createdAt: n.createdAt,
  }
}

// Search result types
interface SearchResults {
  clients: Client[]
  policies: Policy[]
  leads: Lead[]
  agents: AdminUser[]
}

const policyStatusColors: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-800',
  en_renovacion: 'bg-amber-100 text-amber-800',
  vencida: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-800',
  suspendida: 'bg-orange-100 text-orange-800',
  pendiente: 'bg-blue-100 text-blue-800',
}

const clientStatusColors: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-800',
  inactivo: 'bg-gray-100 text-gray-800',
  prospecto: 'bg-blue-100 text-blue-800',
}

const clientStatusLabels: Record<string, string> = {
  activo: 'Activo',
  inactivo: 'Inactivo',
  prospecto: 'Prospecto',
}

/** Detects if a query looks like a Spanish DNI (8 digits + optional letter) or NIE (X/Y/Z + 7 digits + optional letter) */
function isDniPattern(query: string): boolean {
  return /^[0-9]{5,}[A-Za-z]?|[XYZ][0-9]{5,}[A-Za-z]?$/.test(query.trim())
}

const navItems: { title: string; page: PageName; icon: React.ElementType; roles?: string[] }[] = [
  { title: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { title: 'Clientes', page: 'clients', icon: Users },
  { title: 'Leads', page: 'leads', icon: UserPlus },
  { title: 'Oportunidades', page: 'opportunities', icon: TrendingUp },
  { title: 'Pólizas', page: 'policies', icon: Shield },
  { title: 'Citas', page: 'appointments', icon: Calendar },
  { title: 'Tareas', page: 'tasks', icon: CheckSquare },
  { title: 'Campañas', page: 'campaigns', icon: Megaphone },
  { title: 'Fidelización', page: 'loyalty', icon: Heart },
  { title: 'Incidencias', page: 'incidents', icon: AlertTriangle },
  { title: 'Documentos', page: 'documents', icon: FileText },
  { title: 'Reportes', page: 'reports', icon: BarChart3 },
  { title: 'Administración', page: 'admin', icon: Settings, roles: ['super_administrador', 'administrador'] },
]

function AppSidebar() {
  const { page, setPage, user } = useAppStore()

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Shield className="h-8 w-8 text-emerald-400 shrink-0" />
          <span className="text-xl font-bold group-data-[collapsible=icon]:hidden">
            SeguriCRM
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={page === item.page}
                    onClick={() => setPage(item.page)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-emerald-600 data-[active=true]:text-white"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={page === 'profile'}
              onClick={() => setPage('profile')}
              tooltip="Perfil"
              className="data-[active=true]:bg-emerald-600 data-[active=true]:text-white"
            >
              <User className="h-5 w-5" />
              <span>Mi Perfil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function MobileSidebarTrigger() {
  const { toggleSidebar, isMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <Button
      variant="ghost"
      size="icon"
      className="-ml-1"
      onClick={toggleSidebar}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

// Format currency in Spanish format: "€1.234,56"
function formatEuro(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Format date as dd/MM/yyyy
function formatShortDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return dateStr
  }
}

// Rich DNI/NIE result card
function DniResultCard({
  result,
  user,
  onNavigate,
  onClose,
}: {
  result: DniSearchResult
  user: { id: string; role: string; permissions?: string[] } | null
  onNavigate: (type: 'client' | 'policy' | 'agent', id: string) => void
  onClose: () => void
}) {
  const [expandedPolicy, setExpandedPolicy] = useState<string | null>(null)
  const isOwnClient = result.belongsToCurrentUser
  const isAdmin = user?.role === 'super_administrador' || user?.role === 'administrador'
  const isAtencionCliente = user?.role === 'atencion_cliente'
  const isCorredor = user?.role === 'corredor'
  const isSoloLectura = user?.role === 'solo_lectura'
  const canAddNote = (isCorredor && isOwnClient) || isAdmin
  const canCreateCita = (isCorredor && isOwnClient) || isAdmin || isAtencionCliente
  const canReassign = isAdmin
  const canEdit = result.canEdit && !isSoloLectura
  const canCreateClients = isAdmin || isCorredor || isAtencionCliente

  const activePolicies = result.policies.filter((p) => p.status === 'activa')
  const totalPremium = result.policies.reduce((sum, p) => sum + (p.premium || 0), 0)
  const phone = result.phone || result.mobile

  // Risk indicator derived from loyalty data if available
  const riskIndicator = (() => {
    if (result._count.policies === 0) return { level: 'high', label: 'Sin pólizas', color: 'text-red-600', bg: 'bg-red-50' }
    if (activePolicies.length === 0 && result.policies.length > 0) return { level: 'high', label: 'Riesgo alto', color: 'text-red-600', bg: 'bg-red-50' }
    if (activePolicies.length > 0 && result.policies.length > activePolicies.length) return { level: 'medium', label: 'Riesgo medio', color: 'text-amber-600', bg: 'bg-amber-50' }
    return { level: 'low', label: 'Cliente estable', color: 'text-emerald-600', bg: 'bg-emerald-50' }
  })()

  return (
    <div className="p-3 space-y-3">
      {/* Header: Name + Status + Risk */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
            <UserCircle className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{result.name} {result.lastName}</p>
            <p className="text-xs text-gray-500">{result.documentType || 'DNI'}: {result.documentNumber}
              <button
                className="ml-1 inline-flex text-gray-400 hover:text-emerald-600 transition-colors"
                onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(result.documentNumber || '') }}
                title="Copiar"
              >
                <Copy className="h-2.5 w-2.5" />
              </button>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`text-[10px] h-5 ${clientStatusColors[result.status] || 'bg-gray-100 text-gray-800'}`}>
            {clientStatusLabels[result.status] || result.status}
          </Badge>
          {riskIndicator.level !== 'low' && (
            <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${riskIndicator.bg} ${riskIndicator.color}`}>
              <AlertCircle className="h-2.5 w-2.5" />
              {riskIndicator.label}
            </div>
          )}
        </div>
      </div>

      {/* Contact row - clickable */}
      <div className="flex items-center gap-3 text-xs">
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-3 w-3" />
            <span>{phone}</span>
          </a>
        )}
        {result.email && (
          <a
            href={`mailto:${result.email}`}
            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 transition-colors truncate"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{result.email}</span>
          </a>
        )}
      </div>

      {/* Corredor responsable - with link */}
      {result.ownerAgent && (
        <button
          className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-emerald-700 transition-colors w-full text-left"
          onClick={() => onNavigate('agent', result.ownerAgent!.id)}
        >
          <UserCheck className="h-3.5 w-3.5 text-gray-400" />
          <span>Corredor: <span className="font-medium underline">{result.ownerAgent.name} {result.ownerAgent.lastName}</span></span>
          <ExternalLink className="h-2.5 w-2.5 text-gray-300" />
        </button>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
          <p className="text-[10px] text-gray-500">Pólizas</p>
          <p className="text-sm font-bold text-gray-900">{result.policies.length}</p>
        </div>
        <div className="bg-emerald-50 rounded-md px-2 py-1.5 text-center">
          <p className="text-[10px] text-emerald-600">Activas</p>
          <p className="text-sm font-bold text-emerald-700">{activePolicies.length}</p>
        </div>
        <div className="bg-gray-50 rounded-md px-2 py-1.5 text-center">
          <p className="text-[10px] text-gray-500">Prima total</p>
          <p className="text-sm font-bold text-gray-900">{formatEuro(totalPremium)}</p>
        </div>
      </div>

      {/* Policies list */}
      {result.policies.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 mb-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>Pólizas ({result.policies.length})</span>
          </div>
          <div className="space-y-1.5">
            {result.policies.map((policy) => (
              <div key={policy.id}>
                <button
                  className="w-full text-left flex items-center gap-2 p-2 rounded-md bg-gray-50 hover:bg-gray-100 transition-colors"
                  onClick={() => onNavigate('policy', policy.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-gray-900">{policy.policyNumber}</span>
                      <Badge className={`text-[9px] h-3.5 px-1 ${policyStatusColors[policy.status] || 'bg-gray-100 text-gray-800'}`}>
                        {policy.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-gray-500 truncate">{policy.productName}</p>
                    {policy.soldByAgent && (
                      <p className="text-[11px] text-gray-400">Vendida por: {policy.soldByAgent.name} {policy.soldByAgent.lastName}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-gray-700">{formatEuro(policy.premium)}</p>
                    <p className="text-[10px] text-gray-400">{formatShortDate(policy.endDate)}</p>
                  </div>
                </button>
                {/* Expandable details */}
                <button
                  className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 ml-2 mt-0.5"
                  onClick={(e) => { e.stopPropagation(); setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id) }}
                >
                  {expandedPolicy === policy.id ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                  {expandedPolicy === policy.id ? 'Menos' : 'Más detalles'}
                </button>
                {expandedPolicy === policy.id && (
                  <div className="mx-2 p-2 bg-gray-50 rounded-b-md text-[11px] text-gray-500 space-y-1 border-t border-gray-100">
                    <p><span className="font-medium">Inicio:</span> {formatShortDate(policy.startDate)}</p>
                    <p><span className="font-medium">Vencimiento:</span> {formatShortDate(policy.endDate)}</p>
                    {policy.ownerAgent && (
                      <p><span className="font-medium">Responsable:</span> {policy.ownerAgent.name} {policy.ownerAgent.lastName}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission-based action buttons */}
      <div className="flex flex-wrap gap-1.5 pt-1 border-t">
        {/* Solo Lectura */}
        {isSoloLectura && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => { onNavigate('client', result.id); onClose() }}
          >
            <Eye className="h-3 w-3" />
            Ver ficha
          </Button>
        )}

        {/* Corredor */}
        {isCorredor && isOwnClient && !isSoloLectura && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <ArrowRight className="h-3 w-3" /> Ver ficha
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <MessageSquare className="h-3 w-3" /> Añadir nota
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <CalendarPlus className="h-3 w-3" /> Crear cita
            </Button>
          </>
        )}
        {isCorredor && !isOwnClient && !isSoloLectura && (
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
            <Eye className="h-3 w-3" /> Ver ficha
          </Button>
        )}

        {/* Atención al Cliente */}
        {isAtencionCliente && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <Eye className="h-3 w-3" /> Ver datos
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <AlertTriangle className="h-3 w-3" /> Crear incidencia
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <Phone className="h-3 w-3" /> Registrar llamada
            </Button>
          </>
        )}

        {/* Admin / Super Admin */}
        {isAdmin && (
          <>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <ArrowRight className="h-3 w-3" /> Ver ficha
            </Button>
            {canEdit && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
                <Edit className="h-3 w-3" /> Editar
              </Button>
            )}
            {canReassign && (
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
                <UserPlus className="h-3 w-3" /> Reasignar
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <CalendarPlus className="h-3 w-3" /> Crear cita
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { onNavigate('client', result.id); onClose() }}>
              <MessageSquare className="h-3 w-3" /> Añadir nota
            </Button>
          </>
        )}
      </div>

      {/* Quick actions row */}
      <div className="flex items-center justify-between gap-1 pt-1 border-t">
        {phone ? (
          <a
            href={`tel:${phone}`}
            className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-emerald-600 transition-colors py-1 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Phone className="h-4 w-4" />
            <span className="text-[9px]">Llamar</span>
          </a>
        ) : (
          <div className="flex flex-col items-center gap-0.5 text-gray-300 py-1 flex-1">
            <Phone className="h-4 w-4" />
            <span className="text-[9px]">Llamar</span>
          </div>
        )}
        {phone ? (
          <a
            href={`https://wa.me/${phone.replace(/\s/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-emerald-600 transition-colors py-1 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-[9px]">WhatsApp</span>
          </a>
        ) : (
          <div className="flex flex-col items-center gap-0.5 text-gray-300 py-1 flex-1">
            <MessageSquare className="h-4 w-4" />
            <span className="text-[9px]">WhatsApp</span>
          </div>
        )}
        {result.email ? (
          <a
            href={`mailto:${result.email}`}
            className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-emerald-600 transition-colors py-1 flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Mail className="h-4 w-4" />
            <span className="text-[9px]">Email</span>
          </a>
        ) : (
          <div className="flex flex-col items-center gap-0.5 text-gray-300 py-1 flex-1">
            <Mail className="h-4 w-4" />
            <span className="text-[9px]">Email</span>
          </div>
        )}
        <button
          className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-emerald-600 transition-colors py-1 flex-1"
          onClick={() => { onNavigate('client', result.id); onClose() }}
        >
          <Calendar className="h-4 w-4" />
          <span className="text-[9px]">Cita</span>
        </button>
        <button
          className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-emerald-600 transition-colors py-1 flex-1"
          onClick={() => { onNavigate('client', result.id); onClose() }}
        >
          <FileText className="h-4 w-4" />
          <span className="text-[9px]">Nota</span>
        </button>
        {canReassign && (
          <button
            className="flex flex-col items-center gap-0.5 text-gray-500 hover:text-emerald-600 transition-colors py-1 flex-1"
            onClick={() => { onNavigate('client', result.id); onClose() }}
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-[9px]">Reasignar</span>
          </button>
        )}
      </div>
    </div>
  )
}

// DNI/NIE not found card
function DniNotFoundCard({
  onClose,
  onCreateClient,
  onGlobalSearch,
  searchQuery,
  canCreateClients,
}: {
  onClose: () => void
  onCreateClient: () => void
  onGlobalSearch: () => void
  searchQuery: string
  canCreateClients: boolean
}) {
  return (
    <div className="p-4 text-center space-y-3">
      <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center">
        <Search className="h-6 w-6 text-gray-300" />
      </div>
      <div>
        <p className="text-sm text-gray-600">No encontramos ningún asegurado con esos datos.</p>
        {searchQuery && (
          <p className="text-sm mt-1">
            <span className="text-gray-500">Documento buscado: </span>
            <span className="font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">{searchQuery}</span>
          </p>
        )}
      </div>
      <div className="flex flex-col gap-2">
        {canCreateClients && (
          <Button
            size="sm"
            className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 w-full"
            onClick={() => {
              onCreateClient()
              onClose()
            }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Crear nuevo cliente
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 w-full"
          onClick={() => {
            onGlobalSearch()
            onClose()
          }}
        >
          <Search className="h-3.5 w-3.5" />
          Buscar en todo el sistema
        </Button>
      </div>
    </div>
  )
}

// Shared search results dropdown content
function SearchResultsList({
  results,
  isSearching,
  searchQuery,
  onNavigate,
  onClose,
  dniResults,
  isDniSearch,
  user,
  onCreateClient,
  onGlobalSearch,
}: {
  results: SearchResults | null
  isSearching: boolean
  searchQuery: string
  onNavigate: (type: 'client' | 'policy' | 'agent', id: string) => void
  onClose: () => void
  dniResults: DniSearchResult[] | null
  isDniSearch: boolean
  user: { id: string; role: string; permissions?: string[] } | null
  onCreateClient: () => void
  onGlobalSearch: () => void
}) {
  if (!searchQuery.trim()) return null

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Buscando...</span>
      </div>
    )
  }

  // When DNI/NIE pattern is detected, show rich DNI results
  if (isDniSearch) {
    if (dniResults && dniResults.length > 0) {
      return (
        <ScrollArea className="max-h-[28rem]">
          {dniResults.map((result) => (
            <div key={result.id} className="border-b last:border-0">
              <DniResultCard
                result={result}
                user={user}
                onNavigate={onNavigate}
                onClose={onClose}
              />
            </div>
          ))}
          {/* Also show non-client results from global search if available */}
          {results && results.policies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
                <FileCheck className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pólizas</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results.policies.length}</Badge>
              </div>
              {results.policies.map((policy) => (
                <EnhancedPolicyItem key={policy.id} policy={policy} onNavigate={onNavigate} />
              ))}
            </div>
          )}
          {results && results.agents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
                <Briefcase className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Corredores</span>
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results.agents.length}</Badge>
              </div>
              {results.agents.map((agent) => (
                <button
                  key={agent.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
                  onClick={() => onNavigate('agent', agent.id)}
                >
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <Briefcase className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{agent.name} {agent.lastName}</p>
                    {agent.position && <p className="text-xs text-gray-500 truncate">{agent.position}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      )
    }

    // DNI/NIE pattern but no results found
    return (
      <DniNotFoundCard
        onClose={onClose}
        onCreateClient={onCreateClient}
        onGlobalSearch={onGlobalSearch}
        searchQuery={searchQuery}
        canCreateClients={!user || user.role !== 'solo_lectura'}
      />
    )
  }

  // Standard (non-DNI) search results
  const hasResults = results && (
    results.clients.length > 0 ||
    results.policies.length > 0 ||
    results.agents.length > 0
  )

  if (!hasResults) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No encontramos ningún asegurado con esos datos.</p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-96">
      {/* Clients */}
      {results!.clients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clientes</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results!.clients.length}</Badge>
          </div>
          {results!.clients.map((client) => (
            <button
              key={client.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
              onClick={() => onNavigate('client', client.id)}
            >
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <UserCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{client.name} {client.lastName}</p>
                  <Badge className={`text-[9px] h-3.5 px-1 shrink-0 ${clientStatusColors[client.status] || 'bg-gray-100 text-gray-800'}`}>
                    {clientStatusLabels[client.status] || client.status}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {client.documentNumber && <span>{client.documentType || 'DNI'}: {client.documentNumber}</span>}
                  {client.phone && <span>· {client.phone}</span>}
                </div>
                {client.ownerAgent && (
                  <p className="text-[11px] text-gray-400 mt-0.5">Corredor: {client.ownerAgent.name} {client.ownerAgent.lastName}</p>
                )}
              </div>
              {client.policies && (
                <Badge variant="secondary" className="text-[9px] h-5 px-1.5 shrink-0">
                  {client.policies.length} póliza{client.policies.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Policies */}
      {results!.policies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <FileCheck className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pólizas</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results!.policies.length}</Badge>
          </div>
          {results!.policies.map((policy) => (
            <EnhancedPolicyItem key={policy.id} policy={policy} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {/* Agents (Corredores) */}
      {results!.agents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <Briefcase className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Corredores</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results!.agents.length}</Badge>
          </div>
          {results!.agents.map((agent) => (
            <button
              key={agent.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
              onClick={() => onNavigate('agent', agent.id)}
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{agent.name} {agent.lastName}</p>
                {agent.position && <p className="text-xs text-gray-500 truncate">{agent.position}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  )
}

// Enhanced policy list item with soldByAgent and client info
function EnhancedPolicyItem({ policy, onNavigate }: { policy: Policy; onNavigate: (type: 'client' | 'policy' | 'agent', id: string) => void }) {
  return (
    <button
      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
      onClick={() => onNavigate('policy', policy.id)}
    >
      <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
        <Shield className="h-4 w-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-gray-900 truncate">{policy.policyNumber}</p>
          <Badge className={`text-[9px] h-3.5 px-1 shrink-0 ${policyStatusColors[policy.status] || 'bg-gray-100 text-gray-800'}`}>
            {policy.status}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 truncate">{policy.productName}</p>
        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
          {policy.soldByAgent && <span>Vendida por: {policy.soldByAgent.name} {policy.soldByAgent.lastName}</span>}
          {policy.soldByAgent && policy.client && <span>·</span>}
          {policy.client && <span>Cliente: {policy.client.name} {policy.client.lastName}</span>}
        </div>
      </div>
    </button>
  )
}

function AppHeader() {
  const { user, token, setPage, setSelectedId, logout } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [dniResults, setDniResults] = useState<DniSearchResult[] | null>(null)
  const [isDniSearch, setIsDniSearch] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([])
  const unreadCount = notifications.filter((n) => !n.read).length
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await api.getNotifications()
        setNotifications(res.data.map(mapApiNotification))
      } catch {
        setNotifications([])
      }
    }
    fetchNotifications()
  }, [token])

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null)
      setDniResults(null)
      setIsDniSearch(false)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    const dniMode = isDniPattern(q)
    setIsDniSearch(dniMode)

    try {
      if (dniMode) {
        // For DNI/NIE queries, call both APIs in parallel
        const [globalRes, dniRes] = await Promise.allSettled([
          api.globalSearch(q),
          api.searchClientByDocument(q),
        ])
        if (globalRes.status === 'fulfilled') {
          setSearchResults(globalRes.value.data)
        } else {
          setSearchResults(null)
        }
        if (dniRes.status === 'fulfilled') {
          setDniResults(dniRes.value.data)
        } else {
          setDniResults(null)
        }
      } else {
        const res = await api.globalSearch(q)
        setSearchResults(res.data)
        setDniResults(null)
      }
    } catch {
      setSearchResults(null)
      setDniResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (!value.trim()) {
      setSearchResults(null)
      setDniResults(null)
      setIsDniSearch(false)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Close search and reset state
  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setMobileSearchOpen(false)
    setSearchQuery('')
    setSearchResults(null)
    setDniResults(null)
    setIsDniSearch(false)
  }, [])

  // Navigation handler
  const handleSearchNavigate = useCallback((type: 'client' | 'policy' | 'agent', id: string) => {
    closeSearch()

    if (type === 'client') {
      setSelectedId(id)
      setPage('client-detail')
    } else if (type === 'policy') {
      setSelectedId(id)
      setPage('policy-detail')
    } else if (type === 'agent') {
      setPage('admin')
    }
  }, [setPage, setSelectedId, closeSearch])

  // Handler for DNI not found - navigate to clients page
  const handleCreateClient = useCallback(() => {
    setPage('clients')
  }, [setPage])

  // Handler for global search - perform a non-DNI search
  const handleGlobalSearch = useCallback(() => {
    // Switch from DNI mode to global search mode
    setIsDniSearch(false)
    // Perform a normal search with the current query
    if (searchQuery.trim()) {
      performSearch(searchQuery)
    }
  }, [searchQuery, performSearch])

  // Focus mobile search input when sheet opens
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100)
    }
  }, [mobileSearchOpen])

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      if (unreadIds.length > 0) {
        await api.markNotificationsRead(unreadIds)
      }
    } catch {
      // Silently fail - UI already updated
    }
  }

  const initials = user
    ? `${user.name.charAt(0)}${user.lastName.charAt(0)}`
    : 'U'

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-white px-3 lg:px-6 sticky top-0 z-30">
      {/* Desktop sidebar trigger */}
      <SidebarTrigger className="-ml-1 hidden md:flex" />

      {/* Mobile menu button - triggers sidebar Sheet via useSidebar */}
      <MobileSidebarTrigger />

      <Separator orientation="vertical" className="h-6 hidden md:block" />

      {/* Page title - mobile */}
      <div className="flex-1 md:hidden">
        <p className="text-sm font-semibold text-gray-900 truncate">SeguriCRM</p>
      </div>

      {/* Search - desktop */}
      <div className="flex-1 max-w-md hidden md:block relative">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar clientes, pólizas, corredores..."
                className="pl-9 pr-8 bg-gray-50 border-0"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true) }}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-200"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults(null)
                    setDniResults(null)
                    setIsDniSearch(false)
                    setIsSearching(false)
                    searchInputRef.current?.focus()
                  }}
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SearchResultsList
              results={searchResults}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onNavigate={handleSearchNavigate}
              onClose={closeSearch}
              dniResults={dniResults}
              isDniSearch={isDniSearch}
              user={user}
              onCreateClient={handleCreateClient}
              onGlobalSearch={handleGlobalSearch}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Mobile search Sheet */}
        <Sheet open={mobileSearchOpen} onOpenChange={(open) => {
          setMobileSearchOpen(open)
          if (!open) {
            setSearchQuery('')
            setSearchResults(null)
            setDniResults(null)
            setIsDniSearch(false)
            setIsSearching(false)
          }
        }}>
          <SheetContent side="top" className="h-[85vh] p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>Buscar</SheetTitle>
              <SheetDescription>Busca clientes, pólizas o corredores</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={mobileSearchInputRef}
                  placeholder="Buscar clientes, pólizas, corredores..."
                  className="pl-9 pr-8 bg-gray-50 border"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-200"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults(null)
                      setDniResults(null)
                      setIsDniSearch(false)
                      setIsSearching(false)
                      mobileSearchInputRef.current?.focus()
                    }}
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="border-t">
              <SearchResultsList
                results={searchResults}
                isSearching={isSearching}
                searchQuery={searchQuery}
                onNavigate={handleSearchNavigate}
                onClose={closeSearch}
                dniResults={dniResults}
                isDniSearch={isDniSearch}
                user={user}
                onCreateClient={handleCreateClient}
                onGlobalSearch={handleGlobalSearch}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-semibold text-sm">Notificaciones</h4>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <ScrollArea className="max-h-72">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Todavía no hay notificaciones.</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${
                      !notif.read ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                      )}
                      <div className={!notif.read ? '' : 'ml-4'}>
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-600 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline text-sm font-medium text-gray-700">
                {user?.name} {user?.lastName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">{user?.name} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
                  {user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPage('profile')}>
              <User className="mr-2 h-4 w-4" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPage('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div
        className="flex min-h-screen w-full"
        style={{
          '--sidebar-width': '16rem',
          '--sidebar': '#111827',
          '--sidebar-foreground': '#f3f4f6',
          '--sidebar-primary': '#10b981',
          '--sidebar-primary-foreground': '#ffffff',
          '--sidebar-accent': '#1e293b',
          '--sidebar-accent-foreground': '#f3f4f6',
          '--sidebar-border': '#374151',
          '--sidebar-ring': '#10b981',
        } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className="flex-1">
          <AppHeader />
          <main className="flex-1 p-3 md:p-4 lg:p-6 bg-gray-50 min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-3.5rem)] pb-20 md:pb-6 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
      {/* Mobile bottom navigation */}
      <BottomNavigation />
      {/* Mobile FAB */}
      <FAB />
    </SidebarProvider>
  )
}
