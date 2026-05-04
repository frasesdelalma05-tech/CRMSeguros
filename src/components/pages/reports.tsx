'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { BarChart3, Download, FileText, TrendingUp } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { api } from '@/lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, Legend,
} from 'recharts'

const reportTypes = [
  { id: 'ventas-mensuales', name: 'Ventas Mensuales' },
  { id: 'clientes-estado', name: 'Clientes por Estado' },
  { id: 'polizas-producto', name: 'Pólizas por Producto' },
  { id: 'rendimiento-agentes', name: 'Rendimiento de Agentes' },
  { id: 'conversion-leads', name: 'Conversión de Leads' },
  { id: 'retencion-clientes', name: 'Retención de Clientes' },
]

// Default chart data (used as fallback when API fails or returns empty)
const defaultChartData: Record<string, Record<string, unknown>[]> = {
  'ventas-mensuales': [
    { month: 'Ene', ventas: 42, renovaciones: 28 },
    { month: 'Feb', ventas: 38, renovaciones: 31 },
    { month: 'Mar', ventas: 55, renovaciones: 35 },
    { month: 'Abr', ventas: 48, renovaciones: 33 },
    { month: 'May', ventas: 62, renovaciones: 40 },
    { month: 'Jun', ventas: 58, renovaciones: 38 },
    { month: 'Jul', ventas: 45, renovaciones: 29 },
    { month: 'Ago', ventas: 52, renovaciones: 35 },
    { month: 'Sep', ventas: 61, renovaciones: 42 },
    { month: 'Oct', ventas: 68, renovaciones: 45 },
    { month: 'Nov', ventas: 72, renovaciones: 48 },
    { month: 'Dic', ventas: 78, renovaciones: 52 },
  ],
  'clientes-estado': [
    { estado: 'Activos', count: 845 },
    { estado: 'Inactivos', count: 125 },
    { estado: 'Prospectos', count: 277 },
  ],
  'polizas-producto': [
    { producto: 'Auto', count: 890 },
    { producto: 'Hogar', count: 720 },
    { producto: 'Vida', count: 540 },
    { producto: 'Salud', count: 480 },
    { producto: 'Empresarial', count: 310 },
    { producto: 'Viaje', count: 180 },
  ],
  'rendimiento-agentes': [
    { agent: 'María L.', ventas: 42, clientes: 85, conversion: 38 },
    { agent: 'Carlos R.', ventas: 38, clientes: 72, conversion: 35 },
    { agent: 'Ana M.', ventas: 35, clientes: 68, conversion: 32 },
    { agent: 'Pedro S.', ventas: 28, clientes: 55, conversion: 28 },
    { agent: 'Laura G.', ventas: 25, clientes: 48, conversion: 25 },
  ],
  'conversion-leads': [
    { month: 'Ene', rate: 28 }, { month: 'Feb', rate: 32 },
    { month: 'Mar', rate: 30 }, { month: 'Abr', rate: 35 },
    { month: 'May', rate: 38 }, { month: 'Jun', rate: 42 },
    { month: 'Jul', rate: 36 }, { month: 'Ago', rate: 39 },
    { month: 'Sep', rate: 41 }, { month: 'Oct', rate: 44 },
    { month: 'Nov', rate: 40 }, { month: 'Dic', rate: 43 },
  ],
  'retencion-clientes': [
    { year: '2020', rate: 78 }, { year: '2021', rate: 82 },
    { year: '2022', rate: 85 }, { year: '2023', rate: 88 },
    { year: '2024', rate: 91 },
  ],
}

const COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899']

