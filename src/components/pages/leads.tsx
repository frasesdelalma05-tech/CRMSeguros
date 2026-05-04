'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type Lead } from '@/lib/api'
import { Plus, UserCircle, Phone, Calendar, ChevronRight, Inbox } from 'lucide-react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors, closestCorners } from '@dnd-kit/core'

// Display type that normalizes API data
interface LeadDisplay {
  id: string
  clientId: string
  clientName: string
  product: string
  estimatedPremium: number
  probability: number
  status: string
  agentId?: string
  agentName: string
  nextAction: string
  nextActionDate: string
  notes: string
  createdAt: string
  updatedAt: string
}

function mapApiLead(l: Lead): LeadDisplay {
  return {
    id: l.id,
    clientId: l.clientId,
    clientName: l.client ? `${l.client.name} ${l.client.lastName}` : '',
    product: l.product || '',
    estimatedPremium: l.estimatedPremium ?? 0,
    probability: l.probability,
    status: l.status,
    agentId: l.agentId,
    agentName: l.agent ? `${l.agent.name} ${l.agent.lastName}` : '',
    nextAction: l.nextAction || '',
    nextActionDate: l.nextActionDate || '',
    notes: l.notes || '',
    createdAt: l.createdAt,
    updatedAt: l.updatedAt,
  }
}



const columns = [
  { id: 'nuevo', title: 'Nuevo', color: 'bg-blue-500' },
  { id: 'contactado', title: 'Contactado', color: 'bg-cyan-500' },
  { id: 'cita_programada', title: 'Cita Programada', color: 'bg-amber-500' },
  { id: 'en_estudio', title: 'En Estudio', color: 'bg-purple-500' },
  { id: 'propuesta_enviada', title: 'Propuesta Enviada', color: 'bg-teal-500' },
  { id: 'negociacion', title: 'Negociación', color: 'bg-orange-500' },
  { id: 'ganado', title: 'Ganado', color: 'bg-emerald-500' },
  { id: 'perdido', title: 'Perdido', color: 'bg-red-500' },
] as const

function LeadCard({ lead }: { lead: LeadDisplay }) {
  const probabilityColor = lead.probability >= 70 ? 'text-emerald-600' : lead.probability >= 40 ? 'text-amber-600' : 'text-red-500'
  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing">
      <CardContent className="p-3">
        <div className="flex items-start gap-2 mb-2">
          <UserCircle className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-sm font-medium text-gray-900 leading-tight">{lead.clientName}</p>
        </div>
        <p className="text-xs text-gray-500 mb-1">{lead.product}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">€{lead.estimatedPremium.toLocaleString()}</span>
          <span className={`font-medium ${probabilityColor}`}>{lead.probability}%</span>
        </div>
        {lead.agentName && (
          <p className="text-[10px] text-gray-400 mt-1">{lead.agentName}</p>
        )}
        {lead.nextAction && (
          <p className="text-[10px] text-emerald-600 mt-1 truncate">→ {lead.nextAction}</p>
        )}
      </CardContent>
    </Card>
  )
}

