'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type LoyaltyScore } from '@/lib/api'
import { Heart, Search, AlertTriangle, Star, Shield, Users } from 'lucide-react'

// Display type
interface LoyaltyDisplay {
  id: string
  clientName: string
  loyaltyScore: number
  isAtRisk: boolean
  policyCount: number
  yearsAsClient: number
  lastInteraction: string
  recommendedAction: string
}

function mapApiLoyalty(l: LoyaltyScore): LoyaltyDisplay {
  return {
    id: l.clientId || l.id,
    clientName: l.client ? `${l.client.name} ${l.client.lastName}` : '',
    loyaltyScore: l.score,
    isAtRisk: l.isAtRisk,
    policyCount: l.activePolicies,
    yearsAsClient: l.yearsAsClient,
    lastInteraction: l.lastContactDate || '',
    recommendedAction: l.recommendedActions || '',
  }
}



export default function LoyaltyPage() {
  const { token } = useAppStore()
  const isMobile = useIsMobile()
  const [clients, setClients] = useState<LoyaltyDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [riskFilter, setRiskFilter] = useState('all')
  const [scoreRange, setScoreRange] = useState('all')

  useEffect(() => {
    async function fetchLoyalty() {
      try {
        const res = await api.getLoyaltyScores()
        setClients(res.data.map(mapApiLoyalty))
      } catch {
        setClients([])
      } finally {
        setLoading(false)
      }
    }
    fetchLoyalty()
  }, [token])

  const filtered = clients.filter((c) => {
    const matchesSearch = c.clientName.toLowerCase().includes(search.toLowerCase())
    const matchesRisk = riskFilter === 'all' || (riskFilter === 'risk' && c.isAtRisk) || (riskFilter === 'safe' && !c.isAtRisk)
    const matchesScore = scoreRange === 'all' ||
      (scoreRange === 'high' && c.loyaltyScore >= 70) ||
      (scoreRange === 'medium' && c.loyaltyScore >= 40 && c.loyaltyScore < 70) ||
      (scoreRange === 'low' && c.loyaltyScore < 40)
    return matchesSearch && matchesRisk && matchesScore
  })

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-600'
    if (score >= 40) return 'text-amber-600'
    return 'text-red-600'
  }

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-500'
    if (score >= 40) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 70) return 'Alto'
    if (score >= 40) return 'Medio'
    return 'Bajo'
  }

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div>
          <Skeleton className="h-7 w-32 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}><CardContent className="p-3 md:p-4"><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-lg" /><div><Skeleton className="h-3 w-16 mb-1" /><Skeleton className="h-6 w-12" /></div></div></CardContent></Card>
          ))}
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-3"><Skeleton className="h-16 w-full" /></CardContent></Card>
        ))}
      </div>
    )
  }

  const avgScore = clients.length > 0 ? Math.round(clients.reduce((acc, c) => acc + c.loyaltyScore, 0) / clients.length) : 0
  const atRiskCount = clients.filter((c) => c.isAtRisk).length

  return (
    <div className="space-y-3 md:space-y-6">
      <div>
        <h1 className="text-lg md:text-2xl font-bold text-gray-900">Fidelización</h1>
        <p className="text-xs md:text-sm text-gray-500">Análisis y gestión de la fidelización de clientes</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4">
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Star className="h-4 w-4 md:h-6 md:w-6 text-emerald-600" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-gray-500">Score Medio</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{avgScore}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4">
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-4 w-4 md:h-6 md:w-6 text-red-600" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-gray-500">En Riesgo</p>
                <p className="text-lg md:text-2xl font-bold text-red-600">{atRiskCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-2 md:gap-4">
              <div className="w-9 h-9 md:w-12 md:h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                <Heart className="h-4 w-4 md:h-6 md:w-6 text-emerald-600" />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[10px] md:text-sm text-gray-500">Total</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900">{clients.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-2 md:space-y-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar clientes..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="h-9 text-xs flex-1 md:flex-none md:w-40 md:h-10 md:text-sm"><SelectValue placeholder="Riesgo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="risk">En Riesgo</SelectItem>
              <SelectItem value="safe">Seguros</SelectItem>
            </SelectContent>
          </Select>
          <Select value={scoreRange} onValueChange={setScoreRange}>
            <SelectTrigger className="h-9 text-xs flex-1 md:flex-none md:w-40 md:h-10 md:text-sm"><SelectValue placeholder="Score" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="high">Alto (70+)</SelectItem>
              <SelectItem value="medium">Medio (40-69)</SelectItem>
              <SelectItem value="low">Bajo (&lt;40)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mobile: Card list */}
      {isMobile ? (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Heart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Todavía no hay datos de fidelización.</p>
                <p className="text-xs text-gray-400">Prueba ajustando los filtros</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((c) => (
              <Card key={c.id} className={c.isAtRisk ? 'border-red-200 bg-red-50/30' : ''}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{c.clientName}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-lg font-bold ${getScoreColor(c.loyaltyScore)}`}>{c.loyaltyScore}</span>
                        <Badge className={`${getScoreBg(c.loyaltyScore)} text-white border-0 text-[10px]`}>
                          {getScoreLabel(c.loyaltyScore)}
                        </Badge>
                      </div>
                    </div>
                    {c.isAtRisk ? (
                      <Badge className="bg-red-100 text-red-700 border-0 text-[10px] shrink-0">
                        <AlertTriangle className="mr-1 h-3 w-3" /> En riesgo
                      </Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] shrink-0">Seguro</Badge>
                    )}
                  </div>
                  <Progress value={c.loyaltyScore} className="h-1.5 mb-2" />
                  <div className="flex items-center gap-3 text-[11px] text-gray-400">
                    <span>{c.policyCount} pólizas</span>
                    <span>·</span>
                    <span>{c.yearsAsClient} años</span>
                    {c.recommendedAction && (
                      <>
                        <span>·</span>
                        <span className="truncate text-emerald-600">{c.recommendedAction}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Desktop: Table */
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Nivel</TableHead>
                  <TableHead className="hidden md:table-cell">Pólizas</TableHead>
                  <TableHead className="hidden md:table-cell">Años</TableHead>
                  <TableHead>Riesgo</TableHead>
                  <TableHead className="hidden lg:table-cell">Acción Recomendada</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id} className={c.isAtRisk ? 'bg-red-50/50' : ''}>
                    <TableCell className="font-medium">{c.clientName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${getScoreColor(c.loyaltyScore)}`}>{c.loyaltyScore}</span>
                        <Progress value={c.loyaltyScore} className="w-16 h-2" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${getScoreBg(c.loyaltyScore)} text-white border-0 text-[10px]`}>
                        {getScoreLabel(c.loyaltyScore)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">{c.policyCount}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">{c.yearsAsClient}</TableCell>
                    <TableCell>
                      {c.isAtRisk ? (
                        <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" /> En riesgo
                        </Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Seguro</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-gray-500 max-w-[200px] truncate">{c.recommendedAction}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