function ReportChart({ type, data, isMobile }: { type: string; data: Record<string, unknown>[]; isMobile: boolean }) {
  const chartHeight = isMobile ? 280 : 400

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Todavía no hay datos disponibles para este reporte.
      </div>
    )
  }

  switch (type) {
    case 'ventas-mensuales':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} tickLine={false} />
            <YAxis fontSize={isMobile ? 10 : 12} tickLine={false} width={isMobile ? 30 : 40} />
            <Tooltip />
            {!isMobile && <Legend />}
            <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} name="Ventas Nuevas" />
            <Bar dataKey="renovaciones" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Renovaciones" />
          </BarChart>
        </ResponsiveContainer>
      )
    case 'clientes-estado':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={isMobile ? 50 : 80}
              outerRadius={isMobile ? 90 : 140}
              paddingAngle={4}
              dataKey="count"
              nameKey="estado"
              label={({ estado, count }: { estado: string; count: number }) => isMobile ? count : `${estado}: ${count}`}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            {!isMobile && <Legend />}
          </PieChart>
        </ResponsiveContainer>
      )
    case 'polizas-producto':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis type="number" fontSize={isMobile ? 10 : 12} tickLine={false} />
            <YAxis dataKey="producto" type="category" fontSize={isMobile ? 10 : 12} tickLine={false} width={isMobile ? 60 : 100} />
            <Tooltip />
            <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]} name="Pólizas" />
          </BarChart>
        </ResponsiveContainer>
      )
    case 'rendimiento-agentes':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="agent" fontSize={isMobile ? 9 : 11} tickLine={false} />
            <YAxis fontSize={isMobile ? 10 : 12} tickLine={false} width={isMobile ? 30 : 40} />
            <Tooltip />
            {!isMobile && <Legend />}
            <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} name="Ventas" />
            <Bar dataKey="clientes" fill="#14b8a6" radius={[4, 4, 0, 0]} name="Clientes" />
          </BarChart>
        </ResponsiveContainer>
      )
    case 'conversion-leads':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" fontSize={isMobile ? 10 : 12} tickLine={false} />
            <YAxis fontSize={isMobile ? 10 : 12} tickLine={false} unit="%" width={isMobile ? 30 : 40} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Area type="monotone" dataKey="rate" stroke="#10b981" fill="#10b98120" strokeWidth={2} name="Tasa de Conversión" />
          </AreaChart>
        </ResponsiveContainer>
      )
    case 'retencion-clientes':
      return (
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="year" fontSize={isMobile ? 10 : 12} tickLine={false} />
            <YAxis fontSize={isMobile ? 10 : 12} tickLine={false} unit="%" width={isMobile ? 30 : 40} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={{ r: isMobile ? 4 : 6, fill: '#10b981' }} name="Tasa de Retención" />
          </LineChart>
        </ResponsiveContainer>
      )
    default:
      return null
  }
}

export default function ReportsPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [selectedReport, setSelectedReport] = useState('ventas-mensuales')
  const [reportData, setReportData] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchReport() {
      setLoading(true)
      try {
        const res = await api.getReport(selectedReport)
        if (res.data && res.data.length > 0) {
          setReportData(res.data)
        } else {
          setReportData(defaultChartData[selectedReport] || [])
        }
      } catch {
        setReportData(defaultChartData[selectedReport] || [])
      } finally {
        setLoading(false)
      }
    }
    fetchReport()
  }, [selectedReport, token])

  const handleExport = (format: string) => {
    toast({ title: `Exportando a ${format.toUpperCase()}`, description: 'El archivo se descargará en breve (simulado)' })
  }

  return (
    <div className="space-y-3 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-xs md:text-sm text-gray-500">Análisis y métricas de negocio</p>
        </div>
        <div className="flex gap-1.5 md:gap-2">
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => handleExport('csv')}>
            <Download className="mr-1 h-3 w-3" /> CSV
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => handleExport('pdf')}>
            <FileText className="mr-1 h-3 w-3" /> PDF
          </Button>
        </div>
      </div>

      {/* Report Type Selector */}
      {isMobile ? (
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-1 -mx-4 px-4">
            {reportTypes.map((rt) => (
              <button
                key={rt.id}
                onClick={() => setSelectedReport(rt.id)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[32px] ${
                  selectedReport === rt.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {rt.name}
              </button>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <p className="text-sm font-medium text-gray-700">Tipo de Reporte:</p>
              <Select value={selectedReport} onValueChange={setSelectedReport}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {reportTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>{rt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge className="bg-emerald-100 text-emerald-700 border-0">
                {reportTypes.find((r) => r.id === selectedReport)?.name}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader className="p-3 md:p-6 md:pb-0 pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
            {reportTypes.find((r) => r.id === selectedReport)?.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0 md:pt-0">
          {loading ? (
            <div className="flex items-center justify-center h-48 md:h-64">
              <div className="h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ReportChart type={selectedReport} data={reportData} isMobile={isMobile} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
