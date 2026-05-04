'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAppStore } from '@/lib/store'
import { api, type DashboardData } from '@/lib/api'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  Users, UserPlus, Shield, AlertTriangle, Calendar, TrendingUp,
  DollarSign, Heart, CheckSquare, Percent, Clock, Phone, ChevronRight,
  FileWarning, Bell, CalendarCheck,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from 'recharts'

const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899']

// --- Local types for dashboard sections ---

interface TodayAppointment {
  id: string
  time: string
  title: string
  client: string
  type: string
  status: string
}

interface FollowUpClient {
  id: string
  name: string
  status: string
  lastContact: string
  riskReason: string
}

interface ExpiringPolicy {
  id: string
  policyNumber: string
  client: string
  product: string
  expiryDate: string
  daysRemaining: number
}

// --- Helpers ---

const typeBadgeVariant: Record<string, string> = {
  'Reunión': 'bg-blue-100 text-blue-700',
  'Videollamada': 'bg-purple-100 text-purple-700',
  'Llamada': 'bg-teal-100 text-teal-700',
  'Visita': 'bg-amber-100 text-amber-700',
  'Seguimiento': 'bg-emerald-100 text-emerald-700',
}

const statusLabelMap: Record<string, { label: string; className: string }> = {
  'programada': { label: 'Programada', className: 'bg-blue-100 text-blue-700' },
  'pendiente': { label: 'Pendiente', className: 'bg-amber-100 text-amber-700' },
  'completada': { label: 'Completada', className: 'bg-emerald-100 text-emerald-700' },
  'cancelada': { label: 'Cancelada', className: 'bg-red-100 text-red-700' },
  'activo': { label: 'Activo', className: 'bg-emerald-100 text-emerald-700' },
  'inactivo': { label: 'Inactivo', className: 'bg-gray-100 text-gray-700' },
  'en_riesgo': { label: 'En Riesgo', className: 'bg-red-100 text-red-700' },
  'prospecto': { label: 'Prospecto', className: 'bg-blue-100 text-blue-700' },
}

function getUrgencyClass(days: number): string {
  if (days < 7) return 'border-l-4 border-l-red-500 bg-red-50/50'
  if (days < 30) return 'border-l-4 border-l-amber-500 bg-amber-50/50'
  return 'border-l-4 border-l-emerald-500 bg-emerald-50/50'
}

function getUrgencyBadge(days: number): { label: string; className: string } {
  if (days < 7) return { label: 'Urgente', className: 'bg-red-100 text-red-700' }
  if (days < 30) return { label: 'Próximo', className: 'bg-amber-100 text-amber-700' }
  return { label: 'Normal', className: 'bg-emerald-100 text-emerald-700' }
}

// --- Empty state component ---
function EmptyStateSection({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <Card className="py-0">
      <CardContent className="p-6 text-center">
        <Icon className="h-10 w-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">{title}</p>
      </CardContent>
    </Card>
  )
}

// --- Chart empty state component ---
function ChartEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Todavía no hay datos suficientes.</p>
          <p className="text-xs text-gray-400 mt-1">Los datos aparecerán cuando haya información disponible</p>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Component ---

