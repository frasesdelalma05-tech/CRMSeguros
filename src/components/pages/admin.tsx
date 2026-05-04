'use client'

import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { api, type AdminUser, type AuditLogEntry, type Client, type Policy } from '@/lib/api'
import {
  Plus, Users, Eye, Pencil, RefreshCw,
  UserCheck, UserX, Search, Loader2, ChevronDown,
  ChevronUp, Filter, Lock, Activity,
  BarChart3, ShieldCheck, ClipboardList, KeyRound,
  UserCircle, UserPlus, Briefcase, FileText,
  ToggleLeft, ToggleRight, ArrowRightLeft,
} from 'lucide-react'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { format, formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'

// ============================================================
// ROLE CONFIG
// ============================================================
const roleConfig: Record<string, { label: string; color: string; description: string; highlights: string[] }> = {
  super_administrador: { label: 'Super Administrador', color: 'bg-red-100 text-red-700', description: 'Control total del sistema. Puede crear administradores y corredores. Cambiar propietario de clientes y pólizas. Ver auditoría. Eliminar datos sensibles.', highlights: ['Control total', 'Crear admins', 'Eliminar datos'] },
  administrador: { label: 'Administrador', color: 'bg-emerald-100 text-emerald-700', description: 'Puede crear corredores/agentes y asignar clientes y pólizas. No puede crear administradores ni eliminar datos sensibles.', highlights: ['Crear corredores', 'Reasignar', 'Ver auditoría'] },
  corredor: { label: 'Corredor/Agente', color: 'bg-teal-100 text-teal-700', description: 'Corredor/Agente de seguros. Gestiona clientes, citas, oportunidades y pólizas asignadas. Puede buscar por DNI/NIE.', highlights: ['Gestionar clientes', 'Vender pólizas', 'Buscar DNI/NIE'] },
  atencion_cliente: { label: 'Atención al Cliente', color: 'bg-purple-100 text-purple-700', description: 'Busca clientes por DNI/NIE, ve datos básicos, crea incidencias y registra llamadas/notas. No puede modificar pólizas ni eliminar datos.', highlights: ['Buscar DNI/NIE', 'Crear incidencias', 'Registrar llamadas'] },
  solo_lectura: { label: 'Solo Lectura', color: 'bg-gray-100 text-gray-700', description: 'Puede consultar información permitida. No puede crear, editar ni borrar.', highlights: ['Solo consulta', 'Sin edición'] },
}

const allRoleKeys = Object.keys(roleConfig)

// ============================================================
// TYPES
// ============================================================
interface AgentUser extends AdminUser {
  _count: {
    assignedClients: number
    soldPolicies: number
    ownedPolicies: number
    assignedLeads: number
  }
  manager?: { id: string; name: string; lastName: string } | null
  documentType?: string
  documentNumber?: string
  office?: string
}

interface AdminUserExtended extends AdminUser {
  documentType?: string
  documentNumber?: string
  office?: string
  createdById?: string
  managerId?: string
  manager?: { id: string; name: string; lastName: string } | null
  createdBy?: { id: string; name: string; lastName: string } | null
  _count?: {
    managedUsers: number
    assignedClients: number
    soldPolicies: number
    ownedPolicies: number
  }
}

interface RoleData {
  id: string
  name: string
  description?: string
  permissions: { id: string; name: string; module: string; action: string }[]
  _count: { users: number }
}

interface AdminSummary {
  totalAdmins: number
  totalCorredores: number
  corredoresActivos: number
  corredoresInactivos: number
  totalClientes: number
  totalPolizas: number
  primaTotalEstimada: number
}

interface CreateAdminForm {
  name: string
  lastName: string
  email: string
  phone: string
  documentType: string
  documentNumber: string
  password: string
  confirmPassword: string
  position: string
  office: string
  isActive: boolean
}

interface CreateAgentFormData {
  name: string
  lastName: string
  email: string
  phone: string
  documentType: string
  documentNumber: string
  password: string
  confirmPassword: string
  position: string
  office: string
  managerId: string
  isActive: boolean
}

interface CreateUserForm {
  name: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  position: string
  documentType: string
  documentNumber: string
  office: string
  roleId: string
}

interface EditUserForm {
  name: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  phone: string
  position: string
  documentType: string
  documentNumber: string
  office: string
}

const emptyCreateAdminForm: CreateAdminForm = {
  name: '', lastName: '', email: '', phone: '',
  documentType: 'DNI', documentNumber: '',
  password: '', confirmPassword: '',
  position: '', office: '', isActive: true,
}

const emptyCreateAgentForm: CreateAgentFormData = {
  name: '', lastName: '', email: '', phone: '',
  documentType: 'DNI', documentNumber: '',
  password: '', confirmPassword: '',
  position: 'Corredor de Seguros', office: '',
  managerId: '', isActive: true,
}

const emptyCreateUserForm: CreateUserForm = {
  name: '', lastName: '', email: '', password: '', confirmPassword: '',
  phone: '', position: '', documentType: 'DNI', documentNumber: '',
  office: '', roleId: '',
}

// Audit log filter options
const auditActionOptions = [
  { value: '', label: 'Todas las acciones' },
  { value: 'create', label: 'Crear' },
  { value: 'update', label: 'Actualizar' },
  { value: 'delete', label: 'Eliminar' },
  { value: 'login', label: 'Login' },
  { value: 'search_dni', label: 'Búsqueda DNI' },
  { value: 'search_global', label: 'Búsqueda global' },
  { value: 'reassign', label: 'Reasignar' },
  { value: 'deactivate', label: 'Desactivar' },
  { value: 'activate', label: 'Activar' },
  { value: 'change_role', label: 'Cambiar rol' },
  { value: 'create_duplicate', label: 'Crear duplicado' },
]

const auditEntityOptions = [
  { value: '', label: 'Todas las entidades' },
  { value: 'user', label: 'Usuario' },
  { value: 'client', label: 'Cliente' },
  { value: 'policy', label: 'Póliza' },
  { value: 'lead', label: 'Lead' },
  { value: 'agent', label: 'Agente' },
  { value: 'system', label: 'Sistema' },
]

const documentTypeOptions = [
  { value: 'DNI', label: 'DNI' },
  { value: 'NIE', label: 'NIE' },
  { value: 'PASSPORT', label: 'Pasaporte' },
]

// ============================================================
// HELPER: Get role/status badges
// ============================================================
const getRoleBadge = (roleName: string) => {
  const config = roleConfig[roleName]
  if (config) {
    return <Badge className={`${config.color} border-0 text-[10px] sm:text-xs`}>{config.label}</Badge>
  }
  return <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px] sm:text-xs">{roleName}</Badge>
}

const getStatusBadge = (isActive: boolean) => (
  <Badge className={isActive ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px] sm:text-xs' : 'bg-gray-100 text-gray-500 border-0 text-[10px] sm:text-xs'}>
    {isActive ? 'Activo' : 'Inactivo'}
  </Badge>
)

