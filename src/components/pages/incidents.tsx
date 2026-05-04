'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type Incident } from '@/lib/api'
import { Plus, Search, AlertTriangle, User, FileText } from 'lucide-react'

// Display type
interface IncidentDisplay {
  id: string
  title: string
  clientId?: string
  clientName: string
  policyId?: string
  policyNumber: string
  priority: string
  status: string
  assignedTo?: string
  responsibleName: string
  description: string
  createdAt: string
  updatedAt: string
}

function mapApiIncident(i: Incident): IncidentDisplay {
  return {
    id: i.id,
    title: i.title,
    clientId: i.clientId,
    clientName: i.client ? `${i.client.name} ${i.client.lastName}` : '',
    policyId: i.policyId,
    policyNumber: i.policy?.policyNumber || '',
    priority: i.priority,
    status: i.status,
    assignedTo: i.assignedTo,
    responsibleName: i.assignedTo || '',
    description: i.description,
    createdAt: i.createdAt,
    updatedAt: i.updatedAt,
  }
}



const priorityColors: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta: 'bg-orange-100 text-orange-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-emerald-100 text-emerald-700',
}

const statusColors: Record<string, string> = {
  abierta: 'bg-blue-100 text-blue-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  resuelta: 'bg-emerald-100 text-emerald-700',
  cerrada: 'bg-gray-100 text-gray-700',
}

const statusLabels: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En Progreso',
  resuelta: 'Resuelta',
  cerrada: 'Cerrada',
}

const filterPills = [
  { value: 'all', label: 'Todas' },
  { value: 'abierta', label: 'Abierta' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'resuelta', label: 'Resuelta' },
]

export default function IncidentsPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [incidents, setIncidents] = useState<IncidentDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newInc, setNewInc] = useState({ title: '', clientName: '', policyNumber: '', priority: 'media' as Incident['priority'], description: '' })

  useEffect(() => {
    async function fetchIncidents() {
      try {
        const res = await api.getIncidents({ page: '1', limit: '50' })
        setIncidents(res.data.map(mapApiIncident))
      } catch {
        setIncidents([])
      } finally {
        setLoading(false)
      }
    }
    fetchIncidents()
  }, [token])

  const filtered = incidents.filter((i) => {
    const matchesSearch = i.title.toLowerCase().includes(search.toLowerCase()) || i.clientName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || i.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreate = () => {
    const inc: IncidentDisplay = {
      id: Date.now().toString(),
      title: newInc.title,
      clientId: '',
      clientName: newInc.clientName,
      policyId: '',
      policyNumber: newInc.policyNumber,
      priority: newInc.priority,
      status: 'abierta',
      responsibleName: 'María López',
      description: newInc.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setIncidents((prev) => [inc, ...prev])
    setCreateOpen(false)
    setNewInc({ title: '', clientName: '', policyNumber: '', priority: 'media', description: '' })
    toast({ title: 'Incidencia creada' })
  }

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-40" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        {isMobile ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><Skeleton className="h-20 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-0"><div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div></CardContent></Card>
        )}
      </div>
    )
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Incidencias</h1>
            <p className="text-xs md:text-sm text-gray-500">{filtered.length} incidencias</p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-10"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="text-sm">Nueva</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar incidencias..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {filterPills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setStatusFilter(pill.value)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[32px] ${
                statusFilter === pill.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {pill.label}
              {pill.value !== 'all' && (
                <span className={`ml-1 text-[10px] ${
                  statusFilter === pill.value ? 'text-emerald-200' : 'text-gray-400'
                }`}>
                  ({incidents.filter((inc) => inc.status === pill.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Incident Cards */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Todavía no hay incidencias registradas.</p>
                <p className="text-xs text-gray-400">Crea una nueva incidencia si es necesario</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((inc) => (
              <Card key={inc.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium text-gray-900 leading-tight">{inc.title}</p>
                    <Badge className={`${priorityColors[inc.priority] || 'bg-gray-100 text-gray-700'} border-0 text-[10px] shrink-0`}>
                      {inc.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Badge className={`${statusColors[inc.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                      {statusLabels[inc.status] || inc.status.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {inc.clientName}
                    </span>
                    {inc.policyNumber && (
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {inc.policyNumber}
                      </span>
                    )}
                    {inc.responsibleName && (
                      <span>→ {inc.responsibleName}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Mobile Create Sheet */}
        <Sheet open={createOpen} onOpenChange={setCreateOpen}>
          <SheetContent side="bottom" className="h-[85vh]">
            <SheetHeader>
              <SheetTitle>Nueva Incidencia</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <Label className="text-sm">Título</Label>
                <Input className="h-11" value={newInc.title} onChange={(e) => setNewInc({ ...newInc, title: e.target.value })} placeholder="Título de la incidencia" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Cliente</Label>
                  <Input className="h-11" value={newInc.clientName} onChange={(e) => setNewInc({ ...newInc, clientName: e.target.value })} placeholder="Cliente" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Nº Póliza</Label>
                  <Input className="h-11" value={newInc.policyNumber} onChange={(e) => setNewInc({ ...newInc, policyNumber: e.target.value })} placeholder="Póliza" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Prioridad</Label>
                <Select value={newInc.priority} onValueChange={(v) => setNewInc({ ...newInc, priority: v as Incident['priority'] })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Descripción</Label>
                <Textarea value={newInc.description} onChange={(e) => setNewInc({ ...newInc, description: e.target.value })} placeholder="Describe la incidencia" rows={3} />
              </div>
            </div>
            <SheetFooter className="flex-row gap-3 p-4 border-t">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Incidencias</h1>
          <p className="text-sm text-gray-500">{filtered.length} incidencias</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Incidencia
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Incidencia</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Título</Label><Input value={newInc.title} onChange={(e) => setNewInc({ ...newInc, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Cliente</Label><Input value={newInc.clientName} onChange={(e) => setNewInc({ ...newInc, clientName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Nº Póliza</Label><Input value={newInc.policyNumber} onChange={(e) => setNewInc({ ...newInc, policyNumber: e.target.value })} /></div>
              </div>
              <div className="space-y-2">
                <Label>Prioridad</Label>
                <Select value={newInc.priority} onValueChange={(v) => setNewInc({ ...newInc, priority: v as Incident['priority'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="baja">Baja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea value={newInc.description} onChange={(e) => setNewInc({ ...newInc, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar incidencias..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="abierta">Abierta</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="resuelta">Resuelta</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Póliza</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden md:table-cell">Responsable</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Todavía no hay incidencias registradas.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((i) => (
                  <TableRow key={i.id} className="hover:bg-emerald-50/50 cursor-pointer">
                    <TableCell className="font-medium">{i.title}</TableCell>
                    <TableCell>{i.clientName}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">{i.policyNumber}</TableCell>
                    <TableCell>
                      <Badge className={`${priorityColors[i.priority] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{i.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[i.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{statusLabels[i.status] || i.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">{i.responsibleName}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
