'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type Campaign } from '@/lib/api'
import { Plus, Megaphone, Mail, Phone, MessageSquare, Calendar, Globe } from 'lucide-react'

// Display type
interface CampaignMetrics {
  sent: number
  opened: number
  clicked: number
  converted: number
}

interface CampaignDisplay {
  id: string
  name: string
  type: string
  segment?: string
  status: string
  startDate: string
  endDate?: string
  responsibleId?: string
  responsibleName: string
  budget: number
  metrics: CampaignMetrics
  createdAt: string
}

function parseMetrics(metrics: string | CampaignMetrics | undefined): CampaignMetrics {
  if (!metrics) return { sent: 0, opened: 0, clicked: 0, converted: 0 }
  if (typeof metrics === 'string') {
    try {
      return JSON.parse(metrics)
    } catch {
      return { sent: 0, opened: 0, clicked: 0, converted: 0 }
    }
  }
  return metrics as CampaignMetrics
}

function mapApiCampaign(c: Campaign): CampaignDisplay {
  return {
    id: c.id,
    name: c.name,
    type: c.type,
    segment: c.segment,
    status: c.status,
    startDate: c.startDate,
    endDate: c.endDate,
    responsibleId: c.responsibleId,
    responsibleName: c.responsible ? `${c.responsible.name} ${c.responsible.lastName}` : '',
    budget: 0,
    metrics: parseMetrics(c.metrics),
    createdAt: c.createdAt,
  }
}



const typeIcons: Record<string, React.ElementType> = {
  email: Mail,
  sms: Phone,
  llamada: MessageSquare,
  evento: Calendar,
  redes: Globe,
}

const statusColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  activa: 'bg-emerald-100 text-emerald-700',
  pausada: 'bg-amber-100 text-amber-700',
  completada: 'bg-blue-100 text-blue-700',
}

