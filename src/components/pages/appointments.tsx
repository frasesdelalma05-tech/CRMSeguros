'use client'

import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter, DrawerClose } from '@/components/ui/drawer'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type Appointment } from '@/lib/api'
import {
  Plus, Calendar as CalIcon, List, Clock, ChevronLeft, ChevronRight,
  CheckCheck, X, RotateCcw, User
} from 'lucide-react'
import { format, addDays, subDays, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday } from 'date-fns'
import { es } from 'date-fns/locale'

// Display type
interface AppointmentDisplay {
  id: string
  title: string
  clientId?: string
  clientName: string
  agentId: string
  agentName: string
  date: string
  type: string
  status: string
  notes?: string
  createdAt: string
}

function mapApiAppointment(a: Appointment): AppointmentDisplay {
  return {
    id: a.id,
    title: a.title,
    clientId: a.clientId,
    clientName: a.client ? `${a.client.name} ${a.client.lastName}` : '',
    agentId: a.agentId,
    agentName: a.agent ? `${a.agent.name} ${a.agent.lastName}` : '',
    date: a.date,
    type: a.type,
    status: a.status,
    notes: a.notes,
    createdAt: a.createdAt,
  }
}



const typeColors: Record<string, string> = {
  llamada: 'bg-blue-100 text-blue-700',
  videollamada: 'bg-purple-100 text-purple-700',
  visita: 'bg-amber-100 text-amber-700',
  reunion: 'bg-emerald-100 text-emerald-700',
  seguimiento: 'bg-teal-100 text-teal-700',
}

const statusColors: Record<string, string> = {
  programada: 'bg-blue-100 text-blue-700',
  completada: 'bg-emerald-100 text-emerald-700',
  cancelada: 'bg-red-100 text-red-700',
  reprogramada: 'bg-amber-100 text-amber-700',
}

const typeLabels: Record<string, string> = {
  llamada: 'Llamada',
  videollamada: 'Videollamada',
  visita: 'Visita',
  reunion: 'Reunión',
  seguimiento: 'Seguimiento',
}

const statusLabels: Record<string, string> = {
  programada: 'Programada',
  completada: 'Completada',
  cancelada: 'Cancelada',
  reprogramada: 'Reprogramada',
}

