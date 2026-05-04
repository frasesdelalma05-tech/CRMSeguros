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
import { api, type Policy } from '@/lib/api'
import { Plus, Search, Shield, AlertTriangle, FileText, Phone, RefreshCw, Lock } from 'lucide-react'

// Display type
interface PolicyDisplay {
  id: string
  policyNumber: string
  clientId: string
  clientName: string
  product: string
  startDate: string
  endDate: string
  status: string
  premium: number
  paymentMethod?: string
  soldByAgentId?: string
  ownerAgentId?: string
  agentName?: string
  createdAt: string
  updatedAt: string
}

function mapApiPolicy(p: Policy): PolicyDisplay {
  return {
    id: p.id,
    policyNumber: p.policyNumber,
    clientId: p.clientId,
    clientName: p.client ? `${p.client.name} ${p.client.lastName}` : '',
    product: p.productName || p.product?.name || '',
    startDate: p.startDate,
    endDate: p.endDate,
    status: p.status,
    premium: p.premium,
    paymentMethod: p.paymentMethod,
    soldByAgentId: p.soldByAgentId,
    ownerAgentId: p.ownerAgentId,
    agentName: p.soldByAgent ? `${p.soldByAgent.name} ${p.soldByAgent.lastName}` : p.ownerAgent ? `${p.ownerAgent.name} ${p.ownerAgent.lastName}` : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}



const statusColors: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-700',
  vencida: 'bg-red-100 text-red-700',
  cancelada: 'bg-gray-100 text-gray-700',
  en_renovacion: 'bg-amber-100 text-amber-700',
}

const statusLabels: Record<string, string> = {
  activa: 'Activa',
  vencida: 'Vencida',
  cancelada: 'Cancelada',
  en_renovacion: 'En Renovación',
}

const statusFilterOptions = [
  { value: 'all', label: 'Todas' },
  { value: 'activa', label: 'Activas' },
  { value: 'en_renovacion', label: 'Renovación' },
  { value: 'vencida', label: 'Vencidas' },
  { value: 'cancelada', label: 'Canceladas' },
]

