'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type Opportunity } from '@/lib/api'
import { Plus, Search, TrendingUp, ArrowRight, Phone, Calendar, User } from 'lucide-react'

// Display type
interface OpportunityDisplay {
  id: string
  clientId: string
  clientName: string
  product: string
  premium: number
  probability: number
  status: string
  agentId?: string
  agentName: string
  closeDate?: string
  createdAt: string
  updatedAt: string
}

function mapApiOpportunity(o: Opportunity): OpportunityDisplay {
  return {
    id: o.id,
    clientId: o.clientId,
    clientName: o.client ? `${o.client.name} ${o.client.lastName}` : '',
    product: o.product || '',
    premium: o.estimatedPremium,
    probability: o.probability,
    status: o.status,
    agentId: o.agentId,
    agentName: o.agent ? `${o.agent.name} ${o.agent.lastName}` : '',
    closeDate: o.closingDate,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  }
}



const statusColors: Record<string, string> = {
  abierta: 'bg-blue-100 text-blue-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  propuesta: 'bg-purple-100 text-purple-700',
  negociacion: 'bg-orange-100 text-orange-700',
  ganada: 'bg-emerald-100 text-emerald-700',
  perdida: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  abierta: 'Abierta',
  en_progreso: 'En Progreso',
  propuesta: 'Propuesta',
  negociacion: 'Negociación',
  ganada: 'Ganada',
  perdida: 'Perdida',
}

const stageOrder = ['abierta', 'en_progreso', 'propuesta', 'negociacion', 'ganada', 'perdida']

const stageIcons: Record<string, string> = {
  abierta: '🔵',
  en_progreso: '🟡',
  propuesta: '🟣',
  negociacion: '🟠',
  ganada: '🟢',
  perdida: '🔴',
}

