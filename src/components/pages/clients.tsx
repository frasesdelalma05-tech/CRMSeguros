'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { api, type Client, type DniSearchResult } from '@/lib/api'
import {
  Plus, Search, Users, Phone, MessageSquare, Mail, CalendarPlus,
  StickyNote, Eye, ChevronDown, Loader2, FileSearch, Shield, UserCheck, Lock,
  AlertTriangle,
} from 'lucide-react'

// Display type that normalizes API data for the component
interface ClientDisplay {
  id: string
  name: string
  lastName: string
  documentType?: string
  documentNumber?: string
  email: string
  phone?: string
  status: string
  ownerAgentId?: string
  agentName: string
  tags: string[]
  rgpdConsent: boolean
  rgpdConsentDate?: string
  loyaltyScore: number
  isAtRisk: boolean
  createdAt: string
  updatedAt: string
}

function mapApiClient(c: Client): ClientDisplay {
  return {
    id: c.id,
    name: c.name,
    lastName: c.lastName,
    documentType: c.documentType,
    documentNumber: c.documentNumber,
    email: c.email,
    phone: c.phone,
    status: c.status,
    ownerAgentId: c.ownerAgentId,
    agentName: c.ownerAgent ? `${c.ownerAgent.name} ${c.ownerAgent.lastName}` : '',
    tags: c.tags ? c.tags.split(',').filter(Boolean) : [],
    rgpdConsent: c.rgpdConsent,
    rgpdConsentDate: c.rgpdConsentDate,
    loyaltyScore: c.loyaltyScore?.score ?? 0,
    isAtRisk: c.loyaltyScore?.isAtRisk ?? false,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  }
}

const statusColors: Record<string, string> = {
  activo: 'bg-emerald-100 text-emerald-700',
  inactivo: 'bg-gray-100 text-gray-700',
  prospecto: 'bg-amber-100 text-amber-700',
}

const statusOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'prospecto', label: 'Prospecto' },
]