function getDaysUntilExpiry(endDate: string): number {
  const end = new Date(endDate)
  const now = new Date()
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function getExpiryBadge(endDate: string): { text: string; className: string } | null {
  const days = getDaysUntilExpiry(endDate)
  if (days < 0) return null
  if (days <= 30) return { text: `Vence en ${days}d`, className: 'bg-red-500 text-white' }
  if (days <= 60) return { text: `Vence en ${days}d`, className: 'bg-amber-500 text-white' }
  return null
}

export default function PoliciesPage() {
  const { token, user, setSelectedId, setPage } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [policies, setPolicies] = useState<PolicyDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiringFilter, setExpiringFilter] = useState(false)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newPolicy, setNewPolicy] = useState({ policyNumber: '', clientName: '', product: '', premium: '', startDate: '', endDate: '', paymentMethod: 'mensual' })

  useEffect(() => {
    async function fetchPolicies() {
      try {
        const res = await api.getPolicies({ page: '1', limit: '50' })
        setPolicies(res.data.map(mapApiPolicy))
      } catch {
        setPolicies([])
      } finally {
        setLoading(false)
      }
    }
    fetchPolicies()
  }, [token])

  const filtered = policies.filter((p) => {
    const matchesSearch = p.clientName.toLowerCase().includes(search.toLowerCase()) || p.policyNumber.toLowerCase().includes(search.toLowerCase()) || p.product.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter
    const matchesExpiring = !expiringFilter || p.status === 'en_renovacion'
    return matchesSearch && matchesStatus && matchesExpiring
  })

  // ─── Role-based permission helpers ─────────────────────────────────────────
  const canCreate = (() => {
    if (!user) return false
    if (user.role === 'solo_lectura' || user.role === 'atencion_cliente') return false
    return true
  })()

  const canEditPolicy = (policy: PolicyDisplay) => {
    if (!user) return false
    if (user.role === 'super_administrador' || user.role === 'administrador') return true
    if (user.role === 'corredor') return policy.ownerAgentId === user.id || policy.soldByAgentId === user.id
    return false
  }

  const handleCreate = async () => {
    if (!newPolicy.policyNumber || !newPolicy.product || !newPolicy.premium || !newPolicy.startDate || !newPolicy.endDate) {
      toast({ title: 'Campos obligatorios', description: 'Completa número de póliza, producto, prima y fechas', variant: 'destructive' })
      return
    }
    try {
      await api.createPolicy({
        policyNumber: newPolicy.policyNumber,
        productName: newPolicy.product,
        premium: Number(newPolicy.premium),
        startDate: newPolicy.startDate,
        endDate: newPolicy.endDate,
        paymentMethod: newPolicy.paymentMethod,
      })
      toast({ title: 'Póliza creada' })
      // Refresh policies list
      const res = await api.getPolicies({ page: '1', limit: '50' })
      setPolicies(res.data.map(mapApiPolicy))
      setCreateOpen(false)
      setNewPolicy({ policyNumber: '', clientName: '', product: '', premium: '', startDate: '', endDate: '', paymentMethod: 'mensual' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al crear la póliza'
      toast({ title: 'Error', description: message, variant: 'destructive' })
    }
  }

  const handleQuickAction = (action: string, policy: PolicyDisplay) => {
    toast({ title: `${action} - ${policy.policyNumber}` })
  }

  const handlePolicyClick = (policyId: string) => {
    setSelectedId(policyId)
    setPage('policy-detail')
  }

  // ===== LOADING =====
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        {isMobile ? (
          <>
            <Skeleton className="h-10 w-full rounded-lg" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-16 rounded-full" />
                        <Skeleton className="h-5 w-20 rounded-full" />
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
    return (
      <div className="space-y-4 max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pólizas</h1>
            <p className="text-xs text-gray-500">{filtered.length} pólizas</p>
          </div>
          {canCreate && (
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
                <DrawerTitle>Nueva Póliza</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 space-y-4 pb-4">
                <div className="space-y-2"><Label>Nº Póliza</Label><Input value={newPolicy.policyNumber} onChange={(e) => setNewPolicy({ ...newPolicy, policyNumber: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cliente</Label><Input value={newPolicy.clientName} onChange={(e) => setNewPolicy({ ...newPolicy, clientName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Producto</Label><Input value={newPolicy.product} onChange={(e) => setNewPolicy({ ...newPolicy, product: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Prima</Label><Input type="number" value={newPolicy.premium} onChange={(e) => setNewPolicy({ ...newPolicy, premium: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Forma de Pago</Label>
                    <Select value={newPolicy.paymentMethod} onValueChange={(v) => setNewPolicy({ ...newPolicy, paymentMethod: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mensual">Mensual</SelectItem>
                        <SelectItem value="trimestral">Trimestral</SelectItem>
                        <SelectItem value="semestral">Semestral</SelectItem>
                        <SelectItem value="anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Fecha Inicio</Label><Input type="date" value={newPolicy.startDate} onChange={(e) => setNewPolicy({ ...newPolicy, startDate: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Fecha Vencimiento</Label><Input type="date" value={newPolicy.endDate} onChange={(e) => setNewPolicy({ ...newPolicy, endDate: e.target.value })} /></div>
                </div>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DrawerClose>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear Póliza</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por nº póliza, cliente..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter Pills */}
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {statusFilterOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setStatusFilter(opt.value); setExpiringFilter(false) }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] flex items-center ${
                statusFilter === opt.value && !expiringFilter
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={() => { setExpiringFilter(!expiringFilter); setStatusFilter('all') }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors min-h-[36px] flex items-center gap-1 ${
              expiringFilter
                ? 'bg-amber-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <AlertTriangle className="h-3 w-3" /> Por Vencer
          </button>
        </div>

        {/* Policy Cards */}
        {filtered.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Todavía no hay pólizas registradas</p>
              <p className="text-xs text-gray-400 mt-1">Ajusta los filtros o crea una nueva póliza</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => {
              const expiryBadge = getExpiryBadge(p.endDate)
              return (
                <Card key={p.id} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => handlePolicyClick(p.id)}>
                  {/* Expiry alert banner */}
                  {expiryBadge && (
                    <div className={`${expiryBadge.className} px-3 py-1.5 text-xs font-medium flex items-center gap-1.5`}>
                      <AlertTriangle className="h-3 w-3" />
                      {expiryBadge.text}
                    </div>
                  )}
                  <CardContent className="p-4">
                    {/* Top: Policy number & status */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{p.policyNumber}</p>
                        <p className="text-xs text-gray-500">{p.clientName}</p>
                      </div>
                      <Badge className={`${statusColors[p.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px] shrink-0`}>
                        {statusLabels[p.status] || p.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Product */}
                    <p className="text-sm text-gray-700 font-medium mb-2">{p.product}</p>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-3">
                      <div>
                        <span className="text-gray-400">Prima</span>
                        <p className="font-semibold text-gray-900">€{p.premium.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Pago</span>
                        <p className="font-medium text-gray-700 capitalize">{p.paymentMethod || '-'}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Inicio</span>
                        <p className="text-gray-700">{p.startDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Vencimiento</span>
                        <p className={`${getDaysUntilExpiry(p.endDate) <= 60 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                          {p.endDate}
                        </p>
                      </div>
                      {p.agentName && (
                        <div className="col-span-2">
                          <span className="text-gray-400">Corredor/Agente</span>
                          <p className="text-teal-700 font-medium text-xs">{p.agentName}</p>
                        </div>
                      )}
                    </div>

                    {/* Quick Actions */}
                    {canEditPolicy(p) ? (
                    <div className="flex gap-2 pt-2 border-t border-gray-100">
                      {(p.status === 'en_renovacion' || (getDaysUntilExpiry(p.endDate) <= 60 && getDaysUntilExpiry(p.endDate) > 0)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-xs flex-1"
                          onClick={() => handleQuickAction('Renovar', p)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" /> Renovar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs flex-1"
                        onClick={() => handleQuickAction('Contactar', p)}
                      >
                        <Phone className="h-3 w-3 mr-1" /> Contactar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2.5 text-xs flex-1"
                        onClick={() => handleQuickAction('Documento', p)}
                      >
                        <FileText className="h-3 w-3 mr-1" /> Ver
                      </Button>
                    </div>
                    ) : (
                    <div className="flex items-center gap-1 pt-2 border-t border-gray-100">
                      <Badge className="bg-gray-100 text-gray-500 border-0 text-[10px]">
                        <Lock className="h-3 w-3 mr-0.5" /> Solo lectura
                      </Badge>
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

  // ===== DESKTOP/TABLET VIEW =====
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pólizas</h1>
          <p className="text-sm text-gray-500">{filtered.length} pólizas</p>
        </div>
        {canCreate && (
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="mr-2 h-4 w-4" /> Nueva Póliza
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Póliza</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Nº Póliza</Label><Input value={newPolicy.policyNumber} onChange={(e) => setNewPolicy({ ...newPolicy, policyNumber: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cliente</Label><Input value={newPolicy.clientName} onChange={(e) => setNewPolicy({ ...newPolicy, clientName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Producto</Label><Input value={newPolicy.product} onChange={(e) => setNewPolicy({ ...newPolicy, product: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Prima</Label><Input type="number" value={newPolicy.premium} onChange={(e) => setNewPolicy({ ...newPolicy, premium: e.target.value })} /></div>
                <div className="space-y-2"><Label>Forma de Pago</Label>
                  <Select value={newPolicy.paymentMethod} onValueChange={(v) => setNewPolicy({ ...newPolicy, paymentMethod: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mensual">Mensual</SelectItem>
                      <SelectItem value="trimestral">Trimestral</SelectItem>
                      <SelectItem value="semestral">Semestral</SelectItem>
                      <SelectItem value="anual">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fecha Inicio</Label><Input type="date" value={newPolicy.startDate} onChange={(e) => setNewPolicy({ ...newPolicy, startDate: e.target.value })} /></div>
                <div className="space-y-2"><Label>Fecha Vencimiento</Label><Input type="date" value={newPolicy.endDate} onChange={(e) => setNewPolicy({ ...newPolicy, endDate: e.target.value })} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        )}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por nº póliza, cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="vencida">Vencida</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
                <SelectItem value="en_renovacion">En Renovación</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant={expiringFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExpiringFilter(!expiringFilter)}
              className={expiringFilter ? 'bg-amber-500 hover:bg-amber-600 text-white' : ''}
            >
              <AlertTriangle className="mr-1 h-4 w-4" /> Por Vencer
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº Póliza</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden sm:table-cell">Producto</TableHead>
                <TableHead className="hidden md:table-cell">Inicio</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="hidden sm:table-cell">Prima</TableHead>
                <TableHead className="hidden lg:table-cell">Corredor/Agente</TableHead>
                <TableHead className="hidden lg:table-cell">Pago</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Shield className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Todavía no hay pólizas registradas</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => {
                  const expiryBadge = getExpiryBadge(p.endDate)
                  return (
                    <TableRow key={p.id} className="hover:bg-emerald-50/50 cursor-pointer" onClick={() => handlePolicyClick(p.id)}>
                      <TableCell className="font-medium">{p.policyNumber}</TableCell>
                      <TableCell>{p.clientName}</TableCell>
                      <TableCell className="hidden sm:table-cell">{p.product}</TableCell>
                      <TableCell className="hidden md:table-cell text-gray-500">{p.startDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-500">{p.endDate}</span>
                          {expiryBadge && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${expiryBadge.className}`}>
                              {expiryBadge.text}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[p.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{statusLabels[p.status] || p.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">€{p.premium.toLocaleString()}</TableCell>
                      <TableCell className="hidden lg:table-cell text-teal-700">{p.agentName || '-'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-gray-500 capitalize">{p.paymentMethod}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