export default function DashboardPage() {
  const { token } = useAppStore()
  const isMobile = useIsMobile()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  // Empty default data when API fails
  const emptyDashboard: DashboardData = {
    kpis: {
      totalClients: 0,
      activeLeads: 0,
      activePolicies: 0,
      expiringPolicies: 0,
      todayAppointments: 0,
      openOpportunities: 0,
      estimatedRevenue: 0,
      atRiskClients: 0,
      pendingTasks: 0,
      monthlyConversion: 0,
    },
    leadsByMonth: [],
    salesByAgent: [],
    opportunitiesByStatus: [],
    appointmentsByType: [],
    upcomingRenewals: [],
  }

  useEffect(() => {
    async function fetchDashboard() {
      try {
        if (token) {
          const res = await api.getDashboard()
          const apiData = (res as { data?: Record<string, unknown> }).data || res
          const kpiData = apiData as {
            totalClients?: number; totalLeads?: number; activePolicies?: number;
            expiringPolicies?: number; todayAppointments?: number; openOpportunities?: number;
            monthlyConversion?: number; estimatedRevenue?: number; atRiskClients?: number; pendingTasks?: number;
          }

          setData({
            kpis: {
              totalClients: kpiData.totalClients ?? 0,
              activeLeads: kpiData.totalLeads ?? 0,
              activePolicies: kpiData.activePolicies ?? 0,
              expiringPolicies: kpiData.expiringPolicies ?? 0,
              todayAppointments: kpiData.todayAppointments ?? 0,
              openOpportunities: kpiData.openOpportunities ?? 0,
              estimatedRevenue: kpiData.estimatedRevenue ?? 0,
              atRiskClients: kpiData.atRiskClients ?? 0,
              pendingTasks: kpiData.pendingTasks ?? 0,
              monthlyConversion: (kpiData.monthlyConversion ?? 0) / 100,
            },
            leadsByMonth: [],
            salesByAgent: [],
            opportunitiesByStatus: [],
            appointmentsByType: [],
            upcomingRenewals: [],
          })
        } else {
          setData(emptyDashboard)
        }
      } catch {
        setData(emptyDashboard)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [token])

  // Empty arrays for sections that previously used mock data
  const todayAppointments: TodayAppointment[] = []
  const followUpClients: FollowUpClient[] = []
  const expiringPolicies: ExpiringPolicy[] = []

  // --- Mobile Skeleton ---
  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-28 md:h-8 md:w-36" />
          <Skeleton className="h-4 w-32 hidden sm:block" />
        </div>

        {/* Mobile KPI scroll skeleton */}
        <div className="md:hidden">
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[130px]">
                <Card className="py-0">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-6 w-6 rounded-md" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                    <Skeleton className="h-6 w-12" />
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop KPI grid skeleton */}
        <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Mobile: Today's appointments skeleton */}
        <div className="md:hidden">
          <Skeleton className="h-6 w-40 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="py-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-12 rounded" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
          {Array.from({ length: isMobile ? 2 : 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-48 md:h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!data) return null

  const kpis = [
    { label: 'Total Clientes', value: data.kpis.totalClients.toLocaleString(), icon: Users, color: 'emerald', mobilePriority: true },
    { label: 'Citas Hoy', value: data.kpis.todayAppointments, icon: Calendar, color: 'teal', mobilePriority: true },
    { label: 'Pólizas Activas', value: data.kpis.activePolicies.toLocaleString(), icon: Shield, color: 'emerald', mobilePriority: true },
    { label: 'Por Vencer', value: data.kpis.expiringPolicies, icon: AlertTriangle, color: 'yellow', mobilePriority: true },
    { label: 'Tareas Pend.', value: data.kpis.pendingTasks, icon: CheckSquare, color: 'yellow', mobilePriority: true },
    { label: 'Leads Activos', value: data.kpis.activeLeads, icon: UserPlus, color: 'teal', mobilePriority: false },
    { label: 'Oportunidades', value: data.kpis.openOpportunities, icon: TrendingUp, color: 'emerald', mobilePriority: false },
    { label: 'Ingresos Est.', value: `€${(data.kpis.estimatedRevenue / 1000).toFixed(0)}K`, icon: DollarSign, color: 'emerald', mobilePriority: false },
    { label: 'En Riesgo', value: data.kpis.atRiskClients, icon: Heart, color: 'red', mobilePriority: false },
    { label: 'Conversión', value: `${(data.kpis.monthlyConversion * 100).toFixed(0)}%`, icon: Percent, color: 'teal', mobilePriority: false },
  ]

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    teal: 'bg-teal-50 text-teal-600',
    yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600',
  }

  const mobileKpis = kpis.filter(k => k.mobilePriority)
  const desktopKpis = kpis

  const chartHeight = isMobile ? 200 : 280

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-xs md:text-sm text-gray-500 hidden sm:block">Última actualización: Hoy</p>
      </div>

      {/* ===== MOBILE KPI CARDS (Horizontal Scroll) ===== */}
      <div className="md:hidden">
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
          {mobileKpis.map((kpi) => (
            <div key={kpi.label} className="flex-shrink-0 w-[130px]">
              <Card className="py-0 hover:shadow-md transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center ${colorMap[kpi.color]}`}>
                      <kpi.icon className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-500 leading-tight truncate">{kpi.label}</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>

      {/* ===== DESKTOP KPI GRID ===== */}
      <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {desktopKpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[kpi.color]}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ===== TODAY'S APPOINTMENTS (Mobile Priority) ===== */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CalendarCheck className="h-5 w-5 text-teal-600" />
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900">Citas de Hoy</h2>
          {todayAppointments.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{todayAppointments.length}</Badge>
          )}
        </div>

        {todayAppointments.length === 0 ? (
          <EmptyStateSection icon={Calendar} title="Todavía no hay citas programadas." />
        ) : (
          <>
            {/* Mobile: vertical card list */}
            <div className="md:hidden space-y-2">
              {todayAppointments.map((apt) => {
                const statusInfo = statusLabelMap[apt.status] || { label: apt.status, className: 'bg-gray-100 text-gray-700' }
                return (
                  <Card key={apt.id} className="py-0 hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-12 text-center">
                          <Clock className="h-4 w-4 text-gray-400 mx-auto mb-0.5" />
                          <span className="text-sm font-semibold text-gray-900">{apt.time}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{apt.title}</p>
                          <p className="text-xs text-gray-500 truncate">{apt.client}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${typeBadgeVariant[apt.type] || 'bg-gray-100 text-gray-700'}`}>
                            {apt.type}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desktop: horizontal cards / compact list */}
            <div className="hidden md:block">
              <Card className="py-0">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {todayAppointments.map((apt) => {
                      const statusInfo = statusLabelMap[apt.status] || { label: apt.status, className: 'bg-gray-100 text-gray-700' }
                      return (
                        <div key={apt.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex-shrink-0 w-16 text-center">
                            <span className="text-sm font-semibold text-gray-900">{apt.time}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{apt.title}</p>
                            <p className="text-xs text-gray-500">{apt.client}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${typeBadgeVariant[apt.type] || 'bg-gray-100 text-gray-700'}`}>
                            {apt.type}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* ===== CLIENTS NEEDING FOLLOW-UP ===== */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-amber-600" />
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900">Clientes para Seguimiento</h2>
          {followUpClients.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs">{followUpClients.length}</Badge>
          )}
        </div>

        {followUpClients.length === 0 ? (
          <EmptyStateSection icon={Bell} title="Todavía no hay clientes que requieran seguimiento." />
        ) : (
          <>
            {/* Mobile: vertical card list */}
            <div className="md:hidden space-y-2">
              {followUpClients.map((client) => {
                const statusInfo = statusLabelMap[client.status] || { label: client.status, className: 'bg-gray-100 text-gray-700' }
                return (
                  <Card key={client.id} className="py-0 hover:shadow-sm transition-shadow">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{client.name}</p>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${statusInfo.className}`}>
                              {statusInfo.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">{client.riskReason}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5">Último contacto: {client.lastContact}</p>
                        </div>
                        <Button variant="outline" size="sm" className="h-7 px-2 text-xs flex-shrink-0">
                          <Phone className="h-3 w-3 mr-1" />
                          Contactar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desktop: table-like layout */}
            <div className="hidden md:block">
              <Card className="py-0">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {followUpClients.map((client) => {
                      const statusInfo = statusLabelMap[client.status] || { label: client.status, className: 'bg-gray-100 text-gray-700' }
                      return (
                        <div key={client.id} className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{client.name}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusInfo.className}`}>
                            {statusInfo.label}
                          </span>
                          <span className="text-xs text-gray-500 w-36">{client.riskReason}</span>
                          <span className="text-xs text-gray-400 w-28">{client.lastContact}</span>
                          <Button variant="outline" size="sm" className="h-7 px-3 text-xs">
                            <Phone className="h-3 w-3 mr-1" />
                            Contactar
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* ===== POLICIES EXPIRING SOON ===== */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <FileWarning className="h-5 w-5 text-red-600" />
          <h2 className="text-lg md:text-2xl font-semibold text-gray-900">Pólizas por Vencer</h2>
          {expiringPolicies.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">{expiringPolicies.length}</Badge>
          )}
        </div>

        {expiringPolicies.length === 0 ? (
          <EmptyStateSection icon={Shield} title="Todavía no hay pólizas próximas a vencer." />
        ) : (
          <>
            {/* Mobile: vertical alert cards */}
            <div className="md:hidden space-y-2">
              {expiringPolicies.map((policy) => {
                const urgencyBadge = getUrgencyBadge(policy.daysRemaining)
                return (
                  <Card key={policy.id} className={`py-0 hover:shadow-sm transition-shadow ${getUrgencyClass(policy.daysRemaining)}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">{policy.client}</p>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium flex-shrink-0 ${urgencyBadge.className}`}>
                              {urgencyBadge.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">{policy.product}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[11px] text-gray-400">{policy.policyNumber}</span>
                            <span className="text-[11px] text-gray-400">Vence: {policy.expiryDate}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-lg font-bold ${policy.daysRemaining < 7 ? 'text-red-600' : policy.daysRemaining < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {policy.daysRemaining}
                          </p>
                          <p className="text-[10px] text-gray-400">días</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Desktop: compact table */}
            <div className="hidden md:block">
              <Card className="py-0">
                <CardContent className="p-0">
                  <div className="divide-y">
                    {expiringPolicies.map((policy) => {
                      const urgencyBadge = getUrgencyBadge(policy.daysRemaining)
                      return (
                        <div key={policy.id} className={`flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition-colors ${policy.daysRemaining < 7 ? 'bg-red-50/30' : policy.daysRemaining < 30 ? 'bg-amber-50/30' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{policy.client}</p>
                          </div>
                          <span className="text-xs text-gray-500 w-28">{policy.policyNumber}</span>
                          <span className="text-xs text-gray-600 w-32">{policy.product}</span>
                          <span className="text-xs text-gray-500 w-24">{policy.expiryDate}</span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium w-20 justify-center ${urgencyBadge.className}`}>
                            {urgencyBadge.label}
                          </span>
                          <div className="text-right w-16">
                            <p className={`text-sm font-bold ${policy.daysRemaining < 7 ? 'text-red-600' : policy.daysRemaining < 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {policy.daysRemaining}d
                            </p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 px-2">
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </section>

      {/* ===== CHARTS ===== */}
      {/* Mobile: Only 2 most important charts */}
      <div className="space-y-3 md:hidden">
        {data.leadsByMonth.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Leads por Mes</CardTitle>
              <CardDescription className="text-xs">Evolución mensual de leads</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data.leadsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} width={30} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <ChartEmptyState title="Leads por Mes" description="Evolución mensual de leads" />
        )}

        {data.upcomingRenewals.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Renovaciones Próximas</CardTitle>
              <CardDescription className="text-xs">Pólizas próximas a renovar</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={data.upcomingRenewals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={10} tickLine={false} />
                  <YAxis fontSize={10} tickLine={false} width={30} />
                  <Tooltip />
                  <Area type="monotone" dataKey="renewals" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <ChartEmptyState title="Renovaciones Próximas" description="Pólizas próximas a renovar" />
        )}
      </div>

      {/* Tablet: 2 columns */}
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Month */}
        {data.leadsByMonth.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Leads por Mes</CardTitle>
              <CardDescription>Evolución mensual de leads generados</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data.leadsByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <ChartEmptyState title="Leads por Mes" description="Evolución mensual de leads generados" />
        )}

        {/* Sales by Agent */}
        {data.salesByAgent.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ventas por Agente</CardTitle>
              <CardDescription>Rendimiento de ventas del equipo</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data.salesByAgent} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" fontSize={12} tickLine={false} />
                  <YAxis dataKey="agent" type="category" fontSize={12} tickLine={false} width={100} />
                  <Tooltip />
                  <Bar dataKey="sales" fill="#14b8a6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <ChartEmptyState title="Ventas por Agente" description="Rendimiento de ventas del equipo" />
        )}

        {/* Opportunities by Status */}
        {data.opportunitiesByStatus.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Oportunidades por Estado</CardTitle>
              <CardDescription>Distribución del pipeline actual</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <PieChart>
                  <Pie
                    data={data.opportunitiesByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                    label={({ status, count }) => `${status}: ${count}`}
                  >
                    {data.opportunitiesByStatus.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <ChartEmptyState title="Oportunidades por Estado" description="Distribución del pipeline actual" />
        )}

        {/* Renewals */}
        {data.upcomingRenewals.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Renovaciones Próximas</CardTitle>
              <CardDescription>Pólizas próximas a renovar</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <AreaChart data={data.upcomingRenewals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} />
                  <YAxis fontSize={12} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="renewals" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : (
          <ChartEmptyState title="Renovaciones Próximas" description="Pólizas próximas a renovar" />
        )}
      </div>

      {/* Appointments by Type - hidden on mobile, shown on desktop */}
      {!isMobile && (
        <>
          {data.appointmentsByType.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Citas por Tipo</CardTitle>
                <CardDescription>Distribución de citas por tipo de reunión</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.appointmentsByType}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="type" fontSize={12} tickLine={false} />
                    <YAxis fontSize={12} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <ChartEmptyState title="Citas por Tipo" description="Distribución de citas por tipo de reunión" />
          )}
        </>
      )}
    </div>
  )
}