export default function AppointmentsPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [appointments, setAppointments] = useState<AppointmentDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'calendar' | 'list'>('list')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [createOpen, setCreateOpen] = useState(false)
  const [newAppt, setNewAppt] = useState({ title: '', clientName: '', date: '', time: '10:00', type: 'reunion', notes: '' })
  const dateStripRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const res = await api.getAppointments({ page: '1', limit: '50' })
        setAppointments(res.data.map(mapApiAppointment))
      } catch {
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }
    fetchAppointments()
  }, [token])

  const handleCreate = () => {
    const appt: AppointmentDisplay = {
      id: Date.now().toString(),
      title: newAppt.title,
      clientId: '',
      clientName: newAppt.clientName,
      agentId: '1',
      agentName: 'María López',
      date: `${newAppt.date}T${newAppt.time}:00`,
      type: newAppt.type,
      status: 'programada',
      notes: newAppt.notes,
      createdAt: new Date().toISOString(),
    }
    setAppointments((prev) => [appt, ...prev])
    setCreateOpen(false)
    setNewAppt({ title: '', clientName: '', date: '', time: '10:00', type: 'reunion', notes: '' })
    toast({ title: 'Cita creada' })
  }

  const handleStatusChange = (id: string, newStatus: string) => {
    setAppointments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: newStatus } : a))
    )
    toast({ title: `Cita ${statusLabels[newStatus]?.toLowerCase() || 'actualizada'}` })
  }

  const filteredAppointments = selectedDate
    ? appointments.filter((a) => isSameDay(parseISO(a.date), selectedDate))
    : appointments

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const getAppointmentsForDay = (day: Date) =>
    appointments.filter((a) => isSameDay(parseISO(a.date), day))

  // Generate 14-day strip centered on selected date
  const dateStripDays = eachDayOfInterval({
    start: subDays(selectedDate, 3),
    end: addDays(selectedDate, 10),
  })

  // ===== MOBILE LOADING =====
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-14 shrink-0 rounded-full" />
          ))}
        </div>
        {isMobile ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Skeleton className="h-10 w-12" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
            <h1 className="text-xl font-bold text-gray-900">Citas</h1>
            <p className="text-xs text-gray-500">{appointments.length} citas programadas</p>
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
                <DrawerTitle>Nueva Cita</DrawerTitle>
              </DrawerHeader>
              <div className="px-4 space-y-4 pb-4">
                <div className="space-y-2"><Label>Título</Label><Input value={newAppt.title} onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cliente</Label><Input value={newAppt.clientName} onChange={(e) => setNewAppt({ ...newAppt, clientName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Hora</Label><Input type="time" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newAppt.type} onValueChange={(v) => setNewAppt({ ...newAppt, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llamada">Llamada</SelectItem>
                      <SelectItem value="videollamada">Videollamada</SelectItem>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="reunion">Reunión</SelectItem>
                      <SelectItem value="seguimiento">Seguimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Notas</Label><Textarea value={newAppt.notes} onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })} rows={3} /></div>
              </div>
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DrawerClose>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear Cita</Button>
              </DrawerFooter>
            </DrawerContent>
          </Drawer>
        </div>

        {/* Date Strip - Horizontal scrollable */}
        <div className="relative">
          <div
            ref={dateStripRef}
            className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {dateStripDays.map((day) => {
              const isSelected = isSameDay(day, selectedDate)
              const dayAppts = getAppointmentsForDay(day)
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDate(day)}
                  className={`flex flex-col items-center justify-center shrink-0 w-14 h-16 rounded-xl transition-all min-h-[44px] ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-md'
                      : isToday(day)
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-emerald-100' : 'text-gray-400'}`}>
                    {format(day, 'EEE', { locale: es })}
                  </span>
                  <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-white' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayAppts.length > 0 && (
                    <span className={`text-[10px] font-medium ${isSelected ? 'text-emerald-100' : 'text-emerald-600'}`}>
                      {dayAppts.length} {dayAppts.length === 1 ? 'cita' : 'citas'}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setSelectedDate(subDays(selectedDate, 1))}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <h2 className="text-base font-semibold text-gray-900 capitalize">
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: es })}
            </h2>
            {isToday(selectedDate) && (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] mt-0.5">Hoy</Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setSelectedDate(addDays(selectedDate, 1))}>
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Timeline Cards */}
        {filteredAppointments.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Todavía no hay citas programadas.</p>
              <p className="text-xs text-gray-400 mt-1">Crea una nueva cita con el botón +</p>
            </CardContent>
          </Card>
        ) : (
          <div className="relative space-y-0">
            {/* Timeline line */}
            <div className="absolute left-[27px] top-0 bottom-0 w-px bg-gray-200" />

            {filteredAppointments
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((a) => (
                <div key={a.id} className="relative flex gap-3 pb-4">
                  {/* Timeline dot & time */}
                  <div className="flex flex-col items-center shrink-0 w-14 pt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ring-4 ring-white z-10 ${
                      a.status === 'completada' ? 'bg-emerald-500' :
                      a.status === 'cancelada' ? 'bg-red-400' :
                      a.status === 'reprogramada' ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`} />
                    <span className="text-xs font-semibold text-gray-600 mt-1">
                      {format(parseISO(a.date), 'HH:mm')}
                    </span>
                  </div>

                  {/* Card */}
                  <Card className="flex-1 border-l-4 shadow-sm" style={{
                    borderLeftColor:
                      a.status === 'completada' ? '#10b981' :
                      a.status === 'cancelada' ? '#ef4444' :
                      a.status === 'reprogramada' ? '#f59e0b' :
                      '#3b82f6'
                  }}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="text-sm font-semibold text-gray-900 leading-tight">{a.title}</h3>
                        <Badge className={`${statusColors[a.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px] shrink-0`}>
                          {statusLabels[a.status] || a.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
                        <User className="h-3 w-3" />
                        <span>{a.clientName || 'Sin cliente'}</span>
                      </div>
                      <Badge className={`${typeColors[a.type] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                        {typeLabels[a.type] || a.type}
                      </Badge>

                      {/* Action Buttons */}
                      {a.status === 'programada' && (
                        <div className="flex gap-1.5 mt-3 pt-2 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs flex-1"
                            onClick={() => handleStatusChange(a.id, 'completada')}
                          >
                            <CheckCheck className="h-3 w-3 mr-1" /> Completar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs"
                            onClick={() => handleStatusChange(a.id, 'reprogramada')}
                            title="Reprogramar"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleStatusChange(a.id, 'cancelada')}
                            title="Cancelar"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      {a.status === 'reprogramada' && (
                        <div className="flex gap-1.5 mt-3 pt-2 border-t border-gray-100">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs flex-1"
                            onClick={() => handleStatusChange(a.id, 'completada')}
                          >
                            <CheckCheck className="h-3 w-3 mr-1" /> Completar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleStatusChange(a.id, 'cancelada')}
                            title="Cancelar"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
          </div>
        )}
      </div>
    )
  }

  // ===== TABLET VIEW (md) =====
  // Weekly calendar view with 2-column layout
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Citas</h1>
          <p className="text-sm text-gray-500">{appointments.length} citas programadas</p>
        </div>
        <div className="flex gap-2">
          <Button variant={view === 'list' ? 'default' : 'outline'} size="sm" onClick={() => setView('list')}>
            <List className="mr-1 h-4 w-4" /> Lista
          </Button>
          <Button variant={view === 'calendar' ? 'default' : 'outline'} size="sm" onClick={() => setView('calendar')}>
            <CalIcon className="mr-1 h-4 w-4" /> Calendario
          </Button>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Nueva Cita
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nueva Cita</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2"><Label>Título</Label><Input value={newAppt.title} onChange={(e) => setNewAppt({ ...newAppt, title: e.target.value })} /></div>
                <div className="space-y-2"><Label>Cliente</Label><Input value={newAppt.clientName} onChange={(e) => setNewAppt({ ...newAppt, clientName: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Fecha</Label><Input type="date" value={newAppt.date} onChange={(e) => setNewAppt({ ...newAppt, date: e.target.value })} /></div>
                  <div className="space-y-2"><Label>Hora</Label><Input type="time" value={newAppt.time} onChange={(e) => setNewAppt({ ...newAppt, time: e.target.value })} /></div>
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={newAppt.type} onValueChange={(v) => setNewAppt({ ...newAppt, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llamada">Llamada</SelectItem>
                      <SelectItem value="videollamada">Videollamada</SelectItem>
                      <SelectItem value="visita">Visita</SelectItem>
                      <SelectItem value="reunion">Reunión</SelectItem>
                      <SelectItem value="seguimiento">Seguimiento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Notas</Label><Textarea value={newAppt.notes} onChange={(e) => setNewAppt({ ...newAppt, notes: e.target.value })} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">Crear</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {view === 'calendar' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-lg font-semibold capitalize">
                  {format(currentMonth, 'MMMM yyyy', { locale: es })}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-px">
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d) => (
                  <div key={d} className="text-center text-xs font-medium text-gray-500 py-2">{d}</div>
                ))}
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-20" />
                ))}
                {daysInMonth.map((day) => {
                  const dayAppts = getAppointmentsForDay(day)
                  const isSelected = selectedDate && isSameDay(day, selectedDate)
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`h-20 border border-gray-100 p-1 cursor-pointer hover:bg-emerald-50 transition-colors ${
                        isSelected ? 'bg-emerald-50 ring-2 ring-emerald-500' : ''
                      } ${isToday(day) ? 'font-bold' : ''}`}
                    >
                      <p className={`text-xs ${isToday(day) ? 'text-emerald-600' : 'text-gray-700'}`}>
                        {format(day, 'd')}
                      </p>
                      {dayAppts.slice(0, 2).map((a) => (
                        <div key={a.id} className={`text-[10px] px-1 rounded mt-0.5 truncate ${typeColors[a.type] || 'bg-gray-100 text-gray-700'}`}>
                          {a.title}
                        </div>
                      ))}
                      {dayAppts.length > 2 && (
                        <p className="text-[10px] text-gray-400">+{dayAppts.length - 2} más</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Day detail */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {selectedDate ? format(selectedDate, "d 'de' MMMM, yyyy", { locale: es }) : 'Selecciona un día'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredAppointments.length === 0 ? (
                <div className="text-center py-8">
                  <CalIcon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Todavía no hay citas programadas.</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredAppointments.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium">{a.title}</p>
                        <Badge className={`${statusColors[a.status] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>{statusLabels[a.status] || a.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {format(parseISO(a.date), 'HH:mm')}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{a.clientName} · {a.agentName}</p>
                      <Badge className={`${typeColors[a.type] || 'bg-gray-100 text-gray-700'} border-0 text-[10px] mt-1`}>{typeLabels[a.type] || a.type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Agente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <CalIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                      <p className="text-gray-500">Todavía no hay citas programadas.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell>{a.clientName}</TableCell>
                      <TableCell className="hidden sm:table-cell text-gray-500">
                        {format(parseISO(a.date), "dd/MM/yyyy 'a las' HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${typeColors[a.type] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{typeLabels[a.type] || a.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${statusColors[a.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{statusLabels[a.status] || a.status}</Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-gray-500">{a.agentName}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
