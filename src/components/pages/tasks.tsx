'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type Task } from '@/lib/api'
import { Plus, Search, CheckSquare, Calendar, User, ClipboardList } from 'lucide-react'

// Display type
interface TaskDisplay {
  id: string
  title: string
  clientId?: string
  clientName?: string
  assigneeId: string
  assignedToName: string
  dueDate: string
  priority: string
  status: string
  description?: string
  createdAt: string
}

function mapApiTask(t: Task): TaskDisplay {
  return {
    id: t.id,
    title: t.title,
    clientId: t.clientId,
    clientName: t.client ? `${t.client.name} ${t.client.lastName}` : undefined,
    assigneeId: t.assigneeId,
    assignedToName: t.assignee ? `${t.assignee.name} ${t.assignee.lastName}` : '',
    dueDate: t.dueDate,
    priority: t.priority,
    status: t.status,
    description: t.description,
    createdAt: t.createdAt,
  }
}



const priorityColors: Record<string, string> = {
  urgente: 'bg-red-100 text-red-700',
  alta: 'bg-orange-100 text-orange-700',
  media: 'bg-amber-100 text-amber-700',
  baja: 'bg-emerald-100 text-emerald-700',
}

const statusColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  en_progreso: 'bg-blue-100 text-blue-700',
  completada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
}

const statusLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En Progreso',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const filterPills = [
  { value: 'all', label: 'Todas' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completada', label: 'Completada' },
]

export default function TasksPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [tasks, setTasks] = useState<TaskDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [newTask, setNewTask] = useState({ title: '', clientName: '', dueDate: '', priority: 'media', description: '' })

  useEffect(() => {
    async function fetchTasks() {
      try {
        const res = await api.getTasks({ page: '1', limit: '50' })
        setTasks(res.data.map(mapApiTask))
      } catch {
        setTasks([])
      } finally {
        setLoading(false)
      }
    }
    fetchTasks()
  }, [token])

  const filtered = tasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase()) || (t.clientName || '').toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleCreate = () => {
    const task: TaskDisplay = {
      id: Date.now().toString(),
      title: newTask.title,
      clientName: newTask.clientName || undefined,
      assigneeId: '1',
      assignedToName: 'María López',
      dueDate: newTask.dueDate,
      priority: newTask.priority,
      status: 'pendiente',
      description: newTask.description,
      createdAt: new Date().toISOString(),
    }
    setTasks((prev) => [task, ...prev])
    setCreateOpen(false)
    setNewTask({ title: '', clientName: '', dueDate: '', priority: 'media', description: '' })
    toast({ title: 'Tarea creada' })
  }

  const toggleStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const newStatus = t.status === 'completada' ? 'pendiente' : 'completada'
          return { ...t, status: newStatus }
        }
        return t
      })
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-24 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        {isMobile ? (
          <>
            <div className="flex gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i}><CardContent className="p-3"><div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-3 w-1/3" /></div></CardContent></Card>
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
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
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Tareas</h1>
            <p className="text-xs md:text-sm text-gray-500">{filtered.length} tareas</p>
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
          <Input
            placeholder="Buscar tareas..."
            className="pl-9 h-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                  ({tasks.filter((t) => t.status === pill.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Task Cards */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Todavía no hay tareas pendientes.</p>
                <p className="text-xs text-gray-400">Crea una nueva tarea para empezar</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((t) => (
              <Card key={t.id} className={`${t.status === 'completada' ? 'opacity-60' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <Checkbox
                        checked={t.status === 'completada'}
                        onCheckedChange={() => toggleStatus(t.id)}
                        className="h-5 w-5 mt-0.5"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-tight ${t.status === 'completada' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {t.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <Badge className={`${priorityColors[t.priority] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                          {t.priority}
                        </Badge>
                        <Badge className={`${statusColors[t.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                          {statusLabels[t.status] || t.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                        {t.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t.dueDate}
                          </span>
                        )}
                        {t.assignedToName && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {t.assignedToName}
                          </span>
                        )}
                      </div>
                    </div>
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
              <SheetTitle>Nueva Tarea</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 p-4 overflow-y-auto flex-1">
              <div className="space-y-2">
                <Label className="text-sm">Título</Label>
                <Input className="h-11" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="Título de la tarea" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Cliente (opcional)</Label>
                <Input className="h-11" value={newTask.clientName} onChange={(e) => setNewTask({ ...newTask, clientName: e.target.value })} placeholder="Nombre del cliente" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Fecha Límite</Label>
                  <Input className="h-11" type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Prioridad</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Descripción</Label>
                <Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} placeholder="Descripción de la tarea" rows={3} />
              </div>
            </div>
            <SheetFooter className="flex-row gap-3 p-4 border-t">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">Crear Tarea</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Desktop view - Table
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tareas</h1>
          <p className="text-sm text-gray-500">{filtered.length} tareas</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva Tarea
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Tarea</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Título</Label><Input value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cliente (opcional)</Label><Input value={newTask.clientName} onChange={(e) => setNewTask({ ...newTask, clientName: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Fecha Límite</Label><Input type="date" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} /></div>
                <div className="space-y-2"><Label>Prioridad</Label>
                  <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgente">Urgente</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="baja">Baja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Descripción</Label><Textarea value={newTask.description} onChange={(e) => setNewTask({ ...newTask, description: e.target.value })} /></div>
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
              <Input placeholder="Buscar tareas..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_progreso">En Progreso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
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
                <TableHead className="w-10"></TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Asignado</TableHead>
                <TableHead>Fecha Límite</TableHead>
                <TableHead>Prioridad</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <CheckSquare className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Todavía no hay tareas pendientes.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((t) => (
                  <TableRow key={t.id} className={t.status === 'completada' ? 'opacity-60' : ''}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={t.status === 'completada'}
                        onChange={() => toggleStatus(t.id)}
                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell className={`font-medium ${t.status === 'completada' ? 'line-through' : ''}`}>{t.title}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">{t.clientName || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">{t.assignedToName}</TableCell>
                    <TableCell className="text-gray-500">{t.dueDate}</TableCell>
                    <TableCell>
                      <Badge className={`${priorityColors[t.priority] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{t.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[t.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{statusLabels[t.status] || t.status.replace('_', ' ')}</Badge>
                    </TableCell>
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