export default function CampaignsPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [campaigns, setCampaigns] = useState<CampaignDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [newCamp, setNewCamp] = useState({ name: '', type: 'email', segment: '', startDate: '', endDate: '', budget: '' })

  useEffect(() => {
    async function fetchCampaigns() {
      try {
        const res = await api.getCampaigns()
        setCampaigns(res.data.map(mapApiCampaign))
      } catch {
        setCampaigns([])
      } finally {
        setLoading(false)
      }
    }
    fetchCampaigns()
  }, [token])

  const handleCreate = () => {
    const camp: CampaignDisplay = {
      id: Date.now().toString(),
      name: newCamp.name,
      type: newCamp.type,
      segment: newCamp.segment,
      status: 'borrador',
      startDate: newCamp.startDate,
      endDate: newCamp.endDate,
      responsibleId: '1',
      responsibleName: 'María López',
      budget: Number(newCamp.budget),
      metrics: { sent: 0, opened: 0, clicked: 0, converted: 0 },
      createdAt: new Date().toISOString(),
    }
    setCampaigns((prev) => [camp, ...prev])
    setCreateOpen(false)
    setNewCamp({ name: '', type: 'email', segment: '', startDate: '', endDate: '', budget: '' })
    toast({ title: 'Campaña creada' })
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 md:p-4">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const createForm = (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm">Nombre</Label>
        <Input className={isMobile ? 'h-11' : ''} value={newCamp.name} onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })} placeholder="Nombre de la campaña" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Tipo</Label>
          <Select value={newCamp.type} onValueChange={(v) => setNewCamp({ ...newCamp, type: v })}>
            <SelectTrigger className={isMobile ? 'h-11' : ''}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
              <SelectItem value="llamada">Llamada</SelectItem>
              <SelectItem value="evento">Evento</SelectItem>
              <SelectItem value="redes">Redes Sociales</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Presupuesto</Label>
          <Input className={isMobile ? 'h-11' : ''} type="number" value={newCamp.budget} onChange={(e) => setNewCamp({ ...newCamp, budget: e.target.value })} placeholder="€" />
        </div>
      </div>
      <div className="space-y-2">
        <Label className="text-sm">Segmento</Label>
        <Input className={isMobile ? 'h-11' : ''} value={newCamp.segment} onChange={(e) => setNewCamp({ ...newCamp, segment: e.target.value })} placeholder="Segmento objetivo" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="space-y-2">
          <Label className="text-sm">Fecha Inicio</Label>
          <Input className={isMobile ? 'h-11' : ''} type="date" value={newCamp.startDate} onChange={(e) => setNewCamp({ ...newCamp, startDate: e.target.value })} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm">Fecha Fin</Label>
          <Input className={isMobile ? 'h-11' : ''} type="date" value={newCamp.endDate} onChange={(e) => setNewCamp({ ...newCamp, endDate: e.target.value })} />
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Campañas</h1>
          <p className="text-xs md:text-sm text-gray-500">{campaigns.length} campañas</p>
        </div>
        {isMobile ? (
          <>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-10"
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              <span className="text-sm">Nueva</span>
            </Button>
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
              <SheetContent side="bottom" className="h-[85vh]">
                <SheetHeader>
                  <SheetTitle>Nueva Campaña</SheetTitle>
                </SheetHeader>
                <div className="p-4 overflow-y-auto flex-1">
                  {createForm}
                </div>
                <SheetFooter className="flex-row gap-3 p-4 border-t">
                  <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </>
        ) : (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Nueva Campaña
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Campaña</DialogTitle>
              </DialogHeader>
              {createForm}
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Megaphone className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">Todavía no hay campañas activas.</p>
            <p className="text-xs text-gray-400">Crea tu primera campaña para empezar</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {campaigns.map((c) => {
            const Icon = typeIcons[c.type] || Megaphone
            const openRate = c.metrics.sent > 0 ? ((c.metrics.opened / c.metrics.sent) * 100).toFixed(1) : '0'
            const clickRate = c.metrics.sent > 0 ? ((c.metrics.clicked / c.metrics.sent) * 100).toFixed(1) : '0'
            const convRate = c.metrics.sent > 0 ? ((c.metrics.converted / c.metrics.sent) * 100).toFixed(1) : '0'
            return (
              <Card key={c.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="p-3 md:p-6 md:pb-3 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-sm truncate">{c.name}</CardTitle>
                        <p className="text-xs text-gray-500 truncate">{c.segment}</p>
                      </div>
                    </div>
                    <Badge className={`${statusColors[c.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px] shrink-0`}>{c.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 md:p-6 md:pt-0 space-y-2 md:space-y-3">
                  <div className="flex items-center justify-between text-[11px] md:text-xs text-gray-500">
                    <span className="truncate">{c.startDate} → {c.endDate || 'Sin fecha fin'}</span>
                    {c.budget > 0 && <span className="shrink-0 ml-2">€{c.budget.toLocaleString()}</span>}
                  </div>
                  <p className="text-[11px] md:text-xs text-gray-500">Responsable: {c.responsibleName}</p>
                  {c.metrics.sent > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <div className="grid grid-cols-4 gap-1 md:gap-2 text-center">
                        <div><p className="text-[10px] md:text-xs text-gray-500">Enviados</p><p className="text-xs md:text-sm font-semibold">{c.metrics.sent}</p></div>
                        <div><p className="text-[10px] md:text-xs text-gray-500">Abiertos</p><p className="text-xs md:text-sm font-semibold">{c.metrics.opened}</p></div>
                        <div><p className="text-[10px] md:text-xs text-gray-500">Clicks</p><p className="text-xs md:text-sm font-semibold">{c.metrics.clicked}</p></div>
                        <div><p className="text-[10px] md:text-xs text-gray-500">Conv.</p><p className="text-xs md:text-sm font-semibold text-emerald-600">{c.metrics.converted}</p></div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-gray-400">
                          <span>Apertura: {openRate}%</span>
                          <span>Conversión: {convRate}%</span>
                        </div>
                        <Progress value={Number(convRate)} className="h-1.5" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
