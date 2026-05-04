'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { api, type AdminUser } from '@/lib/api'
import { useIsMobile } from '@/hooks/use-mobile'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Users, Shield, UserCheck, TrendingUp, DollarSign, Plus, Pencil, KeyRound,
  Eye, Search, Building2, Loader2, X, Check, ArrowUpDown, Settings, ChevronLeft,
  UserPlus, FileText, Calendar,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================
interface AdminWithStats extends AdminUser {
  managerId?: string
  documentType?: string
  documentNumber?: string
  office?: string
  stats: {
    corredoresCount: number
    clientsCount: number
    policiesCount: number
    premium: number
  }
}

interface AgentWithStats extends AdminUser {
  _count: {
    assignedClients: number
    soldPolicies: number
    ownedPolicies: number
    assignedLeads: number
  }
  manager?: { id: string; name: string; lastName: string; email: string }
}

interface SummaryData {
  kpis: {
    totalAdmins?: number
    totalCorredores: number
    totalClients: number
    totalPolicies: number
    totalPremium: number
  }
  admins?: Array<{
    id: string
    name: string
    lastName: string
    email: string
    isActive: boolean
    corredoresCount: number
    clientsCount: number
    policiesCount: number
    premium: number
  }>
  agents?: Array<{
    id: string
    name: string
    lastName: string
    email: string
    isActive: boolean
    clientsCount: number
    policiesCount: number
    premium: number
  }>
}

interface PortfolioData {
  agent: {
    id: string
    name: string
    lastName: string
    email: string
    phone?: string
    office?: string
    isActive: boolean
    manager?: { id: string; name: string; lastName: string; email: string }
  }
  clients: Array<{ id: string; name: string; lastName: string; email: string; phone?: string; status: string }>
  policies: Array<{ id: string; policyNumber: string; productName: string; status: string; premium: number; startDate: string; endDate: string; client: { id: string; name: string; lastName: string; email: string }; product?: { id: string; name: string; category: string } }>
  appointments: Array<{ id: string; title: string; type: string; status: string; date: string; endDate?: string; client?: { id: string; name: string; lastName: string } }>
  totalPremium: number
  stats: {
    totalClients: number
    totalPolicies: number
    activePolicies: number
    totalAppointments: number
    totalPremium: number
  }
}

// ============================================================
// ROLE CONFIG
// ============================================================
const roleConfig: Record<string, { label: string; color: string; description: string }> = {
  super_administrador: { label: 'Super Admin', color: 'bg-red-100 text-red-700', description: 'Control total del sistema' },
  administrador: { label: 'Administrador', color: 'bg-emerald-100 text-emerald-700', description: 'Gestión de corredores y asignaciones' },
  corredor: { label: 'Corredor/Agente', color: 'bg-teal-100 text-teal-700', description: 'Gestión de clientes y pólizas' },
}

// ============================================================
// HELPERS
// ============================================================
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value)

const formatName = (name: string, lastName?: string) =>
  `${name} ${lastName || ''}`.trim()

const getStatusBadge = (isActive: boolean) => (
  <Badge className={isActive ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px] sm:text-xs' : 'bg-red-100 text-red-600 border-0 text-[10px] sm:text-xs'}>
    {isActive ? 'Activo' : 'Inactivo'}
  </Badge>
)