// Mobile lead card with quick actions
function MobileLeadCard({ lead, onAdvanceStage, onContact, onSchedule }: {
  lead: LeadDisplay
  onAdvanceStage: () => void
  onContact: () => void
  onSchedule: () => void
}) {
  const probabilityColor = lead.probability >= 70 ? 'text-emerald-600' : lead.probability >= 40 ? 'text-amber-600' : 'text-red-500'
  const probabilityBg = lead.probability >= 70 ? 'bg-emerald-100' : lead.probability >= 40 ? 'bg-amber-100' : 'bg-red-100'

  return (
    <Card className="shadow-sm">
      <CardContent className="p-3 md:p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
            <UserCircle className="h-5 w-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-900 truncate">{lead.clientName}</p>
              <span className={`text-xs font-semibold ${probabilityColor} shrink-0`}>{lead.probability}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{lead.product}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-xs text-gray-500">€{lead.estimatedPremium.toLocaleString()}</span>
              <span className="text-gray-300">·</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${probabilityBg} ${probabilityColor}`}>
                {lead.probability >= 70 ? 'Alta' : lead.probability >= 40 ? 'Media' : 'Baja'}
              </span>
            </div>
            {lead.agentName && (
              <p className="text-[10px] text-gray-400 mt-1">Agente: {lead.agentName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={onAdvanceStage}
          >
            <ChevronRight className="h-3 w-3 mr-1" />
            Avanzar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={onContact}
          >
            <Phone className="h-3 w-3 mr-1" />
            Contactar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs"
            onClick={onSchedule}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Cita
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LeadsPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [leads, setLeads] = useState<LeadDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newLead, setNewLead] = useState({ clientName: '', product: '', estimatedPremium: '', probability: '30', agentId: '1' })
  const [activeId, setActiveId] = useState<string | null>(null)
  const [selectedStage, setSelectedStage] = useState('nuevo')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await api.getLeads({ page: '1', limit: '50' })
        setLeads(res.data.map(mapApiLead))
      } catch {
        setLeads([])
      } finally {
        setLoading(false)
      }
    }
    fetchLeads()
  }, [token])

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const leadId = active.id as string
    const newStatus = over.id as string

    const columnIds = columns.map((c) => c.id)
    let targetStatus = newStatus

    if (!columnIds.includes(newStatus as any)) {
      const targetLead = leads.find((l) => l.id === newStatus)
      if (targetLead) {
        targetStatus = targetLead.status
      }
    }

    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: targetStatus } : l))
    )
    toast({ title: 'Lead actualizado', description: `Estado cambiado a ${columns.find((c) => c.id === targetStatus)?.title}` })
  }

  const handleCreate = () => {
    const lead: LeadDisplay = {
      id: Date.now().toString(),
      clientId: '',
      clientName: newLead.clientName,
      product: newLead.product,
      estimatedPremium: Number(newLead.estimatedPremium),
      probability: Number(newLead.probability),
      status: 'nuevo',
      agentId: newLead.agentId,
      agentName: 'María López',
      nextAction: 'Primer contacto',
      nextActionDate: new Date().toISOString(),
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setLeads((prev) => [lead, ...prev])
    setCreateOpen(false)
    setNewLead({ clientName: '', product: '', estimatedPremium: '', probability: '30', agentId: '1' })
    toast({ title: 'Lead creado' })
  }

  const advanceStage = (leadId: string) => {
    const currentIdx = columns.findIndex((c) => c.id === leads.find((l) => l.id === leadId)?.status)
    if (currentIdx < columns.length - 1) {
      const nextStage = columns[currentIdx + 1]
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: nextStage.id } : l)))
      toast({ title: 'Lead avanzado', description: `Movido a ${nextStage.title}` })
    }
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  // Mobile: leads in selected stage
  const stageLeads = leads.filter((l) => l.status === selectedStage)

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        {isMobile ? (
          <>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-3"><div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-8 w-full" /></div></CardContent></Card>
              ))}
            </div>
          </>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {columns.map((col) => (
              <div key={col.id} className="min-w-[250px]">
                <Skeleton className="h-6 w-32 mb-3" />
                <div className="space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-24 rounded-lg" />
                  ))}
                </div>
              </div>
            ))}
          </div>
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
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Leads</h1>
            <p className="text-xs md:text-sm text-gray-500">{leads.length} leads en pipeline</p>
          </div>
          <Sheet open={createOpen} onOpenChange={setCreateOpen}>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-10"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-sm">Nuevo</span>
            </Button>
            <SheetContent side="bottom" className="h-[85vh]">
              <SheetHeader>
                <SheetTitle>Nuevo Lead</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 p-4 overflow-y-auto flex-1">
                <div className="space-y-2">
                  <Label className="text-sm">Cliente</Label>
                  <Input className="h-11" value={newLead.clientName} onChange={(e) => setNewLead({ ...newLead, clientName: e.target.value })} placeholder="Nombre del cliente" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Producto</Label>
                  <Input className="h-11" value={newLead.product} onChange={(e) => setNewLead({ ...newLead, product: e.target.value })} placeholder="Tipo de seguro" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm">Prima Estimada</Label>
                    <Input className="h-11" type="number" value={newLead.estimatedPremium} onChange={(e) => setNewLead({ ...newLead, estimatedPremium: e.target.value })} placeholder="€" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Probabilidad %</Label>
                    <Input className="h-11" type="number" value={newLead.probability} onChange={(e) => setNewLead({ ...newLead, probability: e.target.value })} />
                  </div>
                </div>
              </div>
              <SheetFooter className="flex-row gap-3 p-4 border-t">
                <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">Crear Lead</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        {/* Stage Selector Pills */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-1">
            {columns.map((col) => {
              const count = leads.filter((l) => l.status === col.id).length
              return (
                <button
                  key={col.id}
                  onClick={() => setSelectedStage(col.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[36px] ${
                    selectedStage === col.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${col.color}`} />
                  {col.title}
                  {count > 0 && (
                    <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                      selectedStage === col.id ? 'bg-emerald-700 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </ScrollArea>

        {/* Stage Leads */}
        <div className="space-y-3">
          {stageLeads.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Inbox className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Todavía no hay leads registrados.</p>
                <p className="text-xs text-gray-400">Los leads aparecerán aquí cuando se muevan a &ldquo;{columns.find((c) => c.id === selectedStage)?.title}&rdquo;</p>
              </CardContent>
            </Card>
          ) : (
            stageLeads.map((lead) => (
              <MobileLeadCard
                key={lead.id}
                lead={lead}
                onAdvanceStage={() => advanceStage(lead.id)}
                onContact={() => toast({ title: 'Contactar', description: `Llamando a ${lead.clientName}` })}
                onSchedule={() => toast({ title: 'Programar cita', description: `Cita para ${lead.clientName}` })}
              />
            ))
          )}
        </div>
      </div>
    )
  }

  // Desktop view - Kanban Board
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-sm text-gray-500">{leads.length} leads en pipeline</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Lead
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nuevo Lead</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Cliente</Label><Input value={newLead.clientName} onChange={(e) => setNewLead({ ...newLead, clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Producto</Label><Input value={newLead.product} onChange={(e) => setNewLead({ ...newLead, product: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prima Estimada</Label><Input type="number" value={newLead.estimatedPremium} onChange={(e) => setNewLead({ ...newLead, estimatedPremium: e.target.value })} /></div>
                <div className="space-y-2"><Label>Probabilidad</Label><Input type="number" value={newLead.probability} onChange={(e) => setNewLead({ ...newLead, probability: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
          {columns.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.id)
            return (
              <div key={col.id} id={col.id} className="min-w-[250px] max-w-[280px] flex-shrink-0">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-2 h-2 rounded-full ${col.color}`} />
                  <h3 className="text-sm font-semibold text-gray-700">{col.title}</h3>
                  <Badge variant="secondary" className="text-[10px] ml-auto">{colLeads.length}</Badge>
                </div>
                <div className="space-y-2 min-h-[200px]" id={`column-${col.id}`}>
                  {colLeads.map((lead) => (
                    <div key={lead.id} id={lead.id}>
                      <LeadCard lead={lead} />
                    </div>
                  ))}
                  {colLeads.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center text-xs text-gray-400">
                      Arrastra leads aquí
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <DragOverlay>
          {activeLead && <LeadCard lead={activeLead} />}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