// ============================================================
// ROLE SELECTOR CARDS
// ============================================================
const RoleSelectorCards = ({
  selectedRoleId,
  onSelectRoleId,
  availableRoleNames,
  allRoleNames,
  roles,
}: {
  selectedRoleId: string
  onSelectRoleId: (roleId: string) => void
  availableRoleNames: string[]
  allRoleNames?: string[]
  roles: RoleData[]
}) => {
  const displayRoles = allRoleNames || availableRoleNames
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {displayRoles.map((roleName) => {
        const config = roleConfig[roleName]
        if (!config) return null
        const roleObj = roles.find((r) => r.name === roleName)
        const roleId = roleObj?.id || ''
        const isAvailable = availableRoleNames.includes(roleName)
        const isSelected = isAvailable && selectedRoleId === roleId
        const userCount = roleObj?._count?.users ?? 0
        return (
          <button
            key={roleName}
            type="button"
            onClick={() => isAvailable && roleId ? onSelectRoleId(roleId) : undefined}
            disabled={!isAvailable}
            className={`text-left p-3 rounded-lg border-2 transition-all relative ${
              !isAvailable
                ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                : isSelected
                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500'
                  : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge className={`${config.color} border-0 text-[10px]`}>{config.label}</Badge>
              {isSelected && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center ml-auto">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
              {!isAvailable && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 ml-auto text-gray-400">
                      <Lock className="h-3.5 w-3.5" />
                      <span className="text-[10px]">No disponible</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>No tienes permiso para asignar este rol</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-2">{config.description}</p>
            <div className="flex flex-wrap gap-1 mb-1.5">
              {config.highlights.map((h) => (
                <span key={h} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${!isAvailable ? 'bg-gray-100 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                  {h}
                </span>
              ))}
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-400">
              <Users className="h-3 w-3" />
              <span>{userCount} {userCount === 1 ? 'usuario' : 'usuarios'}</span>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ============================================================
// VIEW USER CONTENT
// ============================================================
const ViewUserContent = ({ user: u }: { user: AdminUser }) => {
  const permissionsByModule = (u.permissions || []).reduce<Record<string, typeof u.permissions>>((acc, p) => {
    if (!acc[p.module]) acc[p.module] = []
    acc[p.module].push(p)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Nombre</p>
          <p className="text-sm font-medium">{u.name} {u.lastName || ''}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm font-medium">{u.email}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Teléfono</p>
          <p className="text-sm font-medium">{u.phone || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Cargo</p>
          <p className="text-sm font-medium">{u.position || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Rol</p>
          <div className="mt-0.5">
            {getRoleBadge(u.role?.name || '')}
            {u.role?.description && <p className="text-xs text-gray-400 mt-1">{u.role.description}</p>}
          </div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Estado</p>
          <div className="mt-0.5">{getStatusBadge(u.isActive)}</div>
        </div>
        <div>
          <p className="text-xs text-gray-500">Fecha de creación</p>
          <p className="text-sm font-medium">{format(new Date(u.createdAt), 'dd/MM/yyyy')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Último acceso</p>
          <p className="text-sm font-medium">{u.lastLogin ? format(new Date(u.lastLogin), 'dd/MM/yyyy HH:mm') : 'Nunca'}</p>
        </div>
      </div>
      {Object.keys(permissionsByModule).length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Permisos</p>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {Object.entries(permissionsByModule).map(([module, perms]) => (
                <div key={module}>
                  <p className="text-xs font-semibold text-gray-600 capitalize mb-1">{module}</p>
                  <div className="flex flex-wrap gap-1">
                    {perms.map((p) => (
                      <Badge key={p.id} variant="outline" className="text-[10px]">{p.action}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// DOCUMENT TYPE SELECTOR
// ============================================================
const DocumentTypeSelector = ({
  value,
  onChange,
  documentNumber,
  onDocumentNumberChange,
  isMobile,
}: {
  value: string
  onChange: (v: string) => void
  documentNumber: string
  onDocumentNumberChange: (v: string) => void
  isMobile: boolean
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    <div className="space-y-1.5">
      <Label className="text-sm">Tipo documento</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className={isMobile ? 'h-11' : ''}>
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          {documentTypeOptions.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5 sm:col-span-2">
      <Label className="text-sm">Nº documento</Label>
      <Input
        className={isMobile ? 'h-11' : ''}
        value={documentNumber}
        onChange={(e) => onDocumentNumberChange(e.target.value)}
        placeholder="12345678A"
      />
    </div>
  </div>
)

// ============================================================
// LOADING SKELETONS
// ============================================================
const StatCardSkeleton = () => (
  <Card>
    <CardContent className="p-4">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </CardContent>
  </Card>
)

const TableRowSkeleton = () => (
  <TableRow>
    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
  </TableRow>
)

// ============================================================
// EMPTY STATES
// ============================================================
const EmptyState = ({ icon: Icon, message }: { icon: React.ElementType; message: string }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
      <Icon className="h-8 w-8 text-gray-400" />
    </div>
    <p className="text-sm text-gray-500 max-w-xs">{message}</p>
  </div>
)

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminPage() {
  const { user: currentUser, token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  // Permission helpers
  const isSuperAdmin = currentUser?.role === 'super_administrador'
  const isAdmin = currentUser?.role === 'administrador' || isSuperAdmin
  const assignableRoles = allRoleKeys.filter((key) => {
    if (isSuperAdmin) return true
    if (isAdmin) return key !== 'super_administrador' && key !== 'administrador'
    return false
  })

  // ---- DATA STATE ----
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  const [admins, setAdmins] = useState<AdminUserExtended[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)

  const [agents, setAgents] = useState<AgentUser[]>([])
  const [totalAgents, setTotalAgents] = useState(0)
  const [agentsPage, setAgentsPage] = useState(1)
  const [agentsSearch, setAgentsSearch] = useState('')
  const [agentsAdminFilter, setAgentsAdminFilter] = useState('')
  const [loadingAgents, setLoadingAgents] = useState(true)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersPage, setUsersPage] = useState(1)
  const [usersSearch, setUsersSearch] = useState('')
  const [usersRoleFilter, setUsersRoleFilter] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)

  const [roles, setRoles] = useState<RoleData[]>([])

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [totalAuditLogs, setTotalAuditLogs] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  const [auditActionFilter, setAuditActionFilter] = useState('')
  const [auditEntityFilter, setAuditEntityFilter] = useState('')
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(true)
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null)

  // ---- UI STATE ----
  const [_fetchVersion, setFetchVersion] = useState(0)
  const triggerRefresh = useCallback(() => setFetchVersion((v) => v + 1), [])
  const [activeTab, setActiveTab] = useState('resumen')
  const [saving, setSaving] = useState(false)

  // Admin dialogs
  const [createAdminOpen, setCreateAdminOpen] = useState(false)
  const [editAdminOpen, setEditAdminOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<AdminUserExtended | null>(null)
  const [editAdminForm, setEditAdminForm] = useState<CreateAdminForm>(emptyCreateAdminForm)
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showEditAdminPassword, setShowEditAdminPassword] = useState(false)
  const [createAdminForm, setCreateAdminForm] = useState<CreateAdminForm>(emptyCreateAdminForm)

  // Agent dialogs
  const [createAgentOpen, setCreateAgentOpen] = useState(false)
  const [editAgentOpen, setEditAgentOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<AgentUser | null>(null)
  const [editAgentForm, setEditAgentForm] = useState<CreateAgentFormData>(emptyCreateAgentForm)
  const [showAgentPassword, setShowAgentPassword] = useState(false)
  const [showEditAgentPassword, setShowEditAgentPassword] = useState(false)
  const [createAgentForm, setCreateAgentForm] = useState<CreateAgentFormData>(emptyCreateAgentForm)

  // Agent portfolio/ficha
  const [fichaOpen, setFichaOpen] = useState(false)
  const [fichaAgent, setFichaAgent] = useState<AgentUser | null>(null)
  const [fichaClients, setFichaClients] = useState<Client[]>([])
  const [fichaPolicies, setFichaPolicies] = useState<Policy[]>([])
  const [fichaLoading, setFichaLoading] = useState(false)

  // User dialogs
  const [createUserOpen, setCreateUserOpen] = useState(false)
  const [editUserOpen, setEditUserOpen] = useState(false)
  const [viewUserOpen, setViewUserOpen] = useState(false)
  const [changeRoleOpen, setChangeRoleOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateUserForm>(emptyCreateUserForm)
  const [editForm, setEditForm] = useState<EditUserForm>({ name: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', position: '', documentType: 'DNI', documentNumber: '', office: '' })
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [viewingUser, setViewingUser] = useState<AdminUser | null>(null)
  const [changingRoleUser, setChangingRoleUser] = useState<AdminUser | null>(null)
  const [selectedNewRole, setSelectedNewRole] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // Reset password dialog
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Confirm dialog
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    variant?: 'destructive' | 'default'
  }>({ open: false, title: '', description: '', onConfirm: () => {} })

  // ============================================================
  // DATA FETCHING
  // ============================================================

  // Summary
  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      try {
        setLoadingSummary(true)
        const res = await api.getAdminSummary()
        if (!cancelled) setSummary(res.data)
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoadingSummary(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, _fetchVersion])

  // Helper to get role ID from loaded roles
  const getRoleId = useCallback((name: string) => roles.find((r) => r.name === name)?.id, [roles])

  // Admins
  useEffect(() => {
    if (!token || !isSuperAdmin) return
    let cancelled = false
    async function load() {
      try {
        setLoadingAdmins(true)
        const res = await api.getUsers({ role: 'administrador', limit: '100' })
        if (!cancelled) setAdmins(res.data as unknown as AdminUserExtended[])
      } catch (err: any) {
        if (!cancelled) toast({ title: 'Error al cargar administradores', description: err.message, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoadingAdmins(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, isSuperAdmin, toast, _fetchVersion])

  // Agents
  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      try {
        setLoadingAgents(true)
        const params: Record<string, string> = { page: String(agentsPage), limit: '20' }
        if (agentsSearch) params.search = agentsSearch
        if (agentsAdminFilter) params.managerId = agentsAdminFilter
        const res = await api.getAgents(params)
        if (!cancelled) {
          setAgents(res.data as AgentUser[])
          setTotalAgents(res.total)
        }
      } catch (err: any) {
        if (!cancelled) toast({ title: 'Error al cargar corredores', description: err.message, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoadingAgents(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, agentsPage, agentsSearch, agentsAdminFilter, toast, _fetchVersion])

  // Users
  useEffect(() => {
    if (!token || !isSuperAdmin) return
    let cancelled = false
    async function load() {
      try {
        setLoadingUsers(true)
        const params: Record<string, string> = { page: String(usersPage), limit: '20' }
        if (usersSearch) params.search = usersSearch
        if (usersRoleFilter) params.role = usersRoleFilter
        const res = await api.getUsers(params)
        if (!cancelled) {
          setUsers(res.data)
          setTotalUsers(res.total)
        }
      } catch (err: any) {
        if (!cancelled) toast({ title: 'Error al cargar usuarios', description: err.message, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoadingUsers(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, usersPage, usersSearch, usersRoleFilter, isSuperAdmin, toast, _fetchVersion])

  // Roles
  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.getRoles()
        if (!cancelled) setRoles(res.data)
      } catch { /* non-critical */ }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  // Audit logs
  useEffect(() => {
    if (!token) return
    let cancelled = false
    async function load() {
      try {
        setLoadingAuditLogs(true)
        const params: Record<string, string> = { page: String(auditPage), limit: '20' }
        if (auditActionFilter) params.action = auditActionFilter
        if (auditEntityFilter) params.entity = auditEntityFilter
        const res = await api.getAuditLogs(params)
        if (!cancelled) {
          setAuditLogs(res.data)
          setTotalAuditLogs(res.total)
        }
      } catch (err: any) {
        if (!cancelled) toast({ title: 'Error al cargar auditoría', description: err.message, variant: 'destructive' })
      } finally {
        if (!cancelled) setLoadingAuditLogs(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, auditPage, auditActionFilter, auditEntityFilter, toast, _fetchVersion])

  // Refresh helpers
  const refreshAll = useCallback(() => {
    triggerRefresh()
  }, [triggerRefresh])

  // ============================================================
  // TAB 1: RESUMEN
  // ============================================================
  const renderResumen = () => {
    if (loadingSummary) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => <StatCardSkeleton key={i} />)}
        </div>
      )
    }

    const stats = [
      { label: 'Total administradores', value: summary?.totalAdmins ?? 0, icon: ShieldCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
      { label: 'Total corredores', value: summary?.totalCorredores ?? 0, icon: Briefcase, color: 'text-teal-600', bg: 'bg-teal-50' },
      { label: 'Corredores activos', value: summary?.corredoresActivos ?? 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'Corredores inactivos', value: summary?.corredoresInactivos ?? 0, icon: UserX, color: 'text-gray-500', bg: 'bg-gray-50' },
      { label: 'Total clientes', value: summary?.totalClientes ?? 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
      { label: 'Total pólizas', value: summary?.totalPolizas ?? 0, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
      { label: 'Prima total estimada', value: `${(summary?.primaTotalEstimada ?? 0).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}`, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
    ]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Resumen del sistema</h2>
          <Button variant="outline" size="sm" onClick={refreshAll}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 leading-tight">{stat.label}</p>
                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // ============================================================
  // TAB 2: ADMINISTRADORES
  // ============================================================
  const handleCreateAdmin = async () => {
    if (!createAdminForm.name.trim() || !createAdminForm.email.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    if (!createAdminForm.password || createAdminForm.password.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (createAdminForm.password !== createAdminForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    const adminRoleId = getRoleId('administrador')
    if (!adminRoleId) {
      toast({ title: 'Error', description: 'Rol de administrador no encontrado', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await api.createUser({
        name: createAdminForm.name,
        lastName: createAdminForm.lastName || undefined,
        email: createAdminForm.email,
        password: createAdminForm.password,
        phone: createAdminForm.phone || undefined,
        position: createAdminForm.position || undefined,
        roleId: adminRoleId,
        documentType: createAdminForm.documentType,
        documentNumber: createAdminForm.documentNumber || undefined,
        office: createAdminForm.office || undefined,
        isActive: createAdminForm.isActive,
      })
      toast({ title: 'Administrador creado', description: 'El administrador se ha creado correctamente' })
      setCreateAdminOpen(false)
      setCreateAdminForm(emptyCreateAdminForm)
      setShowAdminPassword(false)
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al crear administrador', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditAdmin = async () => {
    if (!editingAdmin) return
    if (!editAdminForm.name.trim() || !editAdminForm.email.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    if (editAdminForm.password && editAdminForm.password.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (editAdminForm.password && editAdminForm.password !== editAdminForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      const data: Record<string, unknown> = {
        name: editAdminForm.name,
        lastName: editAdminForm.lastName || null,
        email: editAdminForm.email,
        phone: editAdminForm.phone || null,
        position: editAdminForm.position || null,
        documentType: editAdminForm.documentType,
        documentNumber: editAdminForm.documentNumber || null,
        office: editAdminForm.office || null,
      }
      if (editAdminForm.password) data.password = editAdminForm.password
      await api.updateUser(editingAdmin.id, data)
      toast({ title: 'Administrador actualizado', description: 'Los datos se han actualizado correctamente' })
      setEditAdminOpen(false)
      setEditingAdmin(null)
      setShowEditAdminPassword(false)
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al actualizar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openEditAdmin = (admin: AdminUserExtended) => {
    setEditingAdmin(admin)
    setEditAdminForm({
      name: admin.name,
      lastName: admin.lastName || '',
      email: admin.email,
      phone: admin.phone || '',
      documentType: (admin as any).documentType || 'DNI',
      documentNumber: (admin as any).documentNumber || '',
      password: '',
      confirmPassword: '',
      position: admin.position || '',
      office: (admin as any).office || '',
      isActive: admin.isActive,
    })
    setEditAdminOpen(true)
  }

  const renderAdministradores = () => {
    if (!isSuperAdmin) return null

    const adminContent = () => {
      if (loadingAdmins) {
        return (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}
          </div>
        )
      }
      if (admins.length === 0) {
        return <EmptyState icon={ShieldCheck} message="Todavía no hay administradores registrados." />
      }

      if (isMobile) {
        return (
          <div className="space-y-3">
            {admins.map((admin) => (
              <Card key={admin.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{admin.name} {admin.lastName || ''}</p>
                      <p className="text-xs text-gray-500">{admin.email}</p>
                    </div>
                    {getStatusBadge(admin.isActive)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Teléfono:</span> {admin.phone || '—'}</div>
                    <div><span className="text-gray-500">DNI/NIE:</span> {(admin as any).documentNumber || '—'}</div>
                    <div><span className="text-gray-500">Cargo:</span> {admin.position || '—'}</div>
                    <div><span className="text-gray-500">Oficina:</span> {(admin as any).office || '—'}</div>
                    <div><span className="text-gray-500">Último acceso:</span> {admin.lastLogin ? format(new Date(admin.lastLogin), 'dd/MM/yy') : 'Nunca'}</div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => openEditAdmin(admin)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenResetPassword(admin as any)}><KeyRound className="h-3 w-3 mr-1" />Reset</Button>
                    <Button size="sm" variant={admin.isActive ? 'outline' : 'default'} onClick={() => handleToggleAdminStatus(admin as any)}>
                      {admin.isActive ? <UserX className="h-3 w-3 mr-1" /> : <UserCheck className="h-3 w-3 mr-1" />}
                      {admin.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>DNI/NIE</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((admin) => (
                <TableRow key={admin.id}>
                  <TableCell className="font-medium">{admin.name} {admin.lastName || ''}</TableCell>
                  <TableCell className="text-sm">{admin.email}</TableCell>
                  <TableCell className="text-sm">{admin.phone || '—'}</TableCell>
                  <TableCell className="text-sm">{(admin as any).documentNumber || '—'}</TableCell>
                  <TableCell>{getStatusBadge(admin.isActive)}</TableCell>
                  <TableCell className="text-sm">{admin.lastLogin ? format(new Date(admin.lastLogin), 'dd/MM/yy HH:mm') : 'Nunca'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEditAdmin(admin)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenResetPassword(admin as any)} title="Reset contraseña"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleAdminStatus(admin as any)} title={admin.isActive ? 'Desactivar' : 'Activar'}>
                        {admin.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Administradores</h2>
          <Button onClick={() => { setCreateAdminForm(emptyCreateAdminForm); setCreateAdminOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo administrador
          </Button>
        </div>
        {adminContent()}
      </div>
    )
  }

  const handleToggleAdminStatus = (admin: AdminUser) => {
    if (admin.id === currentUser?.id) {
      toast({ title: 'Acción no permitida', description: 'No puedes cambiar tu propio estado', variant: 'destructive' })
      return
    }
    const fullName = `${admin.name} ${admin.lastName || ''}`.trim()
    setConfirmDialog({
      open: true,
      title: admin.isActive ? '¿Desactivar administrador?' : '¿Activar administrador?',
      description: admin.isActive ? `¿Desactivar a ${fullName}? No podrá iniciar sesión.` : `¿Activar a ${fullName}?`,
      variant: admin.isActive ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await api.toggleUserStatus(admin.id)
          toast({ title: `Administrador ${admin.isActive ? 'desactivado' : 'activado'}` })
          triggerRefresh()
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' })
        }
      },
    })
  }

  // ============================================================
  // TAB 3: CORREDORES
  // ============================================================
  const handleCreateAgent = async () => {
    if (!createAgentForm.name.trim() || !createAgentForm.email.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    if (!createAgentForm.password || createAgentForm.password.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (createAgentForm.password !== createAgentForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      const positionParts = [createAgentForm.position]
      if (createAgentForm.office.trim()) positionParts.push(`Zona ${createAgentForm.office.trim()}`)
      await api.createAgent({
        name: createAgentForm.name,
        lastName: createAgentForm.lastName || undefined,
        email: createAgentForm.email,
        password: createAgentForm.password,
        phone: createAgentForm.phone || undefined,
        position: positionParts.join(' - ') || undefined,
        isActive: createAgentForm.isActive,
        documentType: createAgentForm.documentType,
        documentNumber: createAgentForm.documentNumber || undefined,
        office: createAgentForm.office || undefined,
        managerId: createAgentForm.managerId || undefined,
      })
      toast({ title: 'Corredor creado', description: 'El corredor/agente se ha creado correctamente' })
      setCreateAgentOpen(false)
      setCreateAgentForm(emptyCreateAgentForm)
      setShowAgentPassword(false)
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al crear corredor', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditAgent = async () => {
    if (!editingAgent) return
    if (!editAgentForm.name.trim() || !editAgentForm.email.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    if (editAgentForm.password && editAgentForm.password.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (editAgentForm.password && editAgentForm.password !== editAgentForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      const data: Record<string, unknown> = {
        name: editAgentForm.name,
        lastName: editAgentForm.lastName || null,
        email: editAgentForm.email,
        phone: editAgentForm.phone || null,
        position: editAgentForm.position || null,
        documentType: editAgentForm.documentType,
        documentNumber: editAgentForm.documentNumber || null,
        office: editAgentForm.office || null,
      }
      if (editAgentForm.password) data.password = editAgentForm.password
      await api.updateAgent(editingAgent.id, data)
      toast({ title: 'Corredor actualizado', description: 'Los datos se han actualizado correctamente' })
      setEditAgentOpen(false)
      setEditingAgent(null)
      setShowEditAgentPassword(false)
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al actualizar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const openEditAgent = (agent: AgentUser) => {
    setEditingAgent(agent)
    setEditAgentForm({
      name: agent.name,
      lastName: agent.lastName || '',
      email: agent.email,
      phone: agent.phone || '',
      documentType: agent.documentType || 'DNI',
      documentNumber: agent.documentNumber || '',
      password: '',
      confirmPassword: '',
      position: agent.position || '',
      office: agent.office || '',
      managerId: agent.manager?.id || '',
      isActive: agent.isActive,
    })
    setEditAgentOpen(true)
  }

  const openFicha = async (agent: AgentUser) => {
    setFichaAgent(agent)
    setFichaOpen(true)
    setFichaLoading(true)
    try {
      const res = await api.getAgentPortfolio(agent.id)
      setFichaClients(res.data.clients)
      setFichaPolicies(res.data.policies)
    } catch (err: any) {
      toast({ title: 'Error al cargar cartera', description: err.message, variant: 'destructive' })
      setFichaClients([])
      setFichaPolicies([])
    } finally {
      setFichaLoading(false)
    }
  }

  const handleToggleAgentStatus = (agent: AgentUser) => {
    const fullName = `${agent.name} ${agent.lastName || ''}`.trim()
    setConfirmDialog({
      open: true,
      title: agent.isActive ? '¿Desactivar corredor?' : '¿Activar corredor?',
      description: agent.isActive ? `¿Desactivar a ${fullName}? No podrá iniciar sesión ni recibir asignaciones.` : `¿Activar a ${fullName}?`,
      variant: agent.isActive ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await api.toggleAgentStatus(agent.id)
          toast({ title: `Corredor ${agent.isActive ? 'desactivado' : 'activado'}` })
          triggerRefresh()
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' })
        }
      },
    })
  }

  const renderCorredores = () => {
    const corredorContent = () => {
      if (loadingAgents) {
        return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}</div>
      }
      if (agents.length === 0) {
        return <EmptyState icon={Briefcase} message="Todavía no hay corredores registrados." />
      }

      if (isMobile) {
        return (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Card key={agent.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{agent.name} {agent.lastName || ''}</p>
                      <p className="text-xs text-gray-500">{agent.email}</p>
                    </div>
                    {getStatusBadge(agent.isActive)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Teléfono:</span> {agent.phone || '—'}</div>
                    <div><span className="text-gray-500">DNI/NIE:</span> {agent.documentNumber || '—'}</div>
                    {isSuperAdmin && agent.manager && <div className="col-span-2"><span className="text-gray-500">Admin:</span> {agent.manager.name} {agent.manager.lastName}</div>}
                    <div><span className="text-gray-500">Clientes:</span> {agent._count?.assignedClients ?? 0}</div>
                    <div><span className="text-gray-500">Pólizas:</span> {agent._count?.ownedPolicies ?? 0}</div>
                  </div>
                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => openFicha(agent)}><Eye className="h-3 w-3 mr-1" />Ficha</Button>
                    <Button size="sm" variant="outline" onClick={() => openEditAgent(agent)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenResetPassword(agent as any)}><KeyRound className="h-3 w-3" /></Button>
                    <Button size="sm" variant={agent.isActive ? 'outline' : 'default'} onClick={() => handleToggleAgentStatus(agent)}>
                      {agent.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>DNI/NIE</TableHead>
                {isSuperAdmin && <TableHead>Admin responsable</TableHead>}
                <TableHead>Estado</TableHead>
                <TableHead>Clientes</TableHead>
                <TableHead>Pólizas</TableHead>
                <TableHead>Última actividad</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell className="font-medium">{agent.name} {agent.lastName || ''}</TableCell>
                  <TableCell className="text-sm">{agent.email}</TableCell>
                  <TableCell className="text-sm">{agent.phone || '—'}</TableCell>
                  <TableCell className="text-sm">{agent.documentNumber || '—'}</TableCell>
                  {isSuperAdmin && <TableCell className="text-sm">{agent.manager ? `${agent.manager.name} ${agent.manager.lastName}` : '—'}</TableCell>}
                  <TableCell>{getStatusBadge(agent.isActive)}</TableCell>
                  <TableCell className="text-sm">{agent._count?.assignedClients ?? 0}</TableCell>
                  <TableCell className="text-sm">{agent._count?.ownedPolicies ?? 0}</TableCell>
                  <TableCell className="text-sm">{agent.lastLogin ? formatDistanceToNow(new Date(agent.lastLogin), { addSuffix: true, locale: es }) : 'Nunca'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openFicha(agent)} title="Ver ficha"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditAgent(agent)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenResetPassword(agent as any)} title="Reset contraseña"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleAgentStatus(agent)} title={agent.isActive ? 'Desactivar' : 'Activar'}>
                        {agent.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Corredores</h2>
          <Button onClick={() => {
            setCreateAgentForm({
              ...emptyCreateAgentForm,
              managerId: !isSuperAdmin && currentUser?.id ? currentUser.id : '',
            })
            setCreateAgentOpen(true)
          }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo corredor
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Buscar corredores..."
              value={agentsSearch}
              onChange={(e) => { setAgentsSearch(e.target.value); setAgentsPage(1) }}
            />
          </div>
          {isSuperAdmin && (
            <Select value={agentsAdminFilter} onValueChange={(v) => { setAgentsAdminFilter(v === '__all__' ? '' : v); setAgentsPage(1) }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por admin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos los admins</SelectItem>
                {admins.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} {a.lastName || ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {corredorContent()}

        {/* Pagination */}
        {totalAgents > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Mostrando {(agentsPage - 1) * 20 + 1}-{Math.min(agentsPage * 20, totalAgents)} de {totalAgents}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={agentsPage === 1} onClick={() => setAgentsPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={agentsPage * 20 >= totalAgents} onClick={() => setAgentsPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // TAB 4: USUARIOS
  // ============================================================
  const handleCreateUser = async () => {
    if (!createForm.name.trim() || !createForm.email.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    if (!createForm.password || createForm.password.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (createForm.password !== createForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    if (!createForm.roleId) {
      toast({ title: 'Campo requerido', description: 'Debe seleccionar un rol', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await api.createUser({
        name: createForm.name,
        lastName: createForm.lastName || undefined,
        email: createForm.email,
        password: createForm.password,
        phone: createForm.phone || undefined,
        position: createForm.position || undefined,
        roleId: createForm.roleId,
        documentType: createForm.documentType,
        documentNumber: createForm.documentNumber || undefined,
        office: createForm.office || undefined,
      })
      toast({ title: 'Usuario creado', description: 'El usuario se ha creado correctamente' })
      setCreateUserOpen(false)
      setCreateForm(emptyCreateUserForm)
      setShowPassword(false)
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al crear usuario', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleEditUser = async () => {
    if (!editingUser) return
    if (!editForm.name.trim() || !editForm.email.trim()) {
      toast({ title: 'Campos requeridos', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    if (editForm.password && editForm.password.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (editForm.password && editForm.password !== editForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      const data: Record<string, unknown> = {
        name: editForm.name,
        lastName: editForm.lastName || null,
        email: editForm.email,
        phone: editForm.phone || null,
        position: editForm.position || null,
        documentType: editForm.documentType,
        documentNumber: editForm.documentNumber || null,
        office: editForm.office || null,
      }
      if (editForm.password) data.password = editForm.password
      await api.updateUser(editingUser.id, data)
      toast({ title: 'Usuario actualizado', description: 'Los datos se han actualizado correctamente' })
      setEditUserOpen(false)
      setEditingUser(null)
      setShowEditPassword(false)
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al actualizar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleViewUser = async (userId: string) => {
    try {
      const res = await api.getUser(userId)
      setViewingUser(res.data)
      setViewUserOpen(true)
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' })
    }
  }

  const openEditUser = (u: AdminUser) => {
    setEditingUser(u)
    setEditForm({
      name: u.name, lastName: u.lastName || '', email: u.email,
      password: '', confirmPassword: '',
      phone: u.phone || '', position: u.position || '',
      documentType: (u as any).documentType || 'DNI',
      documentNumber: (u as any).documentNumber || '',
      office: (u as any).office || '',
    })
    setEditUserOpen(true)
  }

  const handleChangeRole = async () => {
    if (!changingRoleUser || !selectedNewRole) return
    try {
      setSaving(true)
      await api.updateUserRole(changingRoleUser.id, selectedNewRole)
      const newRoleObj = roles.find((r) => r.id === selectedNewRole)
      toast({ title: 'Rol actualizado', description: `Se asignó el rol de ${roleConfig[newRoleObj?.name || '']?.label || newRoleObj?.name || ''}` })
      setChangeRoleOpen(false)
      setChangingRoleUser(null)
      setSelectedNewRole('')
      triggerRefresh()
    } catch (err: any) {
      toast({ title: 'Error al cambiar rol', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleUserStatus = (targetUser: AdminUser) => {
    if (targetUser.id === currentUser?.id) {
      toast({ title: 'Acción no permitida', description: 'No puedes cambiar tu propio estado', variant: 'destructive' })
      return
    }
    const fullName = `${targetUser.name} ${targetUser.lastName || ''}`.trim()
    setConfirmDialog({
      open: true,
      title: targetUser.isActive ? '¿Desactivar usuario?' : '¿Activar usuario?',
      description: targetUser.isActive ? `¿Desactivar a ${fullName}? No podrá iniciar sesión.` : `¿Activar a ${fullName}?`,
      variant: targetUser.isActive ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await api.toggleUserStatus(targetUser.id)
          toast({ title: `Usuario ${targetUser.isActive ? 'desactivado' : 'activado'}` })
          triggerRefresh()
        } catch (err: any) {
          toast({ title: 'Error', description: err.message, variant: 'destructive' })
        }
      },
    })
  }

  // Reset password
  const handleOpenResetPassword = (user: AdminUser) => {
    setResetPasswordUser(user)
    setNewPassword('')
    setConfirmNewPassword('')
    setShowNewPassword(false)
    setResetPasswordOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUser) return
    if (!newPassword || newPassword.length < 8) {
      toast({ title: 'Contraseña inválida', description: 'La contraseña debe tener al menos 8 caracteres', variant: 'destructive' })
      return
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    try {
      setSaving(true)
      await api.resetUserPassword(resetPasswordUser.id, { newPassword })
      toast({ title: 'Contraseña actualizada', description: `La contraseña de ${resetPasswordUser.name} ha sido actualizada` })
      setResetPasswordOpen(false)
      setResetPasswordUser(null)
    } catch (err: any) {
      toast({ title: 'Error al resetear contraseña', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const renderUsuarios = () => {
    if (!isSuperAdmin) return null

    const usersContent = () => {
      if (loadingUsers) {
        return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}</div>
      }
      if (users.length === 0) {
        return <EmptyState icon={Users} message="Todavía no hay usuarios registrados." />
      }

      if (isMobile) {
        return (
          <div className="space-y-3">
            {users.map((u) => (
              <Card key={u.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">{u.name} {u.lastName || ''}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getRoleBadge(u.role?.name || '')}
                      {getStatusBadge(u.isActive)}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-500">Teléfono:</span> {u.phone || '—'}</div>
                    <div><span className="text-gray-500">Cargo:</span> {u.position || '—'}</div>
                    <div><span className="text-gray-500">DNI/NIE:</span> {(u as any).documentNumber || '—'}</div>
                    <div><span className="text-gray-500">Último acceso:</span> {u.lastLogin ? format(new Date(u.lastLogin), 'dd/MM/yy') : 'Nunca'}</div>
                  </div>
                  <div className="flex gap-1.5 pt-1 flex-wrap">
                    <Button size="sm" variant="outline" onClick={() => handleViewUser(u.id)}><Eye className="h-3 w-3 mr-1" />Ver</Button>
                    <Button size="sm" variant="outline" onClick={() => openEditUser(u)}><Pencil className="h-3 w-3 mr-1" />Editar</Button>
                    <Button size="sm" variant="outline" onClick={() => handleOpenResetPassword(u)}><KeyRound className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={() => { setChangingRoleUser(u); setSelectedNewRole(u.roleId || ''); setChangeRoleOpen(true) }}><ShieldCheck className="h-3 w-3" /></Button>
                    <Button size="sm" variant={u.isActive ? 'outline' : 'default'} onClick={() => handleToggleUserStatus(u)}>
                      {u.isActive ? <UserX className="h-3 w-3" /> : <UserCheck className="h-3 w-3" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      }

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>DNI/NIE</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Último acceso</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name} {u.lastName || ''}</TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell className="text-sm">{u.phone || '—'}</TableCell>
                  <TableCell className="text-sm">{u.position || '—'}</TableCell>
                  <TableCell className="text-sm">{(u as any).documentNumber || '—'}</TableCell>
                  <TableCell>{getRoleBadge(u.role?.name || '')}</TableCell>
                  <TableCell>{getStatusBadge(u.isActive)}</TableCell>
                  <TableCell className="text-sm">{u.lastLogin ? format(new Date(u.lastLogin), 'dd/MM/yy HH:mm') : 'Nunca'}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleViewUser(u.id)} title="Ver"><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openEditUser(u)} title="Editar"><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleOpenResetPassword(u)} title="Reset contraseña"><KeyRound className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setChangingRoleUser(u); setSelectedNewRole(u.roleId || ''); setChangeRoleOpen(true) }} title="Cambiar rol"><ShieldCheck className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleUserStatus(u)} title={u.isActive ? 'Desactivar' : 'Activar'}>
                        {u.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-gray-900">Usuarios</h2>
          <Button onClick={() => { setCreateForm(emptyCreateUserForm); setCreateUserOpen(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9" placeholder="Buscar usuarios..." value={usersSearch} onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1) }} />
          </div>
          <Select value={usersRoleFilter} onValueChange={(v) => { setUsersRoleFilter(v === '__all__' ? '' : v); setUsersPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por rol" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los roles</SelectItem>
              {allRoleKeys.map((rk) => (
                <SelectItem key={rk} value={rk}>{roleConfig[rk]?.label || rk}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {usersContent()}

        {totalUsers > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Mostrando {(usersPage - 1) * 20 + 1}-{Math.min(usersPage * 20, totalUsers)} de {totalUsers}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={usersPage === 1} onClick={() => setUsersPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={usersPage * 20 >= totalUsers} onClick={() => setUsersPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // TAB 5: ROLES Y PERMISOS
  // ============================================================
  const renderRoles = () => {
    if (!isSuperAdmin) return null

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Roles y Permisos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map((role) => {
            const config = roleConfig[role.name]
            const permsByModule = role.permissions.reduce<Record<string, typeof role.permissions>>((acc, p) => {
              if (!acc[p.module]) acc[p.module] = []
              acc[p.module].push(p)
              return acc
            }, {})

            return (
              <Card key={role.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={`${config?.color || 'bg-gray-100 text-gray-700'} border-0`}>
                      {config?.label || role.name}
                    </Badge>
                    <span className="text-xs text-gray-400">{role._count.users} {role._count.users === 1 ? 'usuario' : 'usuarios'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{role.description || config?.description || ''}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {Object.entries(permsByModule).map(([module, perms]) => (
                      <div key={module}>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase mb-1">{module}</p>
                        <div className="flex flex-wrap gap-1">
                          {perms.map((p) => (
                            <Badge key={p.id} variant="outline" className="text-[9px] py-0">{p.action}</Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                    {Object.keys(permsByModule).length === 0 && (
                      <p className="text-xs text-gray-400 italic">Sin permisos asignados</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // ============================================================
  // TAB 6: AUDITORÍA
  // ============================================================
  const renderAuditoria = () => {
    const auditContent = () => {
      if (loadingAuditLogs) {
        return <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} />)}</div>
      }
      if (auditLogs.length === 0) {
        return <EmptyState icon={ClipboardList} message="No se encontraron registros de auditoría." />
      }

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Acción</TableHead>
                <TableHead>Entidad</TableHead>
                <TableHead>Detalles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {auditLogs.map((log) => (
                <TableRow key={log.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpandedAuditId(expandedAuditId === log.id ? null : log.id)}>
                  <TableCell className="text-sm whitespace-nowrap">{format(new Date(log.createdAt), 'dd/MM/yy HH:mm')}</TableCell>
                  <TableCell className="text-sm">
                    {log.user ? `${log.user.name} ${log.user.lastName || ''}` : 'Sistema'}
                    {log.user?.role && <span className="ml-1">{getRoleBadge(log.user.role.name)}</span>}
                  </TableCell>
                  <TableCell><Badge variant="outline" className="text-[10px]">{log.action}</Badge></TableCell>
                  <TableCell className="text-sm capitalize">{log.entity}</TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">{log.details || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Auditoría</h2>

        <div className="flex gap-2 flex-wrap">
          <Select value={auditActionFilter} onValueChange={(v) => { setAuditActionFilter(v === '__all__' ? '' : v); setAuditPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de acción" />
            </SelectTrigger>
            <SelectContent>
              {auditActionOptions.map((opt) => (
                <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={auditEntityFilter} onValueChange={(v) => { setAuditEntityFilter(v === '__all__' ? '' : v); setAuditPage(1) }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Tipo de entidad" />
            </SelectTrigger>
            <SelectContent>
              {auditEntityOptions.map((opt) => (
                <SelectItem key={opt.value || '__all__'} value={opt.value || '__all__'}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {auditContent()}

        {totalAuditLogs > 20 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Mostrando {(auditPage - 1) * 20 + 1}-{Math.min(auditPage * 20, totalAuditLogs)} de {totalAuditLogs}</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={auditPage === 1} onClick={() => setAuditPage((p) => p - 1)}>Anterior</Button>
              <Button size="sm" variant="outline" disabled={auditPage * 20 >= totalAuditLogs} onClick={() => setAuditPage((p) => p + 1)}>Siguiente</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // DIALOGS & SHEETS
  // ============================================================

  // --- Create Admin Dialog ---
  const createAdminFormContent = (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">Administrador</Badge>
          <span className="text-xs text-gray-500">Rol asignado automáticamente</span>
        </div>
        <p className="text-xs text-emerald-600">El usuario se creará con rol de Administrador.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Nombre *</Label><Input className={isMobile ? 'h-11' : ''} value={createAdminForm.name} onChange={(e) => setCreateAdminForm({ ...createAdminForm, name: e.target.value })} placeholder="Nombre" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Apellidos</Label><Input className={isMobile ? 'h-11' : ''} value={createAdminForm.lastName} onChange={(e) => setCreateAdminForm({ ...createAdminForm, lastName: e.target.value })} placeholder="Apellidos" /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input className={isMobile ? 'h-11' : ''} type="email" value={createAdminForm.email} onChange={(e) => setCreateAdminForm({ ...createAdminForm, email: e.target.value })} placeholder="email@ejemplo.com" /></div>
      <div className="space-y-1.5"><Label className="text-sm">Teléfono</Label><Input className={isMobile ? 'h-11' : ''} value={createAdminForm.phone} onChange={(e) => setCreateAdminForm({ ...createAdminForm, phone: e.target.value })} placeholder="+34 600 000 000" /></div>
      <DocumentTypeSelector value={createAdminForm.documentType} onChange={(v) => setCreateAdminForm({ ...createAdminForm, documentType: v })} documentNumber={createAdminForm.documentNumber} onDocumentNumberChange={(v) => setCreateAdminForm({ ...createAdminForm, documentNumber: v })} isMobile={isMobile} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Contraseña temporal *</Label>
          <div className="relative">
            <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showAdminPassword ? 'text' : 'password'} value={createAdminForm.password} onChange={(e) => setCreateAdminForm({ ...createAdminForm, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowAdminPassword(!showAdminPassword)}><Eye className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-1.5"><Label className="text-sm">Confirmar contraseña *</Label><Input className={isMobile ? 'h-11' : ''} type={showAdminPassword ? 'text' : 'password'} value={createAdminForm.confirmPassword} onChange={(e) => setCreateAdminForm({ ...createAdminForm, confirmPassword: e.target.value })} placeholder="Repetir contraseña" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Cargo</Label><Input className={isMobile ? 'h-11' : ''} value={createAdminForm.position} onChange={(e) => setCreateAdminForm({ ...createAdminForm, position: e.target.value })} placeholder="Ej: Director de oficina" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Oficina/Zona</Label><Input className={isMobile ? 'h-11' : ''} value={createAdminForm.office} onChange={(e) => setCreateAdminForm({ ...createAdminForm, office: e.target.value })} placeholder="Ej: Oficina Madrid" /></div>
      </div>
      <div className="flex items-center justify-between">
        <div><Label className="text-sm">Estado activo</Label><p className="text-xs text-gray-500">Los administradores activos pueden iniciar sesión</p></div>
        <Switch checked={createAdminForm.isActive} onCheckedChange={(checked) => setCreateAdminForm({ ...createAdminForm, isActive: checked })} />
      </div>
    </div>
  )

  // --- Edit Admin Dialog ---
  const editAdminFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Nombre *</Label><Input className={isMobile ? 'h-11' : ''} value={editAdminForm.name} onChange={(e) => setEditAdminForm({ ...editAdminForm, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Apellidos</Label><Input className={isMobile ? 'h-11' : ''} value={editAdminForm.lastName} onChange={(e) => setEditAdminForm({ ...editAdminForm, lastName: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input className={isMobile ? 'h-11' : ''} type="email" value={editAdminForm.email} onChange={(e) => setEditAdminForm({ ...editAdminForm, email: e.target.value })} /></div>
      <div className="space-y-1.5"><Label className="text-sm">Teléfono</Label><Input className={isMobile ? 'h-11' : ''} value={editAdminForm.phone} onChange={(e) => setEditAdminForm({ ...editAdminForm, phone: e.target.value })} /></div>
      <DocumentTypeSelector value={editAdminForm.documentType} onChange={(v) => setEditAdminForm({ ...editAdminForm, documentType: v })} documentNumber={editAdminForm.documentNumber} onDocumentNumberChange={(v) => setEditAdminForm({ ...editAdminForm, documentNumber: v })} isMobile={isMobile} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Nueva contraseña (opcional)</Label>
          <div className="relative">
            <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showEditAdminPassword ? 'text' : 'password'} value={editAdminForm.password} onChange={(e) => setEditAdminForm({ ...editAdminForm, password: e.target.value })} placeholder="Dejar vacío para no cambiar" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditAdminPassword(!showEditAdminPassword)}><Eye className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-1.5"><Label className="text-sm">Confirmar contraseña</Label><Input className={isMobile ? 'h-11' : ''} type={showEditAdminPassword ? 'text' : 'password'} value={editAdminForm.confirmPassword} onChange={(e) => setEditAdminForm({ ...editAdminForm, confirmPassword: e.target.value })} placeholder="Repetir" disabled={!editAdminForm.password} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Cargo</Label><Input className={isMobile ? 'h-11' : ''} value={editAdminForm.position} onChange={(e) => setEditAdminForm({ ...editAdminForm, position: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Oficina/Zona</Label><Input className={isMobile ? 'h-11' : ''} value={editAdminForm.office} onChange={(e) => setEditAdminForm({ ...editAdminForm, office: e.target.value })} /></div>
      </div>
      <div className="flex items-center justify-between">
        <Label className="text-sm">Estado activo</Label>
        <Switch checked={editAdminForm.isActive} onCheckedChange={(checked) => setEditAdminForm({ ...editAdminForm, isActive: checked })} />
      </div>
      {editingAdmin && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Rol actual</p>
          <div className="flex items-center gap-2">
            {getRoleBadge(editingAdmin.role?.name || '')}
            <span className="text-xs text-gray-400">Usa "Cambiar rol" para modificar</span>
          </div>
        </div>
      )}
    </div>
  )

  // --- Create Agent Dialog ---
  const createAgentFormContent = (
    <div className="space-y-4">
      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
        <div className="flex items-center gap-2 mb-1">
          <Badge className="bg-teal-100 text-teal-700 border-0 text-[10px]">Corredor/Agente</Badge>
          <span className="text-xs text-gray-500">Rol asignado automáticamente</span>
        </div>
        <p className="text-xs text-emerald-600">El usuario se creará con rol de Corredor/Agente de seguros.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Nombre *</Label><Input className={isMobile ? 'h-11' : ''} value={createAgentForm.name} onChange={(e) => setCreateAgentForm({ ...createAgentForm, name: e.target.value })} placeholder="Nombre" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Apellidos</Label><Input className={isMobile ? 'h-11' : ''} value={createAgentForm.lastName} onChange={(e) => setCreateAgentForm({ ...createAgentForm, lastName: e.target.value })} placeholder="Apellidos" /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input className={isMobile ? 'h-11' : ''} type="email" value={createAgentForm.email} onChange={(e) => setCreateAgentForm({ ...createAgentForm, email: e.target.value })} placeholder="email@ejemplo.com" /></div>
      <div className="space-y-1.5"><Label className="text-sm">Teléfono</Label><Input className={isMobile ? 'h-11' : ''} value={createAgentForm.phone} onChange={(e) => setCreateAgentForm({ ...createAgentForm, phone: e.target.value })} placeholder="+34 600 000 000" /></div>
      <DocumentTypeSelector value={createAgentForm.documentType} onChange={(v) => setCreateAgentForm({ ...createAgentForm, documentType: v })} documentNumber={createAgentForm.documentNumber} onDocumentNumberChange={(v) => setCreateAgentForm({ ...createAgentForm, documentNumber: v })} isMobile={isMobile} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Contraseña temporal *</Label>
          <div className="relative">
            <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showAgentPassword ? 'text' : 'password'} value={createAgentForm.password} onChange={(e) => setCreateAgentForm({ ...createAgentForm, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowAgentPassword(!showAgentPassword)}><Eye className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-1.5"><Label className="text-sm">Confirmar contraseña *</Label><Input className={isMobile ? 'h-11' : ''} type={showAgentPassword ? 'text' : 'password'} value={createAgentForm.confirmPassword} onChange={(e) => setCreateAgentForm({ ...createAgentForm, confirmPassword: e.target.value })} placeholder="Repetir contraseña" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Cargo</Label><Input className={isMobile ? 'h-11' : ''} value={createAgentForm.position} onChange={(e) => setCreateAgentForm({ ...createAgentForm, position: e.target.value })} placeholder="Corredor de Seguros" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Oficina/Zona</Label><Input className={isMobile ? 'h-11' : ''} value={createAgentForm.office} onChange={(e) => setCreateAgentForm({ ...createAgentForm, office: e.target.value })} placeholder="Ej: Zona Norte, Oficina Madrid" /></div>
      </div>
      {isSuperAdmin && (
        <div className="space-y-1.5">
          <Label className="text-sm">Administrador responsable</Label>
          <Select value={createAgentForm.managerId} onValueChange={(v) => setCreateAgentForm({ ...createAgentForm, managerId: v })}>
            <SelectTrigger className={isMobile ? 'h-11' : ''}>
              <SelectValue placeholder="Seleccionar administrador" />
            </SelectTrigger>
            <SelectContent>
              {admins.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name} {a.lastName || ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {!isSuperAdmin && currentUser && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500">Administrador responsable: <span className="font-medium">{currentUser.name} {currentUser.lastName || ''}</span> (asignado automáticamente)</p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div><Label className="text-sm">Estado</Label><p className="text-xs text-gray-500">Los corredores activos pueden iniciar sesión y recibir asignaciones</p></div>
        <Switch checked={createAgentForm.isActive} onCheckedChange={(checked) => setCreateAgentForm({ ...createAgentForm, isActive: checked })} />
      </div>
    </div>
  )

  // --- Edit Agent Dialog ---
  const editAgentFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Nombre *</Label><Input className={isMobile ? 'h-11' : ''} value={editAgentForm.name} onChange={(e) => setEditAgentForm({ ...editAgentForm, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Apellidos</Label><Input className={isMobile ? 'h-11' : ''} value={editAgentForm.lastName} onChange={(e) => setEditAgentForm({ ...editAgentForm, lastName: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input className={isMobile ? 'h-11' : ''} type="email" value={editAgentForm.email} onChange={(e) => setEditAgentForm({ ...editAgentForm, email: e.target.value })} /></div>
      <div className="space-y-1.5"><Label className="text-sm">Teléfono</Label><Input className={isMobile ? 'h-11' : ''} value={editAgentForm.phone} onChange={(e) => setEditAgentForm({ ...editAgentForm, phone: e.target.value })} /></div>
      <DocumentTypeSelector value={editAgentForm.documentType} onChange={(v) => setEditAgentForm({ ...editAgentForm, documentType: v })} documentNumber={editAgentForm.documentNumber} onDocumentNumberChange={(v) => setEditAgentForm({ ...editAgentForm, documentNumber: v })} isMobile={isMobile} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Nueva contraseña (opcional)</Label>
          <div className="relative">
            <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showEditAgentPassword ? 'text' : 'password'} value={editAgentForm.password} onChange={(e) => setEditAgentForm({ ...editAgentForm, password: e.target.value })} placeholder="Dejar vacío para no cambiar" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditAgentPassword(!showEditAgentPassword)}><Eye className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-1.5"><Label className="text-sm">Confirmar contraseña</Label><Input className={isMobile ? 'h-11' : ''} type={showEditAgentPassword ? 'text' : 'password'} value={editAgentForm.confirmPassword} onChange={(e) => setEditAgentForm({ ...editAgentForm, confirmPassword: e.target.value })} placeholder="Repetir" disabled={!editAgentForm.password} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Cargo</Label><Input className={isMobile ? 'h-11' : ''} value={editAgentForm.position} onChange={(e) => setEditAgentForm({ ...editAgentForm, position: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Oficina/Zona</Label><Input className={isMobile ? 'h-11' : ''} value={editAgentForm.office} onChange={(e) => setEditAgentForm({ ...editAgentForm, office: e.target.value })} /></div>
      </div>
      {isSuperAdmin && (
        <div className="space-y-1.5">
          <Label className="text-sm">Administrador responsable</Label>
          <Select value={editAgentForm.managerId} onValueChange={(v) => setEditAgentForm({ ...editAgentForm, managerId: v })}>
            <SelectTrigger className={isMobile ? 'h-11' : ''}>
              <SelectValue placeholder="Seleccionar administrador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sin administrador</SelectItem>
              {admins.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name} {a.lastName || ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  )

  // --- Create User Form Content ---
  const createUserFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Nombre *</Label><Input className={isMobile ? 'h-11' : ''} value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="Nombre" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Apellidos</Label><Input className={isMobile ? 'h-11' : ''} value={createForm.lastName} onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })} placeholder="Apellidos" /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input className={isMobile ? 'h-11' : ''} type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="email@ejemplo.com" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Contraseña temporal *</Label>
          <div className="relative">
            <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showPassword ? 'text' : 'password'} value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} placeholder="Mínimo 8 caracteres" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowPassword(!showPassword)}><Eye className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-1.5"><Label className="text-sm">Confirmar contraseña *</Label><Input className={isMobile ? 'h-11' : ''} type={showPassword ? 'text' : 'password'} value={createForm.confirmPassword} onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })} placeholder="Repetir contraseña" /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Teléfono</Label><Input className={isMobile ? 'h-11' : ''} value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} placeholder="+34 600 000 000" /></div>
        <div className="space-y-1.5"><Label className="text-sm">Cargo</Label><Input className={isMobile ? 'h-11' : ''} value={createForm.position} onChange={(e) => setCreateForm({ ...createForm, position: e.target.value })} placeholder="Ej: Agente de seguros" /></div>
      </div>
      <DocumentTypeSelector value={createForm.documentType} onChange={(v) => setCreateForm({ ...createForm, documentType: v })} documentNumber={createForm.documentNumber} onDocumentNumberChange={(v) => setCreateForm({ ...createForm, documentNumber: v })} isMobile={isMobile} />
      <div className="space-y-1.5"><Label className="text-sm">Oficina/Zona</Label><Input className={isMobile ? 'h-11' : ''} value={createForm.office} onChange={(e) => setCreateForm({ ...createForm, office: e.target.value })} placeholder="Ej: Oficina Madrid" /></div>
      <div className="space-y-2">
        <Label className="text-sm font-medium">Rol *</Label>
        <RoleSelectorCards selectedRoleId={createForm.roleId} onSelectRoleId={(roleId) => setCreateForm({ ...createForm, roleId })} availableRoleNames={assignableRoles} allRoleNames={allRoleKeys} roles={roles} />
      </div>
    </div>
  )

  // --- Edit User Form Content ---
  const editUserFormContent = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Nombre *</Label><Input className={isMobile ? 'h-11' : ''} value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Apellidos</Label><Input className={isMobile ? 'h-11' : ''} value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} /></div>
      </div>
      <div className="space-y-1.5"><Label className="text-sm">Email *</Label><Input className={isMobile ? 'h-11' : ''} type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Nueva contraseña (opcional)</Label>
          <div className="relative">
            <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showEditPassword ? 'text' : 'password'} value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} placeholder="Dejar vacío para no cambiar" />
            <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowEditPassword(!showEditPassword)}><Eye className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="space-y-1.5"><Label className="text-sm">Confirmar contraseña</Label><Input className={isMobile ? 'h-11' : ''} type={showEditPassword ? 'text' : 'password'} value={editForm.confirmPassword} onChange={(e) => setEditForm({ ...editForm, confirmPassword: e.target.value })} placeholder="Repetir" disabled={!editForm.password} /></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5"><Label className="text-sm">Teléfono</Label><Input className={isMobile ? 'h-11' : ''} value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} /></div>
        <div className="space-y-1.5"><Label className="text-sm">Cargo</Label><Input className={isMobile ? 'h-11' : ''} value={editForm.position} onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} /></div>
      </div>
      <DocumentTypeSelector value={editForm.documentType} onChange={(v) => setEditForm({ ...editForm, documentType: v })} documentNumber={editForm.documentNumber} onDocumentNumberChange={(v) => setEditForm({ ...editForm, documentNumber: v })} isMobile={isMobile} />
      <div className="space-y-1.5"><Label className="text-sm">Oficina/Zona</Label><Input className={isMobile ? 'h-11' : ''} value={editForm.office} onChange={(e) => setEditForm({ ...editForm, office: e.target.value })} /></div>
      {editingUser && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">Rol actual</p>
          <div className="flex items-center gap-2">
            {getRoleBadge(editingUser.role?.name || '')}
            <span className="text-xs text-gray-400">Usa "Cambiar rol" para modificar</span>
          </div>
        </div>
      )}
    </div>
  )

  // --- Reset Password Dialog ---
  const resetPasswordContent = (
    <div className="space-y-4">
      {resetPasswordUser && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium">{resetPasswordUser.name} {resetPasswordUser.lastName || ''}</p>
          <p className="text-xs text-gray-500">{resetPasswordUser.email}</p>
        </div>
      )}
      <div className="space-y-1.5">
        <Label className="text-sm">Nueva contraseña *</Label>
        <div className="relative">
          <Input className={isMobile ? 'h-11 pr-10' : 'pr-10'} type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" onClick={() => setShowNewPassword(!showNewPassword)}><Eye className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Confirmar contraseña *</Label>
        <Input className={isMobile ? 'h-11' : ''} type={showNewPassword ? 'text' : 'password'} value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} placeholder="Repetir contraseña" />
      </div>
    </div>
  )

  // --- Agent Ficha Sheet ---
  const fichaContent = fichaAgent && (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center">
          <Briefcase className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <p className="font-semibold">{fichaAgent.name} {fichaAgent.lastName || ''}</p>
          <p className="text-sm text-gray-500">{fichaAgent.email}</p>
          <div className="flex gap-2 mt-1">
            {getStatusBadge(fichaAgent.isActive)}
            {getRoleBadge('corredor')}
          </div>
        </div>
      </div>
      <Separator />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
        <div><span className="text-gray-500 text-xs">Teléfono</span><p>{fichaAgent.phone || '—'}</p></div>
        <div><span className="text-gray-500 text-xs">DNI/NIE</span><p>{fichaAgent.documentNumber || '—'}</p></div>
        <div><span className="text-gray-500 text-xs">Cargo</span><p>{fichaAgent.position || '—'}</p></div>
        <div><span className="text-gray-500 text-xs">Oficina</span><p>{fichaAgent.office || '—'}</p></div>
        <div><span className="text-gray-500 text-xs">Último acceso</span><p>{fichaAgent.lastLogin ? format(new Date(fichaAgent.lastLogin), 'dd/MM/yy HH:mm') : 'Nunca'}</p></div>
        {fichaAgent.manager && <div><span className="text-gray-500 text-xs">Admin responsable</span><p>{fichaAgent.manager.name} {fichaAgent.manager.lastName}</p></div>}
      </div>
      <Separator />
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-teal-600">{fichaAgent._count?.assignedClients ?? 0}</p><p className="text-[10px] text-gray-500">Clientes</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-purple-600">{fichaAgent._count?.ownedPolicies ?? 0}</p><p className="text-[10px] text-gray-500">Pólizas</p></CardContent></Card>
        <Card><CardContent className="p-3 text-center"><p className="text-2xl font-bold text-amber-600">{fichaAgent._count?.assignedLeads ?? 0}</p><p className="text-[10px] text-gray-500">Leads</p></CardContent></Card>
      </div>
      <Separator />
      {fichaLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : (
        <>
          <div>
            <p className="text-sm font-medium mb-2">Clientes ({fichaClients.length})</p>
            {fichaClients.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sin clientes asignados</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {fichaClients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span>{c.name} {c.lastName}</span>
                    <Badge variant="outline" className="text-[9px]">{c.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Pólizas ({fichaPolicies.length})</p>
            {fichaPolicies.length === 0 ? (
              <p className="text-xs text-gray-400 italic">Sin pólizas</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {fichaPolicies.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                    <span>{p.policyNumber} - {p.productName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.premium.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })}</span>
                      <Badge variant="outline" className="text-[9px]">{p.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )

  // Render Dialog or Sheet based on mobile
  const renderModal = (open: boolean, onOpenChange: (v: boolean) => void, title: string, content: React.ReactNode, footer: React.ReactNode) => {
    if (isMobile) {
      return (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader><SheetTitle>{title}</SheetTitle></SheetHeader>
            <div className="py-4">{content}</div>
            <SheetFooter>{footer}</SheetFooter>
          </SheetContent>
        </Sheet>
      )
    }
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <div className="py-4">{content}</div>
          <DialogFooter>{footer}</DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  // ============================================================
  // TAB LIST
  // ============================================================
  const visibleTabs: { value: string; label: string; icon: React.ElementType }[] = [
    { value: 'resumen', label: 'Resumen', icon: BarChart3 },
    ...(isSuperAdmin ? [{ value: 'administradores', label: 'Admins', icon: ShieldCheck }] : []),
    { value: 'corredores', label: 'Corredores', icon: Briefcase },
    ...(isSuperAdmin ? [{ value: 'usuarios', label: 'Usuarios', icon: Users }] : []),
    ...(isSuperAdmin ? [{ value: 'roles', label: 'Roles', icon: Lock }] : []),
    { value: 'auditoria', label: 'Auditoría', icon: ClipboardList },
  ]

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Panel de Administración</h1>
        <Button variant="outline" size="sm" onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Actualizar
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex overflow-x-auto">
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 text-xs sm:text-sm">
              <tab.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="mt-4">
          <TabsContent value="resumen">{renderResumen()}</TabsContent>
          <TabsContent value="administradores">{renderAdministradores()}</TabsContent>
          <TabsContent value="corredores">{renderCorredores()}</TabsContent>
          <TabsContent value="usuarios">{renderUsuarios()}</TabsContent>
          <TabsContent value="roles">{renderRoles()}</TabsContent>
          <TabsContent value="auditoria">{renderAuditoria()}</TabsContent>
        </div>
      </Tabs>

      {/* Create Admin Dialog */}
      {renderModal(
        createAdminOpen, setCreateAdminOpen, 'Nuevo administrador',
        createAdminFormContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setCreateAdminOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleCreateAdmin} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Crear</Button>
        </div>
      )}

      {/* Edit Admin Dialog */}
      {renderModal(
        editAdminOpen, setEditAdminOpen, 'Editar administrador',
        editAdminFormContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setEditAdminOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleEditAdmin} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </div>
      )}

      {/* Create Agent Dialog */}
      {renderModal(
        createAgentOpen, setCreateAgentOpen, 'Nuevo corredor',
        createAgentFormContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setCreateAgentOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleCreateAgent} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Crear</Button>
        </div>
      )}

      {/* Edit Agent Dialog */}
      {renderModal(
        editAgentOpen, setEditAgentOpen, 'Editar corredor',
        editAgentFormContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setEditAgentOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleEditAgent} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </div>
      )}

      {/* Agent Ficha Sheet/Dialog */}
      {renderModal(
        fichaOpen, setFichaOpen, 'Ficha de corredor',
        fichaContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setFichaOpen(false)}>Cerrar</Button>
        </div>
      )}

      {/* Create User Dialog */}
      {renderModal(
        createUserOpen, setCreateUserOpen, 'Nuevo usuario',
        createUserFormContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setCreateUserOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleCreateUser} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Crear</Button>
        </div>
      )}

      {/* Edit User Dialog */}
      {renderModal(
        editUserOpen, setEditUserOpen, 'Editar usuario',
        editUserFormContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setEditUserOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleEditUser} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </div>
      )}

      {/* View User Dialog */}
      {renderModal(
        viewUserOpen, setViewUserOpen, 'Detalle de usuario',
        viewingUser ? <ViewUserContent user={viewingUser} /> : null,
        <Button variant="outline" className="w-full" onClick={() => setViewUserOpen(false)}>Cerrar</Button>
      )}

      {/* Change Role Dialog */}
      {renderModal(
        changeRoleOpen, setChangeRoleOpen, 'Cambiar rol',
        changingRoleUser ? (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium">{changingRoleUser.name} {changingRoleUser.lastName || ''}</p>
              <p className="text-xs text-gray-500">{changingRoleUser.email}</p>
              <div className="mt-1">{getRoleBadge(changingRoleUser.role?.name || '')}</div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Nuevo rol</Label>
              <RoleSelectorCards selectedRoleId={selectedNewRole} onSelectRoleId={setSelectedNewRole} availableRoleNames={assignableRoles} allRoleNames={allRoleKeys} roles={roles} />
            </div>
          </div>
        ) : null,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setChangeRoleOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleChangeRole} disabled={saving || !selectedNewRole}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Cambiar rol</Button>
        </div>
      )}

      {/* Reset Password Dialog */}
      {renderModal(
        resetPasswordOpen, setResetPasswordOpen, 'Resetear contraseña',
        resetPasswordContent,
        <div className="flex gap-2 w-full">
          <Button variant="outline" className="flex-1" onClick={() => setResetPasswordOpen(false)} disabled={saving}>Cancelar</Button>
          <Button className="flex-1" onClick={handleResetPassword} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}Guardar</Button>
        </div>
      )}

      {/* Confirm Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ ...confirmDialog, open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDialog.onConfirm} className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