function getProbabilityColor(probability: number): string {
  if (probability >= 80) return 'text-emerald-600 bg-emerald-50'
  if (probability >= 50) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function getProbabilityBarColor(probability: number): string {
  if (probability >= 80) return 'bg-emerald-500'
  if (probability >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getNextStage(currentStatus: string): string | null {
  const idx = stageOrder.indexOf(currentStatus)
  if (idx < 0 || idx >= stageOrder.length - 2) return null // -2 because perdida is last and ganada is second-to-last
  if (currentStatus === 'ganada' || currentStatus === 'perdida') return null
  return stageOrder[idx + 1]
}

export default function OpportunitiesPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [opportunities, setOpportunities] = useState<OpportunityDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newOpp, setNewOpp] = useState({ clientName: '', product: '', premium: '', probability: '50', closeDate: '' })

  useEffect(() => {
    async function fetchOpportunities() {
      try {
        const res = await api.getOpportunities({ page: '1', limit: '50' })
        setOpportunities(res.data.map(mapApiOpportunity))
      } catch {
        setOpportunities([])
      } finally {
        setLoading(false)
      }
    }
    fetchOpportunities()
  }, [token])

  const filtered = opportunities.filter((o) => {
    const matchesSearch = o.clientName.toLowerCase().includes(search.toLowerCase()) || o.product.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Count by stage for mobile tabs
  const stageCounts = stageOrder.reduce((acc, stage) => {
    acc[stage] = opportunities.filter((o) => o.status === stage).length
    return acc
  }, {} as Record<string, number>)

  const handleCreate = () => {
    const opp: OpportunityDisplay = {
      id: Date.now().toString(),
      clientId: '',
      clientName: newOpp.clientName,
      product: newOpp.product,
      premium: Number(newOpp.premium),
      probability: Number(newOpp.probability),
      status: 'abierta',
      agentId: '1',
      agentName: 'María López',
      closeDate: newOpp.closeDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setOpportunities((prev) => [opp, ...prev])
    setCreateOpen(false)
    setNewOpp({ clientName: '', product: '', premium: '', probability: '50', closeDate: '' })
    toast({ title: 'Oportunidad creada' })
  }

  const handleAdvanceStage = (id: string) => {
    const opp = opportunities.find((o) => o.id === id)
    if (!opp) return
    const nextStage = getNextStage(opp.status)
    if (!nextStage) return
    setOpportunities((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: nextStage } : o))
    )
    toast({ title: `Avanzada a ${statusLabels[nextStage]}` })
  }

  const handleQuickAction = (action: string, opp: OpportunityDisplay) => {
    toast({ title: `${action} - ${opp.clientName}` })
  }

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        {isMobile ? (
          <>
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-24 shrink-0 rounded-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                      <Skeleton className="h-8 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-4">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // ===== MOBILE VIEW =====
  if (isMobile) {
    const selectedStageOpps = filtered.filter((o) =>
      statusFilter === 'all' ? true : o.status === statusFilter
    )

    return (
      <div className="space-y-4 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Oportunidades</h1>
            <p className="text-xs text-gray-500">{opportunities.length} oportunidades</p>
          </div>
          <Drawer open={createOpen} onOpenChange={setCreateOpen}>
            <Button
              size="icon"
              className="h-10 w-10 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-5 w-5" />
            </Button>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Nueva Oportunidad</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 space-y-4 pb-4">
                <div className="space-y-2"><Label>Cliente</Label><Input value={newOpp.clientName} onChange={(e) => setNewOpp({ ...newOpp, clientName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Producto</Label><Input value={newOpp.product} onChange={(e) => setNewOpp({ ...newOpp, product: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Prima</Label><Input type="number" value={newOpp.premium} onChange={(e) => setNewOpp({ ...newOpp, premium: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Probabilidad (%)</Label><Input type="number" value={newOpp.probability} onChange={(e) => setNewOpp({ ...newOpp, probability: e.target.value })} /></div>
                </div>
                <div className="space-y-2"><Label>Fecha de Cierre</Label><Input type="date" value={newOpp.closeDate} onChange={(e) => setNewOpp({ ...newOpp, closeDate: e.target.value })} /></div>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DrawerClose>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear Oportunidad</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar oportunidades..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Stage Selector Pills */}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => setStatusFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 ${
              statusFilter === 'all'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({opportunities.length})
          </button>
          {stageOrder.map((stage) => (
            <button
              key={stage}
              onClick={() => setStatusFilter(stage)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1.5 ${
                statusFilter === stage
                  ? `${statusColors[stage]} ring-2 ring-offset-1 ring-current`
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {stageIcons[stage]} {statusLabels[stage]} ({stageCounts[stage]})
            </button>
          ))}
        </div>

        {/* Opportunity Cards */}
        {selectedStageOpps.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Todavía no hay oportunidades registradas.</p>
              <p className="text-xs text-gray-400 mt-1">
                {statusFilter !== 'all'
                  ? `Sin oportunidades en etapa "${statusLabels[statusFilter]}"`
                  : 'Crea una nueva oportunidad con el botón +'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {selectedStageOpps.map((o) => {
              const nextStage = getNextStage(o.status)
              return (
                <Card key={o.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {/* Top: Client & Status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{o.clientName}</p>
                        <p className="text-xs text-gray-500">{o.product}</p>
                      </div>
                      <Badge className={`${statusColors[o.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px] shrink-0`}>
                        {statusLabels[o.status] || o.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
                      <div>
                        <span className="text-gray-400">Prima</span>
                        <p className="font-semibold text-gray-900">€{o.premium.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Fecha Cierre</span>
                        <p className="text-gray-700">{o.closeDate || 'Sin fecha'}</p>
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-400">Probabilidad</span>
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${getProbabilityColor(o.probability)}`}>
                            {o.probability}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${getProbabilityBarColor(o.probability)}`}
                            style={{ width: `${o.probability}%` }}
                          />
                        </div>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-400">Agente</span>
                        <div className="flex items-center gap-1 text-gray-700">
                          <User className="h-3 w-3" />
                          <span className="font-medium">{o.agentName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      {nextStage && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs flex-1"
                          onClick={() => handleAdvanceStage(o.id)}
                        >
                          <ArrowRight className="h-3 w-3 mr-1" /> Avanzar a {statusLabels[nextStage]}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs flex-1"
                        onClick={() => handleQuickAction('Contactar', o)}
                      >
                        <Phone className="h-3 w-3 mr-1" /> Contactar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs flex-1"
                        onClick={() => handleQuickAction('Reunión', o)}
                      >
                        <Calendar className="h-3 w-3 mr-1" /> Reunión
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ===== DESKTOP/TABLET VIEW =====
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Oportunidades</h1>
          <p className="text-sm text-gray-500">{filtered.length} oportunidades</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nueva Oportunidad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Oportunidad</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Cliente</Label><Input value={newOpp.clientName} onChange={(e) => setNewOpp({ ...newOpp, clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Producto</Label><Input value={newOpp.product} onChange={(e) => setNewOpp({ ...newOpp, product: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prima</Label><Input type="number" value={newOpp.premium} onChange={(e) => setNewOpp({ ...newOpp, premium: e.target.value })} /></div>
                <div className="space-y-2"><Label>Probabilidad (%)</Label><Input type="number" value={newOpp.probability} onChange={(e) => setNewOpp({ ...newOpp, probability: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Fecha de Cierre</Label><Input type="date" value={newOpp.closeDate} onChange={(e) => setNewOpp({ ...newOpp, closeDate: e.target.value })} /></div>
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
              <Input placeholder="Buscar oportunidades..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="abierta">Abierta</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="propuesta">Propuesta</SelectItem>
                <SelectItem value="negociacion">Negociación</SelectItem>
                <SelectItem value="ganada">Ganada</SelectItem>
                <SelectItem value="perdida">Perdida</SelectItem>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead className="hidden sm:table-cell">Prima</TableHead>
                <TableHead className="hidden md:table-cell">Prob.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden lg:table-cell">Agente</TableHead>
                <TableHead className="hidden md:table-cell">Fecha Cierre</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Todavía no hay oportunidades registradas.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id} className="hover:bg-emerald-50/50 cursor-pointer">
                    <TableCell className="font-medium">{o.clientName}</TableCell>
                    <TableCell>{o.product}</TableCell>
                    <TableCell className="hidden sm:table-cell">€{o.premium.toLocaleString()}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-10 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${getProbabilityBarColor(o.probability)}`}
                            style={{ width: `${o.probability}%` }}
                          />
                        </div>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getProbabilityColor(o.probability)}`}>
                          {o.probability}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[o.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{statusLabels[o.status] || o.status.replace('_', ' ')}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">{o.agentName}</TableCell>
                    <TableCell className="hidden md:table-cell">{o.closeDate || '-'}</TableCell>
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