const getRoleBadge = (roleName: string) => {
  const config = roleConfig[roleName]
  if (config) {
    return <Badge className={`${config.color} border-0 text-[10px] sm:text-xs`}>{config.label}</Badge>
  }
  return <Badge className="bg-gray-100 text-gray-700 border-0 text-[10px] sm:text-xs">{roleName}</Badge>
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function AdminPage() {
  const { user: currentUser } = useAppStore()
  const isMobile = useIsMobile()

  // ---- Role helpers ----
  const isSuperAdmin = currentUser?.role === 'super_administrador'
  const isAdmin = currentUser?.role === 'administrador' || isSuperAdmin

  // ---- Tab ----
  const [activeTab, setActiveTab] = useState<string>(isSuperAdmin ? 'overview' : 'overview')

  // ---- Summary ----
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(true)

  // ---- Admins ----
  const [admins, setAdmins] = useState<AdminWithStats[]>([])
  const [totalAdmins, setTotalAdmins] = useState(0)
  const [adminsPage, setAdminsPage] = useState(1)
  const [adminsSearch, setAdminsSearch] = useState('')
  const [adminsStatusFilter, setAdminsStatusFilter] = useState<string>('all')
  const [loadingAdmins, setLoadingAdmins] = useState(true)

  // ---- Agents ----
  const [agents, setAgents] = useState<AgentWithStats[]>([])
  const [totalAgents, setTotalAgents] = useState(0)
  const [agentsPage, setAgentsPage] = useState(1)
  const [agentsSearch, setAgentsSearch] = useState('')
  const [agentsStatusFilter, setAgentsStatusFilter] = useState<string>('all')
  const [agentsManagerFilter, setAgentsManagerFilter] = useState<string>('all')
  const [loadingAgents, setLoadingAgents] = useState(true)

  // ---- Dialog states ----
  const [createAdminOpen, setCreateAdminOpen] = useState(false)
  const [editAdminOpen, setEditAdminOpen] = useState(false)
  const [createAgentOpen, setCreateAgentOpen] = useState(false)
  const [editAgentOpen, setEditAgentOpen] = useState(false)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [resetPasswordOpen, setResetPasswordOpen] = useState(false)

  // ---- Form data ----
  const [adminForm, setAdminForm] = useState({
    name: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', documentType: 'DNI', documentNumber: '', office: '', isActive: true,
  })
  const [editAdminForm, setEditAdminForm] = useState({
    id: '', name: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', documentType: 'DNI', documentNumber: '', office: '', isActive: true,
  })
  const [agentForm, setAgentForm] = useState({
    name: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', managerId: '', isActive: true,
  })
  const [editAgentForm, setEditAgentForm] = useState({
    id: '', name: '', lastName: '', email: '', password: '', confirmPassword: '',
    phone: '', managerId: '', isActive: true,
  })
  const [resetPasswordForm, setResetPasswordForm] = useState({ userId: '', userName: '', newPassword: '', confirmPassword: '' })

  // ---- Portfolio ----
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null)
  const [portfolioLoading, setPortfolioLoading] = useState(false)
  const [portfolioAgentId, setPortfolioAgentId] = useState<string | null>(null)

  // ---- General ----
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
  const fetchSummary = useCallback(async () => {
    try {
      setLoadingSummary(true)
      const res = await api.getAdminSummary()
      setSummary(res.data)
    } catch (err: any) {
      toast.error('Error al cargar resumen', { description: err.message })
    } finally {
      setLoadingSummary(false)
    }
  }, [])

  const fetchAdmins = useCallback(async () => {
    if (!isSuperAdmin) return
    try {
      setLoadingAdmins(true)
      const params: Record<string, string> = { page: String(adminsPage), limit: '20' }
      if (adminsSearch) params.search = adminsSearch
      if (adminsStatusFilter && adminsStatusFilter !== 'all') params.isActive = adminsStatusFilter
      const res = await api.getAdmins(params)
      setAdmins(res.data)
      setTotalAdmins(res.total)
    } catch (err: any) {
      toast.error('Error al cargar administradores', { description: err.message })
    } finally {
      setLoadingAdmins(false)
    }
  }, [adminsPage, adminsSearch, adminsStatusFilter, isSuperAdmin])

  const fetchAgents = useCallback(async () => {
    try {
      setLoadingAgents(true)
      const params: Record<string, string> = { page: String(agentsPage), limit: '20' }
      if (agentsSearch) params.search = agentsSearch
      if (agentsStatusFilter && agentsStatusFilter !== 'all') params.isActive = agentsStatusFilter
      if (agentsManagerFilter && agentsManagerFilter !== 'all') params.managerId = agentsManagerFilter
      // For administrador role, auto-filter to own agents
      if (isAdmin && !isSuperAdmin) {
        params.managerId = currentUser?.id || ''
      }
      const res = await api.getAgents(params)
      setAgents(res.data as AgentWithStats[])
      setTotalAgents(res.total)
    } catch (err: any) {
      toast.error('Error al cargar corredores', { description: err.message })
    } finally {
      setLoadingAgents(false)
    }
  }, [agentsPage, agentsSearch, agentsStatusFilter, agentsManagerFilter, isAdmin, isSuperAdmin, currentUser?.id])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  useEffect(() => {
    if (activeTab === 'admins') fetchAdmins()
  }, [activeTab, fetchAdmins])

  useEffect(() => {
    if (activeTab === 'agents') fetchAgents()
  }, [activeTab, fetchAgents])

  // ============================================================
  // ADMIN CRUD
  // ============================================================
  const handleCreateAdmin = async () => {
    if (!adminForm.name.trim()) { toast.error('Campo requerido', { description: 'El nombre es obligatorio' }); return }
    if (!adminForm.email.trim()) { toast.error('Campo requerido', { description: 'El email es obligatorio' }); return }
    if (!adminForm.password || adminForm.password.length < 8) { toast.error('Contraseña inválida', { description: 'La contraseña debe tener al menos 8 caracteres' }); return }
    if (adminForm.password !== adminForm.confirmPassword) { toast.error('Error', { description: 'Las contraseñas no coinciden' }); return }

    try {
      setSaving(true)
      await api.createAdmin({
        name: adminForm.name,
        lastName: adminForm.lastName || undefined,
        email: adminForm.email,
        password: adminForm.password,
        phone: adminForm.phone || undefined,
        documentType: adminForm.documentType,
        documentNumber: adminForm.documentNumber || undefined,
        office: adminForm.office || undefined,
        isActive: adminForm.isActive,
      })
      toast.success('Administrador creado correctamente')
      setCreateAdminOpen(false)
      setAdminForm({ name: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', documentType: 'DNI', documentNumber: '', office: '', isActive: true })
      setShowPassword(false)
      fetchAdmins()
      fetchSummary()
    } catch (err: any) {
      toast.error('Error al crear administrador', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAdmin = async () => {
    if (!editAdminForm.name.trim()) { toast.error('Campo requerido', { description: 'El nombre es obligatorio' }); return }
    if (!editAdminForm.email.trim()) { toast.error('Campo requerido', { description: 'El email es obligatorio' }); return }
    if (editAdminForm.password && editAdminForm.password.length < 8) { toast.error('Contraseña inválida', { description: 'La contraseña debe tener al menos 8 caracteres' }); return }
    if (editAdminForm.password && editAdminForm.password !== editAdminForm.confirmPassword) { toast.error('Error', { description: 'Las contraseñas no coinciden' }); return }

    try {
      setSaving(true)
      const data: Record<string, unknown> = {
        name: editAdminForm.name,
        lastName: editAdminForm.lastName || null,
        email: editAdminForm.email,
        phone: editAdminForm.phone || null,
        documentType: editAdminForm.documentType,
        documentNumber: editAdminForm.documentNumber || null,
        office: editAdminForm.office || null,
        isActive: editAdminForm.isActive,
      }
      if (editAdminForm.password) data.password = editAdminForm.password
      await api.updateAdmin(editAdminForm.id, data)
      toast.success('Administrador actualizado')
      setEditAdminOpen(false)
      setShowPassword(false)
      fetchAdmins()
      fetchSummary()
    } catch (err: any) {
      toast.error('Error al actualizar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditAdmin = (admin: AdminWithStats) => {
    setEditAdminForm({
      id: admin.id,
      name: admin.name,
      lastName: admin.lastName || '',
      email: admin.email,
      password: '',
      confirmPassword: '',
      phone: admin.phone || '',
      documentType: admin.documentType || 'DNI',
      documentNumber: admin.documentNumber || '',
      office: admin.office || '',
      isActive: admin.isActive,
    })
    setEditAdminOpen(true)
  }

  const handleToggleAdminStatus = (admin: AdminWithStats) => {
    const fullName = formatName(admin.name, admin.lastName)
    setConfirmDialog({
      open: true,
      title: admin.isActive ? '¿Desactivar administrador?' : '¿Activar administrador?',
      description: admin.isActive
        ? `¿Estás seguro de desactivar a ${fullName}? No podrá iniciar sesión.`
        : `¿Estás seguro de activar a ${fullName}?`,
      variant: admin.isActive ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await api.updateAdmin(admin.id, { isActive: !admin.isActive })
          toast.success(fullName + (admin.isActive ? ' desactivado' : ' activado'))
          fetchAdmins()
          fetchSummary()
        } catch (err: any) {
          toast.error('Error', { description: err.message })
        }
      },
    })
  }

  // ============================================================
  // AGENT CRUD
  // ============================================================
  const handleCreateAgent = async () => {
    if (!agentForm.name.trim()) { toast.error('Campo requerido', { description: 'El nombre es obligatorio' }); return }
    if (!agentForm.email.trim()) { toast.error('Campo requerido', { description: 'El email es obligatorio' }); return }
    if (!agentForm.password || agentForm.password.length < 8) { toast.error('Contraseña inválida', { description: 'La contraseña debe tener al menos 8 caracteres' }); return }
    if (agentForm.password !== agentForm.confirmPassword) { toast.error('Error', { description: 'Las contraseñas no coinciden' }); return }
    if (isSuperAdmin && !agentForm.managerId) { toast.error('Campo requerido', { description: 'Debe asignar un administrador' }); return }

    try {
      setSaving(true)
      await api.createAgent({
        name: agentForm.name,
        lastName: agentForm.lastName || undefined,
        email: agentForm.email,
        password: agentForm.password,
        phone: agentForm.phone || undefined,
        managerId: isSuperAdmin ? agentForm.managerId : currentUser?.id,
        isActive: agentForm.isActive,
      })
      toast.success('Corredor creado correctamente')
      setCreateAgentOpen(false)
      setAgentForm({ name: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '', managerId: '', isActive: true })
      setShowPassword(false)
      fetchAgents()
      fetchSummary()
    } catch (err: any) {
      toast.error('Error al crear corredor', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateAgent = async () => {
    if (!editAgentForm.name.trim()) { toast.error('Campo requerido', { description: 'El nombre es obligatorio' }); return }
    if (!editAgentForm.email.trim()) { toast.error('Campo requerido', { description: 'El email es obligatorio' }); return }
    if (editAgentForm.password && editAgentForm.password.length < 8) { toast.error('Contraseña inválida', { description: 'La contraseña debe tener al menos 8 caracteres' }); return }
    if (editAgentForm.password && editAgentForm.password !== editAgentForm.confirmPassword) { toast.error('Error', { description: 'Las contraseñas no coinciden' }); return }

    try {
      setSaving(true)
      const data: Record<string, unknown> = {
        name: editAgentForm.name,
        lastName: editAgentForm.lastName || null,
        email: editAgentForm.email,
        phone: editAgentForm.phone || null,
        isActive: editAgentForm.isActive,
      }
      if (editAgentForm.password) data.password = editAgentForm.password
      if (isSuperAdmin && editAgentForm.managerId) data.managerId = editAgentForm.managerId
      await api.updateAgent(editAgentForm.id, data)
      toast.success('Corredor actualizado')
      setEditAgentOpen(false)
      setShowPassword(false)
      fetchAgents()
      fetchSummary()
    } catch (err: any) {
      toast.error('Error al actualizar', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  const handleOpenEditAgent = (agent: AgentWithStats) => {
    setEditAgentForm({
      id: agent.id,
      name: agent.name,
      lastName: agent.lastName || '',
      email: agent.email,
      password: '',
      confirmPassword: '',
      phone: agent.phone || '',
      managerId: agent.manager?.id || '',
      isActive: agent.isActive,
    })
    setEditAgentOpen(true)
  }

  const handleToggleAgentStatus = (agent: AgentWithStats) => {
    const fullName = formatName(agent.name, agent.lastName)
    setConfirmDialog({
      open: true,
      title: agent.isActive ? '¿Desactivar corredor?' : '¿Activar corredor?',
      description: agent.isActive
        ? `¿Estás seguro de desactivar a ${fullName}? No podrá iniciar sesión ni recibir asignaciones.`
        : `¿Estás seguro de activar a ${fullName}?`,
      variant: agent.isActive ? 'destructive' : 'default',
      onConfirm: async () => {
        try {
          await api.toggleAgentStatus(agent.id)
          toast.success(fullName + (agent.isActive ? ' desactivado' : ' activado'))
          fetchAgents()
          fetchSummary()
        } catch (err: any) {
          toast.error('Error', { description: err.message })
        }
      },
    })
  }

  // ============================================================
  // PORTFOLIO
  // ============================================================
  const handleOpenPortfolio = async (agentId: string) => {
    setPortfolioAgentId(agentId)
    setPortfolioOpen(true)
    setPortfolioLoading(true)
    try {
      const res = await api.getAgentPortfolio(agentId)
      setPortfolioData(res.data)
    } catch (err: any) {
      toast.error('Error al cargar cartera', { description: err.message })
      setPortfolioData(null)
    } finally {
      setPortfolioLoading(false)
    }
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================
  const handleOpenResetPassword = (userId: string, userName: string) => {
    setResetPasswordForm({ userId, userName, newPassword: '', confirmPassword: '' })
    setResetPasswordOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordForm.newPassword || resetPasswordForm.newPassword.length < 8) {
      toast.error('Contraseña inválida', { description: 'La contraseña debe tener al menos 8 caracteres' })
      return
    }
    if (resetPasswordForm.newPassword !== resetPasswordForm.confirmPassword) {
      toast.error('Error', { description: 'Las contraseñas no coinciden' })
      return
    }
    try {
      setSaving(true)
      await api.resetUserPassword(resetPasswordForm.userId, resetPasswordForm.newPassword)
      toast.success('Contraseña restablecida', { description: `Se ha restablecido la contraseña de ${resetPasswordForm.userName}` })
      setResetPasswordOpen(false)
    } catch (err: any) {
      toast.error('Error al restablecer contraseña', { description: err.message })
    } finally {
      setSaving(false)
    }
  }

  // ============================================================
  // NAVIGATION HELPERS
  // ============================================================
  const handleViewAdminCorredores = (adminId: string) => {
    setAgentsManagerFilter(adminId)
    setActiveTab('agents')
  }

  // ============================================================
  // SKELETON LOADERS
  // ============================================================
  const KpiSkeleton = () => (
    <Card>
      <CardContent className="p-6">
        <Skeleton className="h-4 w-24 mb-2" />
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  )

  const TableSkeleton = () => (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  )

  // ============================================================
  // PASSWORD INPUT WITH TOGGLE
  // ============================================================
  const PasswordInput = ({ value, onChange, placeholder, id }: {
    value: string; onChange: (v: string) => void; placeholder: string; id?: string
  }) => (
    <div className="relative">
      <Input
        id={id}
        className={isMobile ? 'h-11 pr-10' : 'pr-10'}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        onClick={() => setShowPassword(!showPassword)}
      >
        {showPassword ? <Eye className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )

  // ============================================================
  // ADMIN FORM (Create/Edit)
  // ============================================================
  const AdminFormContent = ({ form, setForm, isEdit }: {
    form: typeof adminForm | typeof editAdminForm
    setForm: React.Dispatch<React.SetStateAction<typeof adminForm>> | React.Dispatch<React.SetStateAction<typeof editAdminForm>>
    isEdit: boolean
  }) => (
    <ScrollArea className={isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'}>
      <div className="space-y-4 pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre *</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value } as any)}
              placeholder="Nombre"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Apellidos</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value } as any)}
              placeholder="Apellidos"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Email *</Label>
          <Input
            className={isMobile ? 'h-11' : ''}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value } as any)}
            placeholder="email@ejemplo.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{isEdit ? 'Nueva contraseña' : 'Contraseña temporal *'}</Label>
            <PasswordInput
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v } as any)}
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Confirmar contraseña {isEdit ? '' : '*'}</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value } as any)}
              placeholder="Repetir contraseña"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Teléfono</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value } as any)}
              placeholder="+34 600 000 000"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Oficina / Zona</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.office}
              onChange={(e) => setForm({ ...form, office: e.target.value } as any)}
              placeholder="Ej: Madrid Centro"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Tipo de documento</Label>
            <Select
              value={form.documentType}
              onValueChange={(v) => setForm({ ...form, documentType: v } as any)}
            >
              <SelectTrigger className={isMobile ? 'h-11' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="NIE">NIE</SelectItem>
                <SelectItem value="Pasaporte">Pasaporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Número de documento</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.documentNumber}
              onChange={(e) => setForm({ ...form, documentNumber: e.target.value } as any)}
              placeholder="Ej: 12345678A"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => setForm({ ...form, isActive: v } as any)}
          />
          <Label className="text-sm">{form.isActive ? 'Cuenta activa' : 'Cuenta inactiva'}</Label>
        </div>
      </div>
    </ScrollArea>
  )

  // ============================================================
  // AGENT FORM (Create/Edit)
  // ============================================================
  const AgentFormContent = ({ form, setForm, isEdit }: {
    form: typeof agentForm | typeof editAgentForm
    setForm: React.Dispatch<React.SetStateAction<typeof agentForm>> | React.Dispatch<React.SetStateAction<typeof editAgentForm>>
    isEdit: boolean
  }) => (
    <ScrollArea className={isMobile ? 'max-h-[60vh]' : 'max-h-[70vh]'}>
      <div className="space-y-4 pr-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">Nombre *</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value } as any)}
              placeholder="Nombre"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Apellidos</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value } as any)}
              placeholder="Apellidos"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Email *</Label>
          <Input
            className={isMobile ? 'h-11' : ''}
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value } as any)}
            placeholder="email@ejemplo.com"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm">{isEdit ? 'Nueva contraseña' : 'Contraseña temporal *'}</Label>
            <PasswordInput
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v } as any)}
              placeholder={isEdit ? 'Dejar vacío para no cambiar' : 'Mínimo 8 caracteres'}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm">Confirmar contraseña {isEdit ? '' : '*'}</Label>
            <Input
              className={isMobile ? 'h-11' : ''}
              type={showPassword ? 'text' : 'password'}
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value } as any)}
              placeholder="Repetir contraseña"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Teléfono</Label>
          <Input
            className={isMobile ? 'h-11' : ''}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value } as any)}
            placeholder="+34 600 000 000"
          />
        </div>

        {isSuperAdmin && (
          <div className="space-y-1.5">
            <Label className="text-sm">Administrador asignado *</Label>
            <Select
              value={form.managerId}
              onValueChange={(v) => setForm({ ...form, managerId: v } as any)}
            >
              <SelectTrigger className={isMobile ? 'h-11' : ''}>
                <SelectValue placeholder="Seleccionar administrador" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {formatName(admin.name, admin.lastName)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-3">
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => setForm({ ...form, isActive: v } as any)}
          />
          <Label className="text-sm">{form.isActive ? 'Cuenta activa' : 'Cuenta inactiva'}</Label>
        </div>
      </div>
    </ScrollArea>
  )

  // ============================================================
  // RESET PASSWORD FORM
  // ============================================================
  const ResetPasswordContent = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Restablecer contraseña de <strong>{resetPasswordForm.userName}</strong>
      </p>
      <div className="space-y-1.5">
        <Label className="text-sm">Nueva contraseña *</Label>
        <PasswordInput
          value={resetPasswordForm.newPassword}
          onChange={(v) => setResetPasswordForm({ ...resetPasswordForm, newPassword: v })}
          placeholder="Mínimo 8 caracteres"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-sm">Confirmar contraseña *</Label>
        <Input
          className={isMobile ? 'h-11' : ''}
          type={showPassword ? 'text' : 'password'}
          value={resetPasswordForm.confirmPassword}
          onChange={(e) => setResetPasswordForm({ ...resetPasswordForm, confirmPassword: e.target.value })}
          placeholder="Repetir contraseña"
        />
      </div>
    </div>
  )

  // ============================================================
  // PORTFOLIO VIEW (Ficha de Corredor)
  // ============================================================
  const PortfolioContent = () => {
    const [portfolioTab, setPortfolioTab] = useState('clients')

    if (portfolioLoading) {
      return (
        <div className="space-y-4 p-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-40" />
        </div>
      )
    }

    if (!portfolioData) {
      return <div className="p-4 text-center text-muted-foreground">No se pudo cargar la cartera</div>
    }

    const { agent, clients, policies, appointments, stats } = portfolioData

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{formatName(agent.name, agent.lastName)}</h3>
              {getStatusBadge(agent.isActive)}
            </div>
            <p className="text-sm text-muted-foreground">{agent.email}</p>
            {agent.phone && <p className="text-sm text-muted-foreground">{agent.phone}</p>}
            {agent.office && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {agent.office}
              </div>
            )}
            {agent.manager && (
              <p className="text-sm text-muted-foreground mt-1">
                Admin: {formatName(agent.manager.name, agent.manager.lastName)}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => { setPortfolioOpen(false); setTimeout(() => handleOpenEditAgent(agents.find(a => a.id === agent.id)!), 200) }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => { setPortfolioOpen(false); setTimeout(() => handleOpenResetPassword(agent.id, formatName(agent.name, agent.lastName)), 200) }}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Resetear contraseña</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={agent.isActive ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() => {
                      const agentObj = agents.find(a => a.id === agent.id)
                      if (agentObj) {
                        setPortfolioOpen(false)
                        setTimeout(() => handleToggleAgentStatus(agentObj), 200)
                      }
                    }}
                  >
                    {agent.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{agent.isActive ? 'Desactivar' : 'Activar'} cuenta</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-0 bg-emerald-50 dark:bg-emerald-950/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{stats.totalClients}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400">Clientes</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-teal-50 dark:bg-teal-950/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-teal-700 dark:text-teal-400">{stats.activePolicies}</p>
              <p className="text-xs text-teal-600 dark:text-teal-400">Pólizas Activas</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{stats.totalAppointments}</p>
              <p className="text-xs text-blue-600 dark:text-blue-400">Citas</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(stats.totalPremium)}</p>
              <p className="text-xs text-amber-600 dark:text-amber-400">Prima Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Sub-tabs */}
        <Tabs value={portfolioTab} onValueChange={setPortfolioTab}>
          <TabsList className="w-full">
            <TabsTrigger value="clients" className="flex-1">
              <Users className="h-4 w-4 mr-1" /> Clientes
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex-1">
              <FileText className="h-4 w-4 mr-1" /> Pólizas
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex-1">
              <Calendar className="h-4 w-4 mr-1" /> Citas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="clients" className="mt-3">
            {clients.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay clientes asignados</p>
            ) : isMobile ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {clients.map((c) => (
                  <Card key={c.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{formatName(c.name, c.lastName)}</p>
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                      <Badge className={c.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-600 border-0 text-[10px]'}>
                        {c.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clients.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{formatName(c.name, c.lastName)}</TableCell>
                        <TableCell className="text-sm">{c.email}</TableCell>
                        <TableCell className="text-sm">{c.phone || '—'}</TableCell>
                        <TableCell>
                          <Badge className={c.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-600 border-0 text-[10px]'}>
                            {c.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="policies" className="mt-3">
            {policies.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay pólizas</p>
            ) : isMobile ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {policies.map((p) => (
                  <Card key={p.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{p.policyNumber}</p>
                        <p className="text-xs text-muted-foreground">{p.productName}</p>
                        <p className="text-xs text-muted-foreground">{formatName(p.client.name, p.client.lastName)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(p.premium)}</p>
                        <Badge className={p.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-600 border-0 text-[10px]'}>
                          {p.status}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Póliza</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Prima</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Fin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {policies.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-sm">{p.policyNumber}</TableCell>
                        <TableCell className="text-sm">{p.productName}</TableCell>
                        <TableCell className="text-sm">{formatName(p.client.name, p.client.lastName)}</TableCell>
                        <TableCell>
                          <Badge className={p.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-600 border-0 text-[10px]'}>
                            {p.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(p.premium)}</TableCell>
                        <TableCell className="text-sm">{new Date(p.startDate).toLocaleDateString('es-ES')}</TableCell>
                        <TableCell className="text-sm">{new Date(p.endDate).toLocaleDateString('es-ES')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="appointments" className="mt-3">
            {appointments.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay citas</p>
            ) : isMobile ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {appointments.map((a) => (
                  <Card key={a.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.type} · {new Date(a.date).toLocaleDateString('es-ES')}</p>
                        {a.client && <p className="text-xs text-muted-foreground">{formatName(a.client.name, a.client.lastName)}</p>}
                      </div>
                      <Badge className={a.status === 'scheduled' ? 'bg-blue-100 text-blue-700 border-0 text-[10px]' : a.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-600 border-0 text-[10px]'}>
                        {a.status}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Título</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((a) => (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.title}</TableCell>
                        <TableCell className="text-sm">{a.type}</TableCell>
                        <TableCell className="text-sm">{new Date(a.date).toLocaleDateString('es-ES')}</TableCell>
                        <TableCell className="text-sm">{a.client ? formatName(a.client.name, a.client.lastName) : '—'}</TableCell>
                        <TableCell>
                          <Badge className={a.status === 'scheduled' ? 'bg-blue-100 text-blue-700 border-0 text-[10px]' : a.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-0 text-[10px]' : 'bg-gray-100 text-gray-600 border-0 text-[10px]'}>
                            {a.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  // ============================================================
  // RESUMEN TAB
  // ============================================================
  const OverviewTab = () => {
    if (loadingSummary) {
      return (
        <div className="space-y-6">
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
            {Array.from({ length: isSuperAdmin ? 5 : 4 }).map((_, i) => (
              <KpiSkeleton key={i} />
            ))}
          </div>
          <TableSkeleton />
        </div>
      )
    }

    if (!summary) {
      return <p className="text-center text-muted-foreground py-8">No se pudo cargar el resumen</p>
    }

    const { kpis } = summary

    // ---- SUPER ADMIN VIEW ----
    if (isSuperAdmin) {
      return (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-5'}`}>
            <Card className="border-0 bg-emerald-50 dark:bg-emerald-950/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Administradores</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">{kpis.totalAdmins ?? 0}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-teal-50 dark:bg-teal-950/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="h-4 w-4 text-teal-600" />
                  <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Corredores</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-teal-700 dark:text-teal-400">{kpis.totalCorredores}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Clientes</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">{kpis.totalClients}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-violet-50 dark:bg-violet-950/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-violet-600" />
                  <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Pólizas Activas</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-400">{kpis.totalPolicies}</p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-amber-50 dark:bg-amber-950/30">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-amber-600" />
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Prima Total</p>
                </div>
                <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(kpis.totalPremium)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Admins Table */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-600" />
                Administradores de Grupo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!summary.admins || summary.admins.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No hay administradores registrados</p>
              ) : isMobile ? (
                <div className="space-y-3">
                  {summary.admins.map((admin) => (
                    <Card key={admin.id} className="p-3 border shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-sm">{formatName(admin.name, admin.lastName)}</p>
                          <p className="text-xs text-muted-foreground">{admin.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(admin.isActive)}
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-center mb-3">
                        <div>
                          <p className="text-sm font-semibold">{admin.corredoresCount}</p>
                          <p className="text-[10px] text-muted-foreground">Corred.</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{admin.clientsCount}</p>
                          <p className="text-[10px] text-muted-foreground">Clientes</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{admin.policiesCount}</p>
                          <p className="text-[10px] text-muted-foreground">Pólizas</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{formatCurrency(admin.premium)}</p>
                          <p className="text-[10px] text-muted-foreground">Prima</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleViewAdminCorredores(admin.id)}>
                          <Eye className="h-3.5 w-3.5 mr-1" /> Corredores
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                          const adminWithStats = admins.find(a => a.id === admin.id)
                          if (adminWithStats) handleOpenEditAdmin(adminWithStats)
                          else toast.info('Ve a la pestaña Administradores para editar')
                        }}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-center">Corredores</TableHead>
                        <TableHead className="text-center">Clientes</TableHead>
                        <TableHead className="text-center">Pólizas</TableHead>
                        <TableHead className="text-right">Prima Total</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.admins.map((admin) => (
                        <TableRow key={admin.id}>
                          <TableCell className="font-medium text-sm">{formatName(admin.name, admin.lastName)}</TableCell>
                          <TableCell className="text-sm">{admin.email}</TableCell>
                          <TableCell>{getStatusBadge(admin.isActive)}</TableCell>
                          <TableCell className="text-center text-sm">{admin.corredoresCount}</TableCell>
                          <TableCell className="text-center text-sm">{admin.clientsCount}</TableCell>
                          <TableCell className="text-center text-sm">{admin.policiesCount}</TableCell>
                          <TableCell className="text-right text-sm font-medium">{formatCurrency(admin.premium)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => handleViewAdminCorredores(admin.id)}>
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Ver corredores</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="sm" onClick={() => {
                                      const adminWithStats = admins.find(a => a.id === admin.id)
                                      if (adminWithStats) handleOpenEditAdmin(adminWithStats)
                                      else toast.info('Ve a la pestaña Administradores para editar')
                                    }}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )
    }

    // ---- ADMINISTRADOR VIEW ----
    return (
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
          <Card className="border-0 bg-teal-50 dark:bg-teal-950/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <UserCheck className="h-4 w-4 text-teal-600" />
                <p className="text-xs text-teal-600 dark:text-teal-400 font-medium">Mis Corredores</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-teal-700 dark:text-teal-400">{kpis.totalCorredores}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-blue-50 dark:bg-blue-950/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-blue-600" />
                <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Mis Clientes</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400">{kpis.totalClients}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-violet-50 dark:bg-violet-950/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-violet-600" />
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">Mis Pólizas</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-400">{kpis.totalPolicies}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-amber-50 dark:bg-amber-950/30">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-amber-600" />
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Prima Total</p>
              </div>
              <p className="text-xl sm:text-2xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(kpis.totalPremium)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Agents Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-teal-600" />
              Mis Corredores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!summary.agents || summary.agents.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">No hay corredores asignados</p>
            ) : isMobile ? (
              <div className="space-y-3">
                {summary.agents.map((agent) => (
                  <Card key={agent.id} className="p-3 border shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-sm">{formatName(agent.name, agent.lastName)}</p>
                        <p className="text-xs text-muted-foreground">{agent.email}</p>
                      </div>
                      {getStatusBadge(agent.isActive)}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      <div>
                        <p className="text-sm font-semibold">{agent.clientsCount}</p>
                        <p className="text-[10px] text-muted-foreground">Clientes</p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{agent.policiesCount}</p>
                        <p className="text-[10px] text-muted-foreground">Pólizas</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold">{formatCurrency(agent.premium)}</p>
                        <p className="text-[10px] text-muted-foreground">Prima</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleOpenPortfolio(agent.id)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Cartera
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => {
                        const agentObj = agents.find(a => a.id === agent.id)
                        if (agentObj) handleOpenEditAgent(agentObj)
                      }}>
                        <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">Clientes</TableHead>
                      <TableHead className="text-center">Pólizas</TableHead>
                      <TableHead className="text-right">Prima</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.agents.map((agent) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium text-sm">{formatName(agent.name, agent.lastName)}</TableCell>
                        <TableCell className="text-sm">{agent.email}</TableCell>
                        <TableCell>{getStatusBadge(agent.isActive)}</TableCell>
                        <TableCell className="text-center text-sm">{agent.clientsCount}</TableCell>
                        <TableCell className="text-center text-sm">{agent.policiesCount}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(agent.premium)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => handleOpenPortfolio(agent.id)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver cartera</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    const agentObj = agents.find(a => a.id === agent.id)
                                    if (agentObj) handleOpenEditAgent(agentObj)
                                  }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="sm" onClick={() => {
                                    const agentObj = agents.find(a => a.id === agent.id)
                                    if (agentObj) handleToggleAgentStatus(agentObj)
                                  }}>
                                    {agent.isActive ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-emerald-500" />}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{agent.isActive ? 'Desactivar' : 'Activar'}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ============================================================
  // ADMINISTRADORES TAB (super_admin ONLY)
  // ============================================================
  const AdminsTab = () => {
    if (!isSuperAdmin) return null

    return (
      <div className="space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className={isMobile ? 'h-11 pl-9' : 'pl-9'}
              placeholder="Buscar administradores..."
              value={adminsSearch}
              onChange={(e) => { setAdminsSearch(e.target.value); setAdminsPage(1) }}
            />
          </div>
          <Select value={adminsStatusFilter} onValueChange={(v) => { setAdminsStatusFilter(v); setAdminsPage(1) }}>
            <SelectTrigger className={isMobile ? 'h-11 w-full' : 'w-40'}>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="true">Activos</SelectItem>
              <SelectItem value="false">Inactivos</SelectItem>
            </SelectContent>
          </Select>
          <Button className={isMobile ? 'w-full h-11' : ''} onClick={() => setCreateAdminOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nuevo Administrador
          </Button>
        </div>

        {/* Table */}
        {loadingAdmins ? (
          <TableSkeleton />
        ) : admins.length === 0 ? (
          <Card className="py-12">
            <p className="text-center text-muted-foreground">
              {adminsSearch ? 'No se encontraron administradores' : 'No hay administradores registrados'}
            </p>
          </Card>
        ) : isMobile ? (
          <div className="space-y-3">
            {admins.map((admin) => (
              <Card key={admin.id} className="p-3 border shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-sm">{formatName(admin.name, admin.lastName)}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                    {admin.office && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {admin.office}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {getRoleBadge(admin.role?.name || 'administrador')}
                    {getStatusBadge(admin.isActive)}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center mb-3">
                  <div>
                    <p className="text-sm font-semibold">{admin.stats.corredoresCount}</p>
                    <p className="text-[10px] text-muted-foreground">Corred.</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{admin.stats.clientsCount}</p>
                    <p className="text-[10px] text-muted-foreground">Clientes</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{admin.stats.policiesCount}</p>
                    <p className="text-[10px] text-muted-foreground">Pólizas</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold">{formatCurrency(admin.stats.premium)}</p>
                    <p className="text-[10px] text-muted-foreground">Prima</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleViewAdminCorredores(admin.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> Corredores
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenEditAdmin(admin)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleToggleAdminStatus(admin)}>
                    {admin.isActive ? <X className="h-3.5 w-3.5 mr-1 text-red-500" /> : <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />}
                    {admin.isActive ? 'Desactivar' : 'Activar'}
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenResetPassword(admin.id, formatName(admin.name, admin.lastName))}>
                    <KeyRound className="h-3.5 w-3.5 mr-1" /> Contraseña
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Corredores</TableHead>
                    <TableHead className="text-center">Clientes</TableHead>
                    <TableHead className="text-center">Pólizas</TableHead>
                    <TableHead className="text-right">Prima</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{formatName(admin.name, admin.lastName)}</p>
                          {admin.office && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3" /> {admin.office}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{admin.email}</TableCell>
                      <TableCell>{getStatusBadge(admin.isActive)}</TableCell>
                      <TableCell className="text-center text-sm">{admin.stats.corredoresCount}</TableCell>
                      <TableCell className="text-center text-sm">{admin.stats.clientsCount}</TableCell>
                      <TableCell className="text-center text-sm">{admin.stats.policiesCount}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{formatCurrency(admin.stats.premium)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleViewAdminCorredores(admin.id)}>
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Ver corredores</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenEditAdmin(admin)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleToggleAdminStatus(admin)}>
                                  {admin.isActive ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-emerald-500" />}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{admin.isActive ? 'Desactivar' : 'Activar'}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" onClick={() => handleOpenResetPassword(admin.id, formatName(admin.name, admin.lastName))}>
                                  <KeyRound className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Resetear contraseña</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Pagination */}
        {totalAdmins > 20 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={adminsPage <= 1} onClick={() => setAdminsPage(p => p - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {adminsPage} de {Math.ceil(totalAdmins / 20)}
            </span>
            <Button variant="outline" size="sm" disabled={adminsPage >= Math.ceil(totalAdmins / 20)} onClick={() => setAdminsPage(p => p + 1)}>
              Siguiente
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // CORREDORES TAB
  // ============================================================
  const AgentsTab = () => (
    <div className="space-y-4">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className={isMobile ? 'h-11 pl-9' : 'pl-9'}
            placeholder="Buscar corredores..."
            value={agentsSearch}
            onChange={(e) => { setAgentsSearch(e.target.value); setAgentsPage(1) }}
          />
        </div>
        <Select value={agentsStatusFilter} onValueChange={(v) => { setAgentsStatusFilter(v); setAgentsPage(1) }}>
          <SelectTrigger className={isMobile ? 'h-11 w-full' : 'w-40'}>
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="true">Activos</SelectItem>
            <SelectItem value="false">Inactivos</SelectItem>
          </SelectContent>
        </Select>
        {isSuperAdmin && (
          <Select value={agentsManagerFilter} onValueChange={(v) => { setAgentsManagerFilter(v); setAgentsPage(1) }}>
            <SelectTrigger className={isMobile ? 'h-11 w-full' : 'w-52'}>
              <SelectValue placeholder="Administrador" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los administradores</SelectItem>
              {admins.map((admin) => (
                <SelectItem key={admin.id} value={admin.id}>
                  {formatName(admin.name, admin.lastName)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button className={isMobile ? 'w-full h-11' : ''} onClick={() => {
          setAgentForm({
            name: '', lastName: '', email: '', password: '', confirmPassword: '',
            phone: '', managerId: '', isActive: true,
          })
          setShowPassword(false)
          setCreateAgentOpen(true)
        }}>
          <UserPlus className="h-4 w-4 mr-2" /> Nuevo Corredor
        </Button>
      </div>

      {/* Table */}
      {loadingAgents ? (
        <TableSkeleton />
      ) : agents.length === 0 ? (
        <Card className="py-12">
          <p className="text-center text-muted-foreground">
            {agentsSearch || agentsManagerFilter !== 'all' ? 'No se encontraron corredores con los filtros aplicados' : 'No hay corredores registrados'}
          </p>
        </Card>
      ) : isMobile ? (
        <div className="space-y-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="p-3 border shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium text-sm">{formatName(agent.name, agent.lastName)}</p>
                  <p className="text-xs text-muted-foreground">{agent.email}</p>
                  {agent.manager && (
                    <p className="text-xs text-muted-foreground">
                      Admin: {formatName(agent.manager.name, agent.manager.lastName)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {getRoleBadge('corredor')}
                  {getStatusBadge(agent.isActive)}
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mb-3">
                <div>
                  <p className="text-sm font-semibold">{agent._count.assignedClients}</p>
                  <p className="text-[10px] text-muted-foreground">Clientes</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{agent._count.ownedPolicies}</p>
                  <p className="text-[10px] text-muted-foreground">Pólizas</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{agent._count.assignedLeads}</p>
                  <p className="text-[10px] text-muted-foreground">Leads</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">{agent._count.soldPolicies}</p>
                  <p className="text-[10px] text-muted-foreground">Vendidas</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenPortfolio(agent.id)}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Cartera
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenEditAgent(agent)}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleToggleAgentStatus(agent)}>
                  {agent.isActive ? <X className="h-3.5 w-3.5 mr-1 text-red-500" /> : <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />}
                  {agent.isActive ? 'Desactivar' : 'Activar'}
                </Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => handleOpenResetPassword(agent.id, formatName(agent.name, agent.lastName))}>
                  <KeyRound className="h-3.5 w-3.5 mr-1" /> Contraseña
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  {isSuperAdmin && <TableHead>Administrador</TableHead>}
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Clientes</TableHead>
                  <TableHead className="text-center">Pólizas</TableHead>
                  <TableHead className="text-center">Leads</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{formatName(agent.name, agent.lastName)}</p>
                        {agent.phone && <p className="text-xs text-muted-foreground">{agent.phone}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{agent.email}</TableCell>
                    {isSuperAdmin && (
                      <TableCell className="text-sm">
                        {agent.manager
                          ? formatName(agent.manager.name, agent.manager.lastName)
                          : '—'}
                      </TableCell>
                    )}
                    <TableCell>{getStatusBadge(agent.isActive)}</TableCell>
                    <TableCell className="text-center text-sm">{agent._count.assignedClients}</TableCell>
                    <TableCell className="text-center text-sm">{agent._count.ownedPolicies}</TableCell>
                    <TableCell className="text-center text-sm">{agent._count.assignedLeads}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenPortfolio(agent.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Ver cartera</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenEditAgent(agent)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleToggleAgentStatus(agent)}>
                                {agent.isActive ? <X className="h-4 w-4 text-red-500" /> : <Check className="h-4 w-4 text-emerald-500" />}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{agent.isActive ? 'Desactivar' : 'Activar'}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" onClick={() => handleOpenResetPassword(agent.id, formatName(agent.name, agent.lastName))}>
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Resetear contraseña</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalAgents > 20 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={agentsPage <= 1} onClick={() => setAgentsPage(p => p - 1)}>
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {agentsPage} de {Math.ceil(totalAgents / 20)}
          </span>
          <Button variant="outline" size="sm" disabled={agentsPage >= Math.ceil(totalAgents / 20)} onClick={() => setAgentsPage(p => p + 1)}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  )

  // ============================================================
  // CONFIGURACIÓN TAB
  // ============================================================
  const ConfigTab = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información del sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Tu rol</p>
              <div className="mt-1">{getRoleBadge(currentUser?.role || '')}</div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm font-medium mt-1">{currentUser?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Preferencias</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Las preferencias de configuración se gestionan desde la sección de Ajustes del perfil.
          </p>
        </CardContent>
      </Card>
    </div>
  )

  // ============================================================
  // RENDER
  // ============================================================
  const availableTabs = isSuperAdmin
    ? [
        { key: 'overview', label: 'Resumen', icon: TrendingUp },
        { key: 'admins', label: 'Administradores', icon: Shield },
        { key: 'agents', label: 'Corredores', icon: UserCheck },
        { key: 'config', label: 'Configuración', icon: Settings },
      ]
    : [
        { key: 'overview', label: 'Resumen', icon: TrendingUp },
        { key: 'agents', label: 'Corredores', icon: UserCheck },
        { key: 'config', label: 'Configuración', icon: Settings },
      ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Administración</h1>
        <p className="text-muted-foreground">
          {isSuperAdmin
            ? 'Gestiona administradores, corredores y la estructura jerárquica'
            : 'Gestiona tus corredores y supervisa su rendimiento'}
        </p>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={isMobile ? 'w-full grid' : ''} style={isMobile ? { gridTemplateColumns: `repeat(${availableTabs.length}, 1fr)` } : undefined}>
          {availableTabs.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key} className="text-xs sm:text-sm">
              <tab.icon className="h-4 w-4 mr-1.5" />
              {isMobile ? tab.label.slice(0, 6) : tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewTab />
        </TabsContent>

        {isSuperAdmin && (
          <TabsContent value="admins" className="mt-4">
            <AdminsTab />
          </TabsContent>
        )}

        <TabsContent value="agents" className="mt-4">
          <AgentsTab />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <ConfigTab />
        </TabsContent>
      </Tabs>

      {/* ============================================================ */}
      {/* DIALOGS & SHEETS */}
      {/* ============================================================ */}

      {/* ---- Create Admin ---- */}
      {isMobile ? (
        <Sheet open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Nuevo Administrador</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <AdminFormContent form={adminForm} setForm={setAdminForm} isEdit={false} />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateAdminOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11" onClick={handleCreateAdmin} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Crear
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Administrador</DialogTitle>
              <DialogDescription>Crea una nueva cuenta de administrador de grupo</DialogDescription>
            </DialogHeader>
            <AdminFormContent form={adminForm} setForm={setAdminForm} isEdit={false} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateAdminOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateAdmin} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Crear Administrador
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Edit Admin ---- */}
      {isMobile ? (
        <Sheet open={editAdminOpen} onOpenChange={setEditAdminOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Editar Administrador</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <AdminFormContent form={editAdminForm} setForm={setEditAdminForm} isEdit={true} />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setEditAdminOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11" onClick={handleUpdateAdmin} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={editAdminOpen} onOpenChange={setEditAdminOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Administrador</DialogTitle>
              <DialogDescription>Modifica los datos del administrador</DialogDescription>
            </DialogHeader>
            <AdminFormContent form={editAdminForm} setForm={setEditAdminForm} isEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAdminOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateAdmin} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Create Agent ---- */}
      {isMobile ? (
        <Sheet open={createAgentOpen} onOpenChange={setCreateAgentOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Nuevo Corredor</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <AgentFormContent form={agentForm} setForm={setAgentForm} isEdit={false} />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateAgentOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11" onClick={handleCreateAgent} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Crear
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={createAgentOpen} onOpenChange={setCreateAgentOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nuevo Corredor</DialogTitle>
              <DialogDescription>
                {isSuperAdmin ? 'Crea una nueva cuenta de corredor/agente' : 'Crea un nuevo corredor asignado a tu grupo'}
              </DialogDescription>
            </DialogHeader>
            <AgentFormContent form={agentForm} setForm={setAgentForm} isEdit={false} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateAgentOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreateAgent} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
                Crear Corredor
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Edit Agent ---- */}
      {isMobile ? (
        <Sheet open={editAgentOpen} onOpenChange={setEditAgentOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Editar Corredor</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <AgentFormContent form={editAgentForm} setForm={setEditAgentForm} isEdit={true} />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setEditAgentOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11" onClick={handleUpdateAgent} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={editAgentOpen} onOpenChange={setEditAgentOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Editar Corredor</DialogTitle>
              <DialogDescription>Modifica los datos del corredor</DialogDescription>
            </DialogHeader>
            <AgentFormContent form={editAgentForm} setForm={setEditAgentForm} isEdit={true} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditAgentOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateAgent} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Portfolio (Ficha de Corredor) ---- */}
      {isMobile ? (
        <Sheet open={portfolioOpen} onOpenChange={setPortfolioOpen}>
          <SheetContent side="bottom" className="h-[90vh]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <ChevronLeft className="h-5 w-5" />
                Ficha de Corredor
              </SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <PortfolioContent />
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={portfolioOpen} onOpenChange={setPortfolioOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-emerald-600" />
                Ficha de Corredor
              </DialogTitle>
              <DialogDescription>Detalle completo del corredor y su cartera</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[65vh]">
              <PortfolioContent />
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Reset Password ---- */}
      {isMobile ? (
        <Sheet open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <SheetContent side="bottom" className="h-auto">
            <SheetHeader>
              <SheetTitle>Resetear Contraseña</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ResetPasswordContent />
            </div>
            <div className="mt-4 flex gap-3">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setResetPasswordOpen(false)}>Cancelar</Button>
              <Button className="flex-1 h-11" onClick={handleResetPassword} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Restablecer
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Resetear Contraseña</DialogTitle>
              <DialogDescription>Establece una nueva contraseña para el usuario</DialogDescription>
            </DialogHeader>
            <ResetPasswordContent />
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetPasswordOpen(false)}>Cancelar</Button>
              <Button onClick={handleResetPassword} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                Restablecer Contraseña
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ---- Confirm Dialog ---- */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDialog.onConfirm}
              className={confirmDialog.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