// ─── Mobile Client Card ──────────────────────────────────────────────────────
function MobileClientCard({
  client,
  onRowClick,
  onSchedule,
  onAddNote,
}: {
  client: ClientDisplay
  onRowClick: (id: string) => void
  onSchedule: (client: ClientDisplay) => void
  onAddNote: (client: ClientDisplay) => void
}) {
  const phoneClean = client.phone?.replace(/\D/g, '') || ''
  const mainTag = client.tags[0] || ''

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        {/* Header row: name + status */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-bold text-gray-900 truncate">
              {client.name} {client.lastName}
            </h3>
          </div>
          <Badge className={`${statusColors[client.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs shrink-0`}>
            {client.status}
          </Badge>
        </div>

        {/* Info rows */}
        <div className="space-y-1 mb-3 text-sm">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="flex items-center gap-2 text-gray-600 hover:text-emerald-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{client.phone}</span>
            </a>
          )}
          {mainTag && (
            <div className="flex items-center gap-2 text-gray-500">
              <Badge variant="outline" className="text-[10px] h-5">{mainTag}</Badge>
              {client.tags.length > 1 && (
                <span className="text-xs text-gray-400">+{client.tags.length - 1}</span>
              )}
            </div>
          )}
          {client.agentName && (
            <p className="text-xs text-gray-400 truncate">
              Corredor/Agente: {client.agentName}
            </p>
          )}
          <p className="text-xs text-gray-400">
            Último contacto: {client.updatedAt ? new Date(client.updatedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : '-'}
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors shrink-0 min-h-[36px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Llamar</span>
            </a>
          )}
          {phoneClean && (
            <a
              href={`https://wa.me/${phoneClean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 text-xs font-medium hover:bg-green-100 transition-colors shrink-0 min-h-[36px]"
              onClick={(e) => e.stopPropagation()}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </a>
          )}
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 text-sky-700 text-xs font-medium hover:bg-sky-100 transition-colors shrink-0 min-h-[36px]"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </a>
          )}
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors shrink-0 min-h-[36px]"
            onClick={(e) => { e.stopPropagation(); onSchedule(client) }}
          >
            <CalendarPlus className="h-3.5 w-3.5" />
            <span>Cita</span>
          </button>
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 text-xs font-medium hover:bg-purple-100 transition-colors shrink-0 min-h-[36px]"
            onClick={(e) => { e.stopPropagation(); onAddNote(client) }}
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span>Nota</span>
          </button>
          <button
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 text-gray-700 text-xs font-medium hover:bg-gray-100 transition-colors shrink-0 min-h-[36px]"
            onClick={(e) => { e.stopPropagation(); onRowClick(client.id) }}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Ver</span>
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mobile Skeleton Card ────────────────────────────────────────────────────
function MobileSkeletonCard() {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <div className="flex gap-1.5">
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-20 rounded-lg" />
          <Skeleton className="h-9 w-14 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Desktop Skeleton Row ────────────────────────────────────────────────────
function DesktopSkeletonRow() {
  return (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="hidden sm:table-cell"><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
      <TableCell className="hidden lg:table-cell"><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-12 rounded-full" /></TableCell>
    </TableRow>
  )
}

// ─── Empty State ─────────────────────────────────────────────────────────────
function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <Users className="h-10 w-10 text-gray-300" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">Todavía no hay clientes registrados</h3>
      <p className="text-sm text-gray-500 mb-4 max-w-xs">
        Prueba ajustando los filtros o el término de búsqueda para encontrar lo que buscas.
      </p>
      <Button variant="outline" size="sm" onClick={onClear}>
        Limpiar filtros
      </Button>
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { setPage, setSelectedId, token, user } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [clients, setClients] = useState<ClientDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPageNum] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', lastName: '', documentType: 'DNI', documentNumber: '', email: '', phone: '' })
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteClient, setNoteClient] = useState<ClientDisplay | null>(null)
  const [noteText, setNoteText] = useState('')
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleClient, setScheduleClient] = useState<ClientDisplay | null>(null)
  const pageSize = isMobile ? 6 : 8

  // ─── Role-based permission helpers ─────────────────────────────────────────
  const canCreate = (() => {
    if (!user) return false
    if (user.role === 'solo_lectura' || user.role === 'atencion_cliente') return false
    return true
  })()

  // Duplicate check state (for create dialog auto-search)
  const [duplicateCheck, setDuplicateCheck] = useState<{ checking: boolean; found: DniSearchResult | null }>({ checking: false, found: null })
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // DNI Search state (for separate search dialog)
  const [dniSearch, setDniSearch] = useState('')
  const [dniResults, setDniResults] = useState<DniSearchResult[]>([])
  const [dniLoading, setDniLoading] = useState(false)
  const [dniSearchOpen, setDniSearchOpen] = useState(false)

  const handleDniSearch = async () => {
    if (!dniSearch || dniSearch.length < 3) return
    try {
      setDniLoading(true)
      const res = await api.searchByDni(dniSearch)
      setDniResults(res.data)
      setDniSearchOpen(true)
    } catch (err: any) {
      toast({ title: 'Error en búsqueda', description: err.message, variant: 'destructive' })
    } finally {
      setDniLoading(false)
    }
  }

  // Debounced duplicate check for the create dialog's document number field
  const handleDocumentNumberChange = useCallback((value: string) => {
    setNewClient((prev) => ({ ...prev, documentNumber: value }))
    // Clear previous timer
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    // If value is too short, clear check
    if (!value || value.length < 3) {
      setDuplicateCheck({ checking: false, found: null })
      return
    }
    // Set checking state and debounce the search
    setDuplicateCheck({ checking: true, found: null })
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.searchClientByDocument(value)
        if (res.data && res.data.length > 0) {
          setDuplicateCheck({ checking: false, found: res.data[0] })
        } else {
          setDuplicateCheck({ checking: false, found: null })
        }
      } catch {
        setDuplicateCheck({ checking: false, found: null })
      }
    }, 500)
  }, [])

  // Reset duplicate check when dialog closes
  const handleCreateDialogChange = useCallback((open: boolean) => {
    setCreateOpen(open)
    if (!open) {
      setDuplicateCheck({ checking: false, found: null })
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await api.getClients({ page: '1', limit: '50' })
        if (!cancelled) setClients(res.data.map(mapApiClient))
      } catch {
        if (!cancelled) setClients([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token])

  const filtered = clients.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.lastName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      (c.documentNumber || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(0, page * pageSize)
  const hasMore = page * pageSize < filtered.length

  const handleLoadMore = useCallback(() => {
    setPageNum((p) => p + 1)
  }, [])

  const handleCreate = async () => {
    if (!newClient.name.trim() || !newClient.email.trim()) {
      toast({ title: 'Error', description: 'Nombre y email son obligatorios', variant: 'destructive' })
      return
    }
    try {
      const result = await api.createClient({
        name: newClient.name,
        lastName: newClient.lastName || undefined,
        documentType: newClient.documentType,
        documentNumber: newClient.documentNumber || undefined,
        email: newClient.email,
        phone: newClient.phone || undefined,
      })
      const client: ClientDisplay = {
        id: result.data.id,
        name: result.data.name,
        lastName: result.data.lastName,
        documentType: result.data.documentType || newClient.documentType,
        documentNumber: result.data.documentNumber,
        email: result.data.email,
        phone: result.data.phone,
        status: result.data.status || 'prospecto',
        ownerAgentId: result.data.ownerAgentId,
        agentName: result.data.ownerAgent ? `${result.data.ownerAgent.name} ${result.data.ownerAgent.lastName}` : '',
        tags: result.data.tags ? result.data.tags.split(',').filter(Boolean) : [],
        rgpdConsent: result.data.rgpdConsent,
        loyaltyScore: result.data.loyaltyScore?.score ?? 0,
        isAtRisk: result.data.loyaltyScore?.isAtRisk ?? false,
        createdAt: result.data.createdAt,
        updatedAt: result.data.updatedAt,
      }
      setClients((prev) => [client, ...prev])
      setCreateOpen(false)
      setNewClient({ name: '', lastName: '', documentType: 'DNI', documentNumber: '', email: '', phone: '' })
      toast({ title: 'Cliente creado', description: `${client.name} ${client.lastName} añadido correctamente` })
    } catch (err: any) {
      toast({ title: 'Error al crear cliente', description: err.message, variant: 'destructive' })
    }
  }

  const handleRowClick = (clientId: string) => {
    setSelectedId(clientId)
    setPage('client-detail')
  }

  const handleSchedule = (client: ClientDisplay) => {
    setScheduleClient(client)
    setScheduleOpen(true)
  }

  const handleAddNote = (client: ClientDisplay) => {
    setNoteClient(client)
    setNoteText('')
    setNoteOpen(true)
  }

  const handleSaveNote = () => {
    setNoteOpen(false)
    toast({ title: 'Nota guardada', description: `Nota añadida para ${noteClient?.name} ${noteClient?.lastName}` })
    setNoteText('')
  }

  const handleSaveSchedule = () => {
    setScheduleOpen(false)
    toast({ title: 'Cita programada', description: `Cita para ${scheduleClient?.name} ${scheduleClient?.lastName}` })
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPageNum(1)
  }

  // ─── Loading State ──────────────────────────────────────────────────────────
  if (loading) {
    if (isMobile) {
      return (
        <div className="space-y-4">
          {/* Sticky search skeleton */}
          <div className="sticky top-0 z-10 -mx-3 px-3 pt-1 pb-3 bg-gray-50">
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <MobileSkeletonCard key={i} />
          ))}
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-44" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">DNI</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Corredor/Agente</TableHead>
                  <TableHead className="hidden md:table-cell">Etiquetas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <DesktopSkeletonRow key={i} />
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Mobile View ────────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Sticky Search */}
        <div className="sticky top-0 z-10 -mx-3 px-3 pt-1 pb-3 bg-gray-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, DNI, email..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPageNum(1) }}
            />
          </div>

          {/* DNI Search Button - opens create dialog for auto-search */}
          <div className="mt-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full h-10 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setCreateOpen(true)}
            >
              <FileSearch className="h-4 w-4 mr-1" />
              Buscar por DNI/NIE
            </Button>
          </div>

          {/* Status filter pills */}
          <div className="flex gap-1.5 mt-2 overflow-x-auto scrollbar-none">
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors min-h-[32px] ${
                  statusFilter === opt.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
                onClick={() => { setStatusFilter(opt.value); setPageNum(1) }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Client count */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs text-gray-500">{filtered.length} clientes</p>
          {canCreate && (
          <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" /> Nuevo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Cliente</DialogTitle>
                <DialogDescription>Añade un nuevo cliente a la base de datos</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={newClient.lastName} onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-2">
                    <Label>Tipo Doc.</Label>
                    <Select value={newClient.documentType} onValueChange={(v) => setNewClient({ ...newClient, documentType: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DNI">DNI</SelectItem>
                        <SelectItem value="NIE">NIE</SelectItem>
                        <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Nº Documento</Label>
                    <div className="relative">
                      <Input value={newClient.documentNumber} onChange={(e) => handleDocumentNumberChange(e.target.value)} placeholder={newClient.documentType === 'DNI' ? '12345678A' : newClient.documentType === 'NIE' ? 'X1234567A' : 'AB1234567'} />
                      {duplicateCheck.checking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Duplicate warning card */}
                {duplicateCheck.found && (
                  <Card className="border-amber-300 bg-amber-50">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-amber-700">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <p className="text-sm font-medium">Este cliente ya existe</p>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                        <div><span className="text-amber-600">Nombre</span><p className="text-gray-900 font-medium">{duplicateCheck.found.name} {duplicateCheck.found.lastName}</p></div>
                        <div><span className="text-amber-600">Documento</span><p className="text-gray-900 font-medium">{duplicateCheck.found.documentType || 'DNI'}: {duplicateCheck.found.documentNumber}</p></div>
                        {duplicateCheck.found.phone && <div><span className="text-amber-600">Teléfono</span><p className="text-gray-900">{duplicateCheck.found.phone}</p></div>}
                        <div><span className="text-amber-600">Pólizas</span><p className="text-gray-900 font-medium">{duplicateCheck.found._count.policies}</p></div>
                      </div>
                      {duplicateCheck.found.ownerAgent && (
                        <p className="text-xs text-amber-700 font-medium">
                          Corredor responsable: {duplicateCheck.found.ownerAgent.name} {duplicateCheck.found.ownerAgent.lastName}
                        </p>
                      )}
                      <p className="text-xs text-amber-800 font-medium">
                        Este cliente ya existe y lo gestiona {duplicateCheck.found.ownerAgent ? `${duplicateCheck.found.ownerAgent.name} ${duplicateCheck.found.ownerAgent.lastName}` : 'otro agente'}
                      </p>
                      {user?.role === 'corredor' && duplicateCheck.found.belongsToCurrentUser === false && (
                        <Badge className="bg-gray-200 text-gray-600 border-0 text-[10px]">
                          <Lock className="h-3 w-3 mr-0.5" /> Solo lectura
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => { setCreateOpen(false); setSelectedId(duplicateCheck.found!.id); setPage('client-detail') }}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Ver ficha del cliente
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={duplicateCheck.found !== null || duplicateCheck.checking} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </div>

        {/* Card list */}
        {filtered.length === 0 ? (
          <EmptyState onClear={clearFilters} />
        ) : (
          <>
            <div className="space-y-3">
              {paginated.map((client) => (
                <MobileClientCard
                  key={client.id}
                  client={client}
                  onRowClick={handleRowClick}
                  onSchedule={handleSchedule}
                  onAddNote={handleAddNote}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-2 pb-4">
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="w-full max-w-xs"
                >
                  <ChevronDown className="mr-2 h-4 w-4" />
                  Cargar más ({filtered.length - page * pageSize} restantes)
                </Button>
              </div>
            )}
          </>
        )}

        {/* DNI Search Results Dialog */}
        <Dialog open={dniSearchOpen} onOpenChange={setDniSearchOpen}>
          <DialogContent className="max-w-lg max-h-[85vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-emerald-600" />
                Búsqueda DNI/NIE: {dniSearch}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              {dniResults.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No encontramos ningún asegurado con esos datos</p>
                </div>
              ) : (
                dniResults.map((result) => (
                  <Card key={result.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      {/* Client header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900">{result.name} {result.lastName}</p>
                          {result.documentNumber && <p className="text-xs text-gray-500">{result.documentType || 'DNI'}: {result.documentNumber}</p>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          {result.canEdit ? (
                            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                              <UserCheck className="h-3 w-3 mr-0.5" /> Editable
                            </Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">
                              <Lock className="h-3 w-3 mr-0.5" /> Solo lectura
                            </Badge>
                          )}
                          <Badge className={`${statusColors[result.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                            {result.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Client details */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-2">
                        {result.email && <div><span className="text-gray-400">Email</span><p className="text-gray-700 truncate">{result.email}</p></div>}
                        {result.phone && <div><span className="text-gray-400">Teléfono</span><p className="text-gray-700">{result.phone}</p></div>}
                        {result.mobile && <div><span className="text-gray-400">Móvil</span><p className="text-gray-700">{result.mobile}</p></div>}
                        <div>
                          <span className="text-gray-400">Pólizas</span>
                          <p className="text-gray-700 font-medium">{result._count.policies}</p>
                        </div>
                      </div>

                      {/* Assigned agent */}
                      {result.ownerAgent && (
                        <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-md mb-2">
                          <Shield className="h-3.5 w-3.5 text-teal-600" />
                          <div className="min-w-0">
                            <p className="text-xs text-teal-700 font-medium">Corredor/Agente: {result.ownerAgent.name} {result.ownerAgent.lastName}</p>
                            {result.ownerAgent.position && <p className="text-[10px] text-teal-600">{result.ownerAgent.position}</p>}
                          </div>
                          {result.belongsToCurrentUser && (
                            <Badge className="bg-teal-200 text-teal-800 border-0 text-[9px] ml-auto shrink-0">Tuyo</Badge>
                          )}
                        </div>
                      )}

                      {/* Policies list */}
                      {result.policies.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Pólizas ({result.policies.length})</p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {result.policies.map((policy) => (
                              <div key={policy.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-900">{policy.policyNumber}</p>
                                  <p className="text-gray-500 truncate">{policy.productName}</p>
                                </div>
                                <div className="text-right shrink-0 ml-2">
                                  <Badge className={`${statusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-[9px]`}>
                                    {policy.status}
                                  </Badge>
                                  <p className="text-[10px] text-gray-400">€{policy.premium.toLocaleString()}</p>
                                  {policy.soldByAgent && (
                                    <p className="text-[9px] text-teal-600">{policy.soldByAgent.name} {policy.soldByAgent.lastName}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Leads list */}
                      {result.leads.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs font-semibold text-gray-600 mb-1">Leads ({result.leads.length})</p>
                          <div className="flex flex-wrap gap-1">
                            {result.leads.map((lead) => (
                              <Badge key={lead.id} variant="outline" className="text-[10px]">
                                {lead.product || 'Sin producto'} - {lead.status}
                                {lead.agent && ` (${lead.agent.name} ${lead.agent.lastName})`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Note Dialog */}
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Nota</DialogTitle>
              <DialogDescription>
                Nota para {noteClient?.name} {noteClient?.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nota</Label>
              <textarea
                className="w-full min-h-[100px] rounded-md border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Escribe una nota..."
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveNote} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Schedule Appointment Dialog */}
        <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Programar Cita</DialogTitle>
              <DialogDescription>
                Cita para {scheduleClient?.name} {scheduleClient?.lastName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input type="time" />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select defaultValue="llamada">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llamada">Llamada</SelectItem>
                    <SelectItem value="videollamada">Videollamada</SelectItem>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="visita">Visita</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveSchedule} className="bg-emerald-600 hover:bg-emerald-700 text-white">Programar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ─── Desktop / Tablet View ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-sm text-gray-500">{filtered.length} clientes encontrados</p>
        </div>
        {canCreate && (
        <Dialog open={createOpen} onOpenChange={handleCreateDialogChange}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Cliente</DialogTitle>
              <DialogDescription>Añade un nuevo cliente a la base de datos</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input value={newClient.lastName} onChange={(e) => setNewClient({ ...newClient, lastName: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label>Tipo Doc.</Label>
                  <Select value={newClient.documentType} onValueChange={(v) => setNewClient({ ...newClient, documentType: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DNI">DNI</SelectItem>
                      <SelectItem value="NIE">NIE</SelectItem>
                      <SelectItem value="PASSPORT">Pasaporte</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Nº Documento</Label>
                  <div className="relative">
                    <Input value={newClient.documentNumber} onChange={(e) => handleDocumentNumberChange(e.target.value)} placeholder={newClient.documentType === 'DNI' ? '12345678A' : newClient.documentType === 'NIE' ? 'X1234567A' : 'AB1234567'} />
                    {duplicateCheck.checking && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />}
                  </div>
                </div>
              </div>

              {/* Duplicate warning card */}
              {duplicateCheck.found && (
                <Card className="border-amber-300 bg-amber-50">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <p className="text-sm font-medium">Este cliente ya existe</p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                      <div><span className="text-amber-600">Nombre</span><p className="text-gray-900 font-medium">{duplicateCheck.found.name} {duplicateCheck.found.lastName}</p></div>
                      <div><span className="text-amber-600">Documento</span><p className="text-gray-900 font-medium">{duplicateCheck.found.documentType || 'DNI'}: {duplicateCheck.found.documentNumber}</p></div>
                      {duplicateCheck.found.phone && <div><span className="text-amber-600">Teléfono</span><p className="text-gray-900">{duplicateCheck.found.phone}</p></div>}
                      <div><span className="text-amber-600">Pólizas</span><p className="text-gray-900 font-medium">{duplicateCheck.found._count.policies}</p></div>
                    </div>
                    {duplicateCheck.found.ownerAgent && (
                      <p className="text-xs text-amber-700 font-medium">
                        Corredor responsable: {duplicateCheck.found.ownerAgent.name} {duplicateCheck.found.ownerAgent.lastName}
                      </p>
                    )}
                    <p className="text-xs text-amber-800 font-medium">
                      Este cliente ya existe y lo gestiona {duplicateCheck.found.ownerAgent ? `${duplicateCheck.found.ownerAgent.name} ${duplicateCheck.found.ownerAgent.lastName}` : 'otro agente'}
                    </p>
                    {user?.role === 'corredor' && duplicateCheck.found.belongsToCurrentUser === false && (
                      <Badge className="bg-gray-200 text-gray-600 border-0 text-[10px]">
                        <Lock className="h-3 w-3 mr-0.5" /> Solo lectura
                      </Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-100"
                      onClick={() => { setCreateOpen(false); setSelectedId(duplicateCheck.found!.id); setPage('client-detail') }}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1" />
                      Ver ficha del cliente
                    </Button>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newClient.email} onChange={(e) => setNewClient({ ...newClient, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={newClient.phone} onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={duplicateCheck.found !== null || duplicateCheck.checking} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, DNI, email..."
                className="pl-9"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPageNum(1) }}
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPageNum(1) }}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activo">Activo</SelectItem>
                <SelectItem value="inactivo">Inactivo</SelectItem>
                <SelectItem value="prospecto">Prospecto</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              onClick={() => setCreateOpen(true)}
            >
              <FileSearch className="h-4 w-4 mr-1" />
              Buscar por DNI/NIE
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead className="hidden md:table-cell">DNI</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden lg:table-cell">Corredor/Agente</TableHead>
                  <TableHead className="hidden md:table-cell">Etiquetas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((client) => (
                  <TableRow
                    key={client.id}
                    className="cursor-pointer hover:bg-emerald-50/50"
                    onClick={() => handleRowClick(client.id)}
                  >
                    <TableCell className="font-medium">
                      {client.name} {client.lastName}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">{client.documentNumber}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">{client.email}</TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500">{client.phone}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[client.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                        {client.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500">{client.agentName}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex gap-1 flex-wrap">
                        {client.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Mostrando {Math.min(page * pageSize, filtered.length)} de {filtered.length}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPageNum(page - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPageNum(page + 1)}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* DNI Search Results Dialog (Desktop) */}
      <Dialog open={dniSearchOpen} onOpenChange={setDniSearchOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-emerald-600" />
              Búsqueda DNI/NIE: {dniSearch}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
            {dniResults.length === 0 ? (
              <div className="py-8 text-center">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No encontramos ningún asegurado con esos datos</p>
              </div>
            ) : (
              dniResults.map((result) => (
                <Card key={result.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* Client header */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">{result.name} {result.lastName}</p>
                        {result.documentNumber && <p className="text-xs text-gray-500">{result.documentType || 'DNI'}: {result.documentNumber}</p>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {result.canEdit ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px]">
                            <UserCheck className="h-3 w-3 mr-0.5" /> Editable
                          </Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">
                            <Lock className="h-3 w-3 mr-0.5" /> Solo lectura
                          </Badge>
                        )}
                        <Badge className={`${statusColors[result.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                          {result.status}
                        </Badge>
                      </div>
                    </div>

                    {/* Client details */}
                    <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs mb-2">
                      {result.email && <div><span className="text-gray-400">Email</span><p className="text-gray-700 truncate">{result.email}</p></div>}
                      {result.phone && <div><span className="text-gray-400">Teléfono</span><p className="text-gray-700">{result.phone}</p></div>}
                      {result.mobile && <div><span className="text-gray-400">Móvil</span><p className="text-gray-700">{result.mobile}</p></div>}
                      <div>
                        <span className="text-gray-400">Pólizas</span>
                        <p className="text-gray-700 font-medium">{result._count.policies}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Oportunidades</span>
                        <p className="text-gray-700 font-medium">{result._count.opportunities}</p>
                      </div>
                    </div>

                    {/* Assigned agent */}
                    {result.ownerAgent && (
                      <div className="flex items-center gap-2 p-2 bg-teal-50 rounded-md mb-2">
                        <Shield className="h-3.5 w-3.5 text-teal-600" />
                        <div className="min-w-0">
                          <p className="text-xs text-teal-700 font-medium">Corredor/Agente: {result.ownerAgent.name} {result.ownerAgent.lastName}</p>
                          {result.ownerAgent.position && <p className="text-[10px] text-teal-600">{result.ownerAgent.position}</p>}
                        </div>
                        {result.belongsToCurrentUser && (
                          <Badge className="bg-teal-200 text-teal-800 border-0 text-[9px] ml-auto shrink-0">Tuyo</Badge>
                        )}
                      </div>
                    )}

                    {/* Policies list */}
                    {result.policies.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Pólizas ({result.policies.length})</p>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {result.policies.map((policy) => (
                            <div key={policy.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
                              <div className="min-w-0">
                                <p className="font-medium text-gray-900">{policy.policyNumber}</p>
                                <p className="text-gray-500 truncate">{policy.productName}</p>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <Badge className={`${statusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-[9px]`}>
                                  {policy.status}
                                </Badge>
                                <p className="text-[10px] text-gray-400">€{policy.premium.toLocaleString()}</p>
                                {policy.soldByAgent && (
                                  <p className="text-[9px] text-teal-600">{policy.soldByAgent.name} {policy.soldByAgent.lastName}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Leads list */}
                    {result.leads.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold text-gray-600 mb-1">Leads ({result.leads.length})</p>
                        <div className="flex flex-wrap gap-1">
                          {result.leads.map((lead) => (
                            <Badge key={lead.id} variant="outline" className="text-[10px]">
                              {lead.product || 'Sin producto'} - {lead.status}
                              {lead.agent && ` (${lead.agent.name} ${lead.agent.lastName})`}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
