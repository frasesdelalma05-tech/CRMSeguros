'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { api, type Policy, type AdminUser, type AuditLogEntry } from '@/lib/api'
import {
  ArrowLeft, Edit, Shield, RefreshCw, Eye,
  Calendar, Clock, CreditCard, AlertTriangle, ArrowRightLeft,
  CheckCircle2, XCircle, ExternalLink,
  User, ChevronDown, ChevronUp, Info, DollarSign, UserCheck,
} from 'lucide-react'

// Status badge colors
const statusColors: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-700',
  vencida: 'bg-red-100 text-red-700',
  cancelada: 'bg-gray-100 text-gray-700',
  en_renovacion: 'bg-amber-100 text-amber-700',
  pendiente: 'bg-blue-100 text-blue-700',
  suspendida: 'bg-orange-100 text-orange-700',
}

const statusLabels: Record<string, string> = {
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
  en_renovacion: 'En Renovación',
  pendiente: 'Pendiente',
  suspendida: 'Suspendida',
}

// Format currency in Spanish format: "€1.234,56"
function formatEuro(value: number): string {
  return value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'
}

// Format date in Spanish: "15 de enero de 2024"
function formatSpanishDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
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

function getDaysUntilExpiry(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getExpiryInfo(endDate: string): { text: string; colorClass: string } | null {
  const days = getDaysUntilExpiry(endDate)
  if (days < 0) return { text: 'Vencida', colorClass: 'text-red-600' }
  if (days <= 30) return { text: `Vence en ${days} día${days !== 1 ? 's' : ''}`, colorClass: 'text-red-600 font-semibold' }
  if (days <= 60) return { text: `Vence en ${days} días`, colorClass: 'text-amber-600 font-semibold' }
  return { text: `${days} días restantes`, colorClass: 'text-emerald-600' }
}

// Check if user can edit the policy
function canEditPolicy(userRole: string, soldByAgentId: string | undefined, ownerAgentId: string | undefined, userId: string): boolean {
  if (userRole === 'atencion_cliente' || userRole === 'solo_lectura') return false
  if (userRole === 'super_administrador' || userRole === 'administrador') return true
  if (userRole === 'corredor') return ownerAgentId === userId || soldByAgentId === userId
  return false
}

function canReassign(userRole: string): boolean {
  return userRole === 'super_administrador' || userRole === 'administrador'
}

// Timeline entry type with richer data
interface TimelineEntry {
  label: string
  description?: string
  date: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  actionType: string
  actionTypeBadge: string
  who?: string
  detail?: string
  jsonDetails?: string | null
}

// Build timeline entries from policy data + audit logs
function buildTimelineEntries(
  policy: Policy,
  auditLogs: AuditLogEntry[],
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // 1. Policy created
  entries.push({
    label: 'Póliza creada',
    description: `Póliza ${policy.policyNumber} dada de alta`,
    date: policy.createdAt,
    icon: CheckCircle2,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    actionType: 'created',
    actionTypeBadge: 'Creación',
    who: policy.soldByAgent ? `${policy.soldByAgent.name} ${policy.soldByAgent.lastName}` : undefined,
  })

  // 2. Status changes from audit logs
  const statusChangeLogs = auditLogs.filter(
    (log) => log.entity === 'policy' && log.action.toLowerCase().includes('status')
  )
  for (const log of statusChangeLogs) {
    const isCancel = log.action.toLowerCase().includes('cancel')
    const isRenew = log.action.toLowerCase().includes('renov')
    entries.push({
      label: isCancel ? 'Póliza cancelada' : isRenew ? 'Póliza renovada' : 'Cambio de estado',
      description: log.details || undefined,
      date: log.createdAt,
      icon: isCancel ? XCircle : isRenew ? RefreshCw : Info,
      color: isCancel ? 'text-red-500' : isRenew ? 'text-amber-500' : 'text-blue-500',
      bgColor: isCancel ? 'bg-red-50' : isRenew ? 'bg-amber-50' : 'bg-blue-50',
      borderColor: isCancel ? 'border-red-200' : isRenew ? 'border-amber-200' : 'border-blue-200',
      actionType: isCancel ? 'cancelled' : isRenew ? 'renewed' : 'status_changed',
      actionTypeBadge: isCancel ? 'Cancelación' : isRenew ? 'Renovación' : 'Estado',
      who: log.user ? `${log.user.name} ${log.user.lastName}` : undefined,
      jsonDetails: log.details,
    })
  }

  // 3. Reassignment logs
  const reassignLogs = auditLogs.filter(
    (log) => log.entity === 'policy' && log.action.toLowerCase().includes('reassign')
  )
  for (const log of reassignLogs) {
    entries.push({
      label: 'Póliza reasignada',
      description: log.details || 'Cambio de corredor responsable',
      date: log.createdAt,
      icon: ArrowRightLeft,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      actionType: 'reassigned',
      actionTypeBadge: 'Reasignación',
      who: log.user ? `${log.user.name} ${log.user.lastName}` : undefined,
      jsonDetails: log.details,
    })
  }

  // 4. Premium changes
  const premiumLogs = auditLogs.filter(
    (log) => log.entity === 'policy' && log.action.toLowerCase().includes('premium')
  )
  for (const log of premiumLogs) {
    entries.push({
      label: 'Cambio de prima',
      description: log.details || 'Actualización del importe de prima',
      date: log.createdAt,
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      actionType: 'premium_changed',
      actionTypeBadge: 'Prima',
      who: log.user ? `${log.user.name} ${log.user.lastName}` : undefined,
      jsonDetails: log.details,
    })
  }

  // 5. Renewal date
  if (policy.renewalDate) {
    entries.push({
      label: 'Fecha de renovación',
      description: 'Próxima fecha de renovación programada',
      date: policy.renewalDate,
      icon: RefreshCw,
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      actionType: 'renewed',
      actionTypeBadge: 'Renovación',
    })
  }

  // 6. Cancellation
  if (policy.cancellationDate) {
    entries.push({
      label: 'Póliza cancelada',
      date: policy.cancellationDate,
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      actionType: 'cancelled',
      actionTypeBadge: 'Cancelación',
      detail: policy.cancellationReason,
    })
  }

  // Sort by date descending (newest first)
  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return entries
}

// ─── Timeline Entry Component ──────────────────────────────────────────────
function TimelineEntryItem({ entry, defaultOpen = false }: { entry: TimelineEntry; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const Icon = entry.icon
  const hasDetails = entry.detail || entry.jsonDetails

  return (
    <div className="relative flex gap-3 p-3">
      <div className={`w-8 h-8 rounded-full ${entry.bgColor} border-2 ${entry.borderColor} flex items-center justify-center shrink-0 z-10`}>
        <Icon className={`h-3.5 w-3.5 ${entry.color}`} />
      </div>
      <div className={`flex-1 min-w-0 rounded-lg border ${entry.borderColor} overflow-hidden`}>
        <div className={`${entry.bgColor} p-3`}>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium text-gray-900">{entry.label}</p>
            <Badge className={`text-[9px] h-4 px-1.5 ${entry.bgColor} ${entry.color} border ${entry.borderColor}`}>
              {entry.actionTypeBadge}
            </Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{formatSpanishDate(entry.date)}</p>
          {entry.who && (
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
              <User className="h-3 w-3" />
              {entry.who}
            </p>
          )}
        </div>
        {entry.description && (
          <p className="text-xs text-gray-600 px-3 py-2 bg-white">{entry.description}</p>
        )}
        {entry.detail && !hasDetails?.toString().startsWith('{') && (
          <p className="text-xs text-gray-400 px-3 pb-2 bg-white">{entry.detail}</p>
        )}
        {hasDetails && (
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-1 text-[10px] text-emerald-600 hover:text-emerald-700 px-3 py-1.5 bg-white w-full text-left border-t border-gray-100">
                {isOpen ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
                {isOpen ? 'Menos detalles' : 'Ver detalles'}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-3 pb-2 bg-gray-50 text-[11px] text-gray-500 border-t border-gray-100">
                {entry.detail && <p className="py-1">{entry.detail}</p>}
                {entry.jsonDetails && (
                  <pre className="whitespace-pre-wrap text-[10px] text-gray-400 mt-1 bg-white p-2 rounded border border-gray-100 overflow-x-auto">
                    {(() => {
                      try {
                        return JSON.stringify(JSON.parse(entry.jsonDetails), null, 2)
                      } catch {
                        return entry.jsonDetails
                      }
                    })()}
                  </pre>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>
    </div>
  )
}

// ─── Agent Card (for Vendida por / Responsable) ───────────────────────────
function AgentCard({
  label,
  agent,
  date,
  fallbackLetter,
  fallbackBg,
  action,
}: {
  label: string
  agent: { id: string; name: string; lastName: string } | undefined
  date?: string
  fallbackLetter: string
  fallbackBg: string
  action?: React.ReactNode
}) {
  const name = agent ? `${agent.name} ${agent.lastName}` : '-'
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className={`${fallbackBg} text-sm font-bold`}>
          {agent ? `${agent.name.charAt(0)}${agent.lastName.charAt(0)}` : fallbackLetter}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{label}</p>
        <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
        {date && (
          <p className="text-[11px] text-gray-400">{formatShortDate(date)}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PolicyDetailPage() {
  const { selectedId, setPage, token, user } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [policy, setPolicy] = useState<Policy | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [reassignOpen, setReassignOpen] = useState(false)
  const [confirmReassignOpen, setConfirmReassignOpen] = useState(false)
  const [agents, setAgents] = useState<AdminUser[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')
  const [reassignLoading, setReassignLoading] = useState(false)
  const [reassignReason, setReassignReason] = useState('')
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])

  // Edit form state
  const [editForm, setEditForm] = useState({
    status: '',
    premium: '',
    paymentMethod: '',
    endDate: '',
  })

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.getPolicies({ limit: '100' })
        const found = res.data.find((p) => p.id === selectedId)
        if (!cancelled) {
          if (found) {
            setPolicy(found)
            setEditForm({
              status: found.status,
              premium: found.premium.toString(),
              paymentMethod: found.paymentMethod || '',
              endDate: found.endDate ? found.endDate.split('T')[0] : '',
            })
          } else {
            setPolicy(null)
          }
        }
      } catch {
        if (!cancelled) setPolicy(null)
      } finally {
        if (!cancelled) setLoading(false)
      }

      try {
        const res = await api.getAuditLogs({ entity: 'policy', entityId: selectedId, limit: '50' })
        if (!cancelled) setAuditLogs(res.data)
      } catch {
        if (!cancelled) setAuditLogs([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [selectedId, token, refreshKey])

  useEffect(() => {
    if (!reassignOpen) return
    let cancelled = false
    async function load() {
      try {
        const res = await api.getAgents({ limit: '100' })
        if (!cancelled) setAgents(res.data)
      } catch {
        if (!cancelled) setAgents([])
      }
    }
    load()
    return () => { cancelled = true }
  }, [reassignOpen])

  // Derived values
  const userCanEdit = user ? canEditPolicy(user.role, policy?.soldByAgentId, policy?.ownerAgentId, user.id) : false
  const userCanReassign = user ? canReassign(user.role) : false
  const isReadOnly = user?.role === 'atencion_cliente' || user?.role === 'solo_lectura'

  const handleReassign = async () => {
    if (!policy || !selectedAgentId) return
    setReassignLoading(true)
    try {
      await api.reassignPolicy(policy.id, selectedAgentId)
      toast({ title: 'Corredor reasignado', description: 'La póliza ha sido reasignada correctamente' })
      setConfirmReassignOpen(false)
      setReassignOpen(false)
      setSelectedAgentId('')
      setReassignReason('')
      // Refresh policy data
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al reasignar'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    } finally {
      setReassignLoading(false)
    }
  }

  const handleRenew = () => {
    toast({ title: 'Renovar póliza', description: 'Funcionalidad de renovación en desarrollo' })
  }

  const handleSaveEdit = async () => {
    if (!policy) return
    try {
      await api.updatePolicy(policy.id, {
        status: editForm.status,
        premium: Number(editForm.premium),
        paymentMethod: editForm.paymentMethod || undefined,
        endDate: editForm.endDate,
      })
      toast({ title: 'Póliza actualizada' })
      setEditOpen(false)
      setRefreshKey((k) => k + 1)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al actualizar'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  // ===== LOADING =====
  if (loading) {
    if (isMobile) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 rounded-lg lg:col-span-2" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      </div>
    )
  }

  // ===== NOT FOUND =====
  if (!policy) {
    return (
      <div className="text-center py-12">
        <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <p className="text-lg font-medium text-gray-500">Póliza no encontrada</p>
        <p className="text-sm text-gray-400 mt-1">La póliza solicitada no existe o no tienes acceso</p>
        <Button variant="outline" onClick={() => setPage('policies')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Pólizas
        </Button>
      </div>
    )
  }

  // Derived display values
  const clientName = policy.client ? `${policy.client.name} ${policy.client.lastName}` : '-'
  const productName = policy.productName || policy.product?.name || '-'
  const productCategory = policy.product?.category
  const expiryInfo = getExpiryInfo(policy.endDate)
  const soldByAgentName = policy.soldByAgent ? `${policy.soldByAgent.name} ${policy.soldByAgent.lastName}` : '-'
  const ownerAgentName = policy.ownerAgent ? `${policy.ownerAgent.name} ${policy.ownerAgent.lastName}` : '-'
  const selectedAgentName = agents.find((a) => a.id === selectedAgentId)

  // Build timeline entries
  const timelineEntries = buildTimelineEntries(policy, auditLogs)

  // Reassignment logs for the "Vendida por / Responsable" section
  const reassignLogs = auditLogs
    .filter((log) => log.entity === 'policy' && log.action.toLowerCase().includes('reassign'))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Shared Corredores Card content
  const corredoresContent = (
    <div className="space-y-3">
      {/* Vendida por */}
      <AgentCard
        label="Vendida por"
        agent={policy.soldByAgent}
        date={policy.createdAt}
        fallbackLetter="V"
        fallbackBg="bg-emerald-100 text-emerald-700"
      />

      <Separator />

      {/* Responsable actual */}
      <AgentCard
        label="Responsable actual"
        agent={policy.ownerAgent}
        fallbackLetter="R"
        fallbackBg="bg-teal-100 text-teal-700"
        action={userCanReassign ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs shrink-0 gap-1"
            onClick={() => setReassignOpen(true)}
          >
            <ArrowRightLeft className="h-3 w-3" /> Reasignar
          </Button>
        ) : undefined}
      />

      {/* Assignment change history */}
      {reassignLogs.length > 0 && (
        <>
          <Separator />
          <div>
            <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium mb-2">Historial de asignaciones</p>
            <div className="space-y-1.5">
              {reassignLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="flex items-center gap-2 text-xs text-gray-500">
                  <ArrowRightLeft className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {log.user ? `${log.user.name} ${log.user.lastName}` : 'Sistema'} · {formatShortDate(log.createdAt)}
                  </span>
                </div>
              ))}
              {reassignLogs.length > 3 && (
                <p className="text-[10px] text-gray-400 pl-5">+{reassignLogs.length - 3} más</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )

  // Shared Reassign Dialog content
  const reassignDialogContent = (
    <div className="space-y-4">
      {/* Current agent info */}
      <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
        <p className="text-xs text-gray-500 mb-2">Responsable actual</p>
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-teal-100 text-teal-700 text-xs font-bold">
              {policy.ownerAgent ? `${policy.ownerAgent.name.charAt(0)}${policy.ownerAgent.lastName.charAt(0)}` : 'R'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-gray-900">{ownerAgentName}</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Nuevo corredor responsable</Label>
        <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
          <SelectTrigger><SelectValue placeholder="Seleccionar corredor" /></SelectTrigger>
          <SelectContent>
            {agents.map((agent) => {
              // Show stats alongside agent name
              const agentData = agent as AdminUser & { _count?: { assignedClients?: number; soldPolicies?: number; ownedPolicies?: number } }
              const clientCount = agentData._count?.assignedClients ?? 0
              const policyCount = (agentData._count?.soldPolicies ?? 0) + (agentData._count?.ownedPolicies ?? 0)
              return (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{agent.name} {agent.lastName}</span>
                    {policyCount > 0 && (
                      <span className="text-[10px] text-gray-400">
                        ({clientCount} clientes, {policyCount} pólizas)
                      </span>
                    )}
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Selected agent preview with stats */}
      {selectedAgentId && selectedAgentName && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-bold">
              {`${selectedAgentName.name.charAt(0)}${selectedAgentName.lastName.charAt(0)}`}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">
              {selectedAgentName.name} {selectedAgentName.lastName}
            </p>
            {selectedAgentName.position && (
              <p className="text-xs text-gray-500">{selectedAgentName.position}</p>
            )}
            {selectedAgentName.email && (
              <p className="text-xs text-gray-400">{selectedAgentName.email}</p>
            )}
            {/* Stats */}
            {(() => {
              const agentData = selectedAgentName as AdminUser & { _count?: { assignedClients?: number; soldPolicies?: number; ownedPolicies?: number } }
              const clientCount = agentData._count?.assignedClients ?? 0
              const policyCount = (agentData._count?.soldPolicies ?? 0) + (agentData._count?.ownedPolicies ?? 0)
              return (clientCount > 0 || policyCount > 0) ? (
                <div className="flex gap-3 mt-1">
                  {clientCount > 0 && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                      <User className="h-2.5 w-2.5" /> {clientCount} clientes
                    </span>
                  )}
                  {policyCount > 0 && (
                    <span className="text-[10px] text-emerald-600 flex items-center gap-0.5">
                      <Shield className="h-2.5 w-2.5" /> {policyCount} pólizas
                    </span>
                  )}
                </div>
              ) : null
            })()}
          </div>
        </div>
      )}

      {/* Reason field */}
      <div className="space-y-2">
        <Label>Motivo de la reasignación <span className="text-gray-400 font-normal">(opcional)</span></Label>
        <Textarea
          placeholder="Indica el motivo de la reasignación..."
          value={reassignReason}
          onChange={(e) => setReassignReason(e.target.value)}
          rows={2}
          className="text-sm"
        />
      </div>
    </div>
  )

  // Shared Confirm AlertDialog content
  const confirmReassignContent = (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>Confirmar reasignación</AlertDialogTitle>
        <AlertDialogDescription asChild>
          <div className="space-y-3">
            <p>
              ¿Estás seguro de que deseas reasignar la póliza <span className="font-semibold">{policy.policyNumber}</span>?
            </p>
            {/* Summary of changes */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-2 border border-gray-100">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 shrink-0">De:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-teal-100 text-teal-700 text-[8px] font-bold">
                      {policy.ownerAgent ? `${policy.ownerAgent.name.charAt(0)}${policy.ownerAgent.lastName.charAt(0)}` : 'R'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-gray-700">{ownerAgentName}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-3 w-3 text-gray-400 shrink-0" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 shrink-0">A:</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-[8px] font-bold">
                      {selectedAgentName ? `${selectedAgentName.name.charAt(0)}${selectedAgentName.lastName.charAt(0)}` : ''}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-emerald-700">
                    {selectedAgentName ? `${selectedAgentName.name} ${selectedAgentName.lastName}` : ''}
                  </span>
                </div>
              </div>
              {reassignReason && (
                <div className="pt-1 border-t border-gray-200">
                  <span className="text-gray-500">Motivo: </span>
                  <span className="text-gray-700">{reassignReason}</span>
                </div>
              )}
            </div>
          </div>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={reassignLoading}>Cancelar</AlertDialogCancel>
        <AlertDialogAction onClick={handleReassign} disabled={reassignLoading} className="bg-emerald-600 hover:bg-emerald-700">
          {reassignLoading ? 'Reasignando...' : 'Confirmar reasignación'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )

  // Shared Timeline content
  const timelineContent = (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
      <div className="space-y-0">
        {timelineEntries.length > 0 ? (
          timelineEntries.map((entry, idx) => (
            <TimelineEntryItem key={idx} entry={entry} defaultOpen={idx === 0} />
          ))
        ) : (
          <div className="py-6 text-center text-gray-400">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Sin historial registrado</p>
          </div>
        )}
      </div>
    </div>
  )

  // ─── MOBILE VIEW ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-4 -mx-3 px-3">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => setPage('policies')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{policy.policyNumber}</h1>
            <p className="text-xs text-gray-500 truncate">{productName}</p>
          </div>
          <Badge className={`${statusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs shrink-0`}>
            {statusLabels[policy.status] || policy.status.replace('_', ' ')}
          </Badge>
        </div>

        {/* Expiry alert */}
        {expiryInfo && (policy.status === 'activa' || policy.status === 'en_renovacion') && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getDaysUntilExpiry(policy.endDate) <= 30 ? 'bg-red-50 border border-red-100' : getDaysUntilExpiry(policy.endDate) <= 60 ? 'bg-amber-50 border border-amber-100' : 'bg-emerald-50 border border-emerald-100'}`}>
            <AlertTriangle className={`h-4 w-4 shrink-0 ${expiryInfo.colorClass}`} />
            <span className={`text-xs ${expiryInfo.colorClass}`}>{expiryInfo.text}</span>
          </div>
        )}

        {/* Info Card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500">Cliente</p>
                <button
                  className="text-sm font-medium text-emerald-700 truncate block text-left hover:underline"
                  onClick={() => {
                    if (policy.clientId) {
                      useAppStore.getState().setSelectedId(policy.clientId)
                      useAppStore.getState().setPage('client-detail')
                    }
                  }}
                >
                  {clientName}
                  <ExternalLink className="h-3 w-3 inline ml-1" />
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500">Producto</p>
                <p className="text-sm font-medium text-gray-900">{productName}</p>
                {productCategory && (
                  <Badge variant="outline" className="text-[10px] h-5 mt-0.5">{productCategory}</Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <Badge className={`${statusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs mt-0.5`}>
                  {statusLabels[policy.status] || policy.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prima anual</p>
                <p className="text-sm font-bold text-gray-900">{formatEuro(policy.premium)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fecha inicio</p>
                <p className="text-sm text-gray-700">{formatSpanishDate(policy.startDate)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Fecha vencimiento</p>
                <p className={`text-sm ${expiryInfo?.colorClass || 'text-gray-700'}`}>
                  {formatSpanishDate(policy.endDate)}
                </p>
              </div>
              {policy.paymentMethod && (
                <div>
                  <p className="text-xs text-gray-500">Método de pago</p>
                  <p className="text-sm text-gray-700 capitalize">{policy.paymentMethod}</p>
                </div>
              )}
            </div>

            {isReadOnly && (
              <>
                <Separator />
                <div className="flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-gray-400" />
                  <span className="text-xs text-gray-400">Solo lectura</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Corredores Section - Enhanced */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm font-semibold text-gray-900">Corredores</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {corredoresContent}
          </CardContent>
        </Card>

        {/* Timeline / History - Enhanced */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold text-gray-900">Historial de cambios</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {timelineContent}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-2">
          {userCanEdit && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setEditOpen(true)}
            >
              <Edit className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
          {userCanReassign && (
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setReassignOpen(true)}
            >
              <ArrowRightLeft className="mr-2 h-4 w-4" /> Reasignar
            </Button>
          )}
          {(policy.status === 'en_renovacion' || (getDaysUntilExpiry(policy.endDate) <= 60 && getDaysUntilExpiry(policy.endDate) > 0)) && (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRenew}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Renovar
            </Button>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Póliza</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="en_renovacion">En Renovación</SelectItem>
                    <SelectItem value="vencida">Vencida</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Prima anual</Label>
                <Input type="number" value={editForm.premium} onChange={(e) => setEditForm({ ...editForm, premium: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Método de pago</Label>
                <Select value={editForm.paymentMethod} onValueChange={(v) => setEditForm({ ...editForm, paymentMethod: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensual">Mensual</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fecha vencimiento</Label>
                <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reassign Dialog */}
        <Dialog open={reassignOpen} onOpenChange={(open) => { setReassignOpen(open); if (!open) { setSelectedAgentId(''); setReassignReason('') } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reasignar Corredor</DialogTitle>
            </DialogHeader>
            {reassignDialogContent}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setReassignOpen(false); setSelectedAgentId(''); setReassignReason('') }}>Cancelar</Button>
              <Button
                onClick={() => setConfirmReassignOpen(true)}
                disabled={!selectedAgentId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Reasignar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirm Reassign AlertDialog */}
        <AlertDialog open={confirmReassignOpen} onOpenChange={setConfirmReassignOpen}>
          <AlertDialogContent>
            {confirmReassignContent}
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ─── DESKTOP / TABLET VIEW ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setPage('policies')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{policy.policyNumber}</h1>
          <p className="text-sm text-gray-500">{productName}</p>
        </div>
        <Badge className={`${statusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-sm px-3 py-1`}>
          {statusLabels[policy.status] || policy.status.replace('_', ' ')}
        </Badge>
        {isReadOnly && (
          <Badge variant="outline" className="text-sm text-gray-400 border-gray-200 px-3 py-1.5">
            <Eye className="h-4 w-4 mr-1.5" /> Solo lectura
          </Badge>
        )}
        {userCanEdit && (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
        )}
        {userCanReassign && (
          <Button variant="outline" onClick={() => setReassignOpen(true)}>
            <ArrowRightLeft className="mr-2 h-4 w-4" /> Reasignar
          </Button>
        )}
        {(policy.status === 'en_renovacion' || (getDaysUntilExpiry(policy.endDate) <= 60 && getDaysUntilExpiry(policy.endDate) > 0)) && (
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleRenew}>
            <RefreshCw className="mr-2 h-4 w-4" /> Renovar Póliza
          </Button>
        )}
      </div>

      {/* Expiry alert */}
      {expiryInfo && (policy.status === 'activa' || policy.status === 'en_renovacion') && (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
          getDaysUntilExpiry(policy.endDate) <= 30
            ? 'bg-red-50 border border-red-100'
            : getDaysUntilExpiry(policy.endDate) <= 60
              ? 'bg-amber-50 border border-amber-100'
              : 'bg-emerald-50 border border-emerald-100'
        }`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${expiryInfo.colorClass}`} />
          <span className={`text-sm ${expiryInfo.colorClass}`}>{expiryInfo.text}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info Card - 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Información de la Póliza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1">Cliente</p>
                <button
                  className="text-sm font-medium text-emerald-700 hover:underline flex items-center gap-1"
                  onClick={() => {
                    if (policy.clientId) {
                      useAppStore.getState().setSelectedId(policy.clientId)
                      useAppStore.getState().setPage('client-detail')
                    }
                  }}
                >
                  {clientName}
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Producto</p>
                <p className="text-sm font-medium text-gray-900">{productName}</p>
                {productCategory && (
                  <Badge variant="outline" className="text-[10px] h-5 mt-1">{productCategory}</Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Estado</p>
                <Badge className={`${statusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                  {statusLabels[policy.status] || policy.status.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Prima anual</p>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gray-400" />
                  <p className="text-sm font-bold text-gray-900">{formatEuro(policy.premium)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Fecha inicio</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-700">{formatSpanishDate(policy.startDate)}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Fecha vencimiento</p>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className={`text-sm ${expiryInfo?.colorClass || 'text-gray-700'}`}>
                    {formatSpanishDate(policy.endDate)}
                  </p>
                </div>
                {expiryInfo && (
                  <p className={`text-xs mt-0.5 ${expiryInfo.colorClass}`}>{expiryInfo.text}</p>
                )}
              </div>
              {policy.paymentMethod && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Método de pago</p>
                  <p className="text-sm text-gray-700 capitalize">{policy.paymentMethod}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: Corredores + Timeline */}
        <div className="space-y-6">
          {/* Corredores Card - Enhanced */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-600" />
                <CardTitle className="text-base">Corredores</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {corredoresContent}
            </CardContent>
          </Card>

          {/* Timeline Card - Enhanced */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historial de cambios</CardTitle>
            </CardHeader>
            <CardContent>
              {timelineContent}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Póliza</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activa">Activa</SelectItem>
                  <SelectItem value="en_renovacion">En Renovación</SelectItem>
                  <SelectItem value="vencida">Vencida</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prima anual</Label>
              <Input type="number" value={editForm.premium} onChange={(e) => setEditForm({ ...editForm, premium: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Método de pago</Label>
              <Select value={editForm.paymentMethod} onValueChange={(v) => setEditForm({ ...editForm, paymentMethod: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fecha vencimiento</Label>
              <Input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={(open) => { setReassignOpen(open); if (!open) { setSelectedAgentId(''); setReassignReason('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reasignar Corredor</DialogTitle>
          </DialogHeader>
          {reassignDialogContent}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReassignOpen(false); setSelectedAgentId(''); setReassignReason('') }}>Cancelar</Button>
            <Button
              onClick={() => setConfirmReassignOpen(true)}
              disabled={!selectedAgentId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Reassign AlertDialog */}
      <AlertDialog open={confirmReassignOpen} onOpenChange={setConfirmReassignOpen}>
        <AlertDialogContent>
          {confirmReassignContent}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
