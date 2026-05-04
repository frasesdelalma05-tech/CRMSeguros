'use client'

import { useState, useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { api, type Client, type Policy, type Lead, type Interaction, type DocumentItem } from '@/lib/api'
import {
  ArrowLeft, Edit, Phone, Mail, Shield, TrendingUp, FileText, Heart, StickyNote,
  CheckCircle2, XCircle, Plus, MessageSquare, CalendarDays, CalendarPlus,
  ExternalLink, Clock, Eye, UserCircle,
} from 'lucide-react'

// Display types for the component
interface PolicyDisplay {
  id: string
  policyNumber: string
  product: string
  status: string
  premium: number
  endDate: string
  paymentMethod?: string
  startDate: string
  soldByAgentName?: string
  ownerAgentName?: string
}

interface OpportunityDisplay {
  id: string
  product: string
  premium: number
  probability: number
  status: string
  closeDate?: string
}

interface InteractionDisplay {
  id: string
  type: string
  description: string
  agentName: string
  date: string
}

interface DocumentDisplay {
  id: string
  name: string
  type: string
  date: string
  size: string
}

interface LoyaltyDisplay {
  loyaltyScore: number
  policyCount: number
  yearsAsClient: number
  lastInteraction: string
  recommendedAction: string
  isAtRisk: boolean
}

function mapApiPolicy(p: Policy): PolicyDisplay {
  return {
    id: p.id,
    policyNumber: p.policyNumber,
    product: p.productName || p.product?.name || '',
    status: p.status,
    premium: p.premium,
    endDate: p.endDate,
    paymentMethod: p.paymentMethod,
    startDate: p.startDate,
    soldByAgentName: p.soldByAgent ? `${p.soldByAgent.name} ${p.soldByAgent.lastName}` : undefined,
    ownerAgentName: p.ownerAgent ? `${p.ownerAgent.name} ${p.ownerAgent.lastName}` : undefined,
  }
}

function mapApiInteraction(i: Interaction): InteractionDisplay {
  return {
    id: i.id,
    type: i.type,
    description: i.notes,
    agentName: i.agent ? `${i.agent.name} ${i.agent.lastName}` : '',
    date: i.createdAt,
  }
}

function mapApiDocument(d: DocumentItem): DocumentDisplay {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    date: d.createdAt?.split('T')[0] || '',
    size: d.size ? `${(d.size / 1024 / 1024).toFixed(1)} MB` : '',
  }
}

// Format date in Spanish: "15 de enero de 2024"
function formatSpanishDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-'
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) return dateStr
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

const policyStatusColors: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-700',
  vencida: 'bg-red-100 text-red-700',
  cancelada: 'bg-gray-100 text-gray-700',
  en_renovacion: 'bg-amber-100 text-amber-700',
}

const oppStatusColors: Record<string, string> = {
  abierta: 'bg-blue-100 text-blue-700',
  en_progreso: 'bg-amber-100 text-amber-700',
  propuesta: 'bg-purple-100 text-purple-700',
  negociacion: 'bg-orange-100 text-orange-700',
  ganada: 'bg-emerald-100 text-emerald-700',
  perdida: 'bg-red-100 text-red-700',
}

const interactionIcons: Record<string, React.ElementType> = {
  llamada: Phone,
  email: Mail,
  reunion: MessageSquare,
  nota: StickyNote,
  whatsapp: MessageSquare,
}

const documentTypeIcons: Record<string, React.ElementType> = {
  poliza: Shield,
  contrato: FileText,
  identificacion: FileText,
  factura: FileText,
}

// Check if user can edit a client
function canEditClient(userRole: string, clientOwnerAgentId: string | undefined, userId: string): boolean {
  if (userRole === 'atencion_cliente' || userRole === 'solo_lectura') return false
  if (userRole === 'corredor') return clientOwnerAgentId === userId
  return true // admin, super_admin can always edit
}

// ─── Mobile Policy Card ──────────────────────────────────────────────────────
function MobilePolicyCard({ policy }: { policy: PolicyDisplay }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-gray-900 truncate">{policy.product}</p>
            <p className="text-xs text-gray-500">{policy.policyNumber}</p>
          </div>
          <Badge className={`${policyStatusColors[policy.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs shrink-0`}>
            {policy.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>Prima: <span className="font-medium text-gray-700">€{policy.premium}/año</span></span>
          <span>Vence: <span className="font-medium text-gray-700">{policy.endDate}</span></span>
        </div>
        {/* Sold by / Owner agent info */}
        <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
          {policy.soldByAgentName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <UserCircle className="h-3 w-3 shrink-0" />
              <span>Vendida por: <span className="font-medium text-gray-700">{policy.soldByAgentName}</span></span>
            </div>
          )}
          {policy.ownerAgentName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <Shield className="h-3 w-3 shrink-0" />
              <span>Responsable: <span className="font-medium text-gray-700">{policy.ownerAgentName}</span></span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mobile Opportunity Card ─────────────────────────────────────────────────
function MobileOpportunityCard({ opportunity }: { opportunity: OpportunityDisplay }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="font-semibold text-sm text-gray-900 truncate">{opportunity.product}</p>
          <Badge className={`${oppStatusColors[opportunity.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs shrink-0`}>
            {opportunity.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>Prima: <span className="font-medium text-gray-700">€{opportunity.premium}</span></span>
          <span>Prob.: <span className="font-medium text-gray-700">{opportunity.probability}%</span></span>
        </div>
        {opportunity.closeDate && (
          <p className="text-xs text-gray-400 mt-1">Cierre: {opportunity.closeDate}</p>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Mobile Document Card ────────────────────────────────────────────────────
function MobileDocumentCard({ doc }: { doc: DocumentDisplay }) {
  const Icon = documentTypeIcons[doc.type] || FileText
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
            <Icon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-sm text-gray-900 truncate">{doc.name}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <Badge variant="outline" className="text-[10px] h-5">{doc.type}</Badge>
              {doc.size && <span>{doc.size}</span>}
            </div>
          </div>
          <span className="text-xs text-gray-400 shrink-0">{doc.date}</span>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Mobile Quick Action Button ──────────────────────────────────────────────
function QuickActionButton({
  icon: Icon,
  label,
  href,
  onClick,
  colorClass,
}: {
  icon: React.ElementType
  label: string
  href?: string
  onClick?: () => void
  colorClass: string
}) {
  const cls = `flex flex-col items-center justify-center gap-1 rounded-xl p-3 min-h-[64px] min-w-[64px] transition-colors ${colorClass}`
  if (href) {
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel={href.startsWith('http') ? 'noopener noreferrer' : undefined} className={cls}>
        <Icon className="h-5 w-5" />
        <span className="text-[10px] font-medium">{label}</span>
      </a>
    )
  }
  return (
    <button onClick={onClick} className={cls}>
      <Icon className="h-5 w-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function ClientDetailPage() {
  const { selectedId, setPage, token, user } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()

  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [interactionOpen, setInteractionOpen] = useState(false)
  const [newInteraction, setNewInteraction] = useState({ type: 'nota', description: '' })
  const [interactions, setInteractions] = useState<InteractionDisplay[]>([])
  const [clientPolicies, setClientPolicies] = useState<PolicyDisplay[]>([])
  const [clientOpportunities, setClientOpportunities] = useState<OpportunityDisplay[]>([])
  const [clientDocuments, setClientDocuments] = useState<DocumentDisplay[]>([])
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyDisplay | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteText, setNoteText] = useState('')

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await api.getClient(selectedId!)
        const c = res.data
        setClient(c)

        // Map policies from API (embedded in client response or separate fetch)
        if (c.policies && c.policies.length > 0) {
          setClientPolicies(c.policies.map(mapApiPolicy))
        } else {
          setClientPolicies([])
        }

        // Map leads/opportunities from API
        if (c.leads && c.leads.length > 0) {
          setClientOpportunities(
            c.leads.map((l: Lead) => ({
              id: l.id,
              product: l.product || '',
              premium: l.estimatedPremium || 0,
              probability: l.probability,
              status: l.status,
              closeDate: l.closingDate,
            }))
          )
        } else {
          setClientOpportunities([])
        }

        // Loyalty
        if (c.loyaltyScore) {
          setLoyaltyData({
            loyaltyScore: c.loyaltyScore.score,
            policyCount: c.loyaltyScore.activePolicies,
            yearsAsClient: c.loyaltyScore.yearsAsClient,
            lastInteraction: c.loyaltyScore.lastContactDate || '',
            recommendedAction: c.loyaltyScore.recommendedActions || '',
            isAtRisk: c.loyaltyScore.isAtRisk,
          })
        } else {
          setLoyaltyData(null)
        }

        // Fetch interactions
        try {
          const intRes = await api.getInteractions({ clientId: c.id })
          setInteractions(intRes.data.map(mapApiInteraction))
        } catch {
          setInteractions([])
        }

        // Fetch documents
        try {
          const docRes = await api.getDocuments({ clientId: c.id })
          setClientDocuments(docRes.data.map(mapApiDocument))
        } catch {
          setClientDocuments([])
        }
      } catch {
        setClient(null)
      } finally {
        setLoading(false)
      }
    }
    if (selectedId) fetchClient()
  }, [selectedId, token])

  if (loading) {
    if (isMobile) {
      return (
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>
          {/* Actions skeleton */}
          <div className="flex gap-2">
            <Skeleton className="h-16 w-16 rounded-xl" />
            <Skeleton className="h-16 w-16 rounded-xl" />
            <Skeleton className="h-16 w-16 rounded-xl" />
            <Skeleton className="h-16 w-16 rounded-xl" />
          </div>
          {/* Tabs skeleton */}
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      )
    }
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cliente no encontrado</p>
        <Button variant="outline" onClick={() => setPage('clients')} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Clientes
        </Button>
      </div>
    )
  }

  const agentName = client.ownerAgent ? `${client.ownerAgent.name} ${client.ownerAgent.lastName}` : ''
  const agentPosition = (client.ownerAgent as { position?: string })?.position
  const agentEmail = (client.ownerAgent as { email?: string })?.email
  const clientTags = client.tags ? (typeof client.tags === 'string' ? client.tags.split(',').filter(Boolean) : client.tags) : []
  const clientLoyaltyScore = client.loyaltyScore?.score ?? 0
  const clientIsAtRisk = client.loyaltyScore?.isAtRisk ?? false
  const rgpdDate = client.rgpdConsentDate || ''
  const phoneClean = client.phone?.replace(/\D/g, '') || ''
  const statusColors: Record<string, string> = {
    activo: 'bg-emerald-100 text-emerald-700',
    inactivo: 'bg-gray-100 text-gray-700',
    prospecto: 'bg-amber-100 text-amber-700',
  }
  const initials = `${client.name.charAt(0)}${client.lastName.charAt(0)}`
  const canEdit = user ? canEditClient(user.role, client.ownerAgentId, user.id) : false
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const createdDateFormatted = formatSpanishDate(client.createdAt)

  const handleAddInteraction = () => {
    const interaction: InteractionDisplay = {
      id: Date.now().toString(),
      type: newInteraction.type,
      description: newInteraction.description,
      agentName: user ? `${user.name} ${user.lastName}` : '',
      date: new Date().toISOString(),
    }
    setInteractions((prev) => [interaction, ...prev])
    setInteractionOpen(false)
    setNewInteraction({ type: 'nota', description: '' })
    toast({ title: 'Interacción registrada' })
  }

  const handleSaveNote = () => {
    setNoteOpen(false)
    toast({ title: 'Nota guardada' })
    setNoteText('')
  }

  // ─── Mobile View ──────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="space-y-4 -mx-3 px-3">
        {/* Back + header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 -ml-2" onClick={() => setPage('clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">
              {client.name} {client.lastName}
            </h1>
            <p className="text-xs text-gray-500 truncate">{client.documentType || 'DNI'}: {client.documentNumber || '-'}</p>
          </div>
          {canEdit ? (
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setEditOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
          ) : (
            <Badge variant="outline" className="text-xs text-gray-400 border-gray-200">
              <Eye className="h-3 w-3 mr-1" /> Solo lectura
            </Badge>
          )}
        </div>

        {/* Profile Card: Avatar + Status + RGPD + Loyalty */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 shrink-0">
                <AvatarFallback className="bg-emerald-600 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`${statusColors[client.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>
                    {client.status}
                  </Badge>
                  {client.rgpdConsent ? (
                    <Badge className="bg-emerald-50 text-emerald-700 border-0 text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> RGPD
                    </Badge>
                  ) : (
                    <Badge className="bg-red-50 text-red-600 border-0 text-xs">
                      <XCircle className="h-3 w-3 mr-1" /> RGPD
                    </Badge>
                  )}
                </div>
                {clientIsAtRisk && (
                  <Badge className="bg-red-100 text-red-700 border-0 text-xs mb-1">
                    Cliente en riesgo
                  </Badge>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Heart className={`h-4 w-4 ${clientIsAtRisk ? 'text-red-400' : 'text-emerald-500'}`} />
                  <span className="text-sm font-bold text-gray-900">{clientLoyaltyScore}</span>
                  <Progress value={clientLoyaltyScore} className="h-1.5 flex-1 max-w-[80px]" />
                </div>
              </div>
            </div>

            {/* RGPD detail */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              {client.rgpdConsent ? (
                <div className="flex items-center gap-1.5 text-emerald-600 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Consentimiento RGPD{rgpdDate ? ` (${rgpdDate})` : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-red-500 text-xs">
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Pendiente de consentimiento RGPD</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Action Buttons */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-1 px-1 pb-1">
          {client.phone && (
            <QuickActionButton
              icon={Phone}
              label="Llamar"
              href={`tel:${client.phone}`}
              colorClass="bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            />
          )}
          {phoneClean && (
            <QuickActionButton
              icon={MessageSquare}
              label="WhatsApp"
              href={`https://wa.me/${phoneClean}`}
              colorClass="bg-green-50 text-green-700 hover:bg-green-100"
            />
          )}
          {client.email && (
            <QuickActionButton
              icon={Mail}
              label="Email"
              href={`mailto:${client.email}`}
              colorClass="bg-sky-50 text-sky-700 hover:bg-sky-100"
            />
          )}
          <QuickActionButton
            icon={CalendarPlus}
            label="Cita"
            onClick={() => toast({ title: 'Programar cita', description: 'Funcionalidad de programación de citas' })}
            colorClass="bg-amber-50 text-amber-700 hover:bg-amber-100"
          />
          <QuickActionButton
            icon={StickyNote}
            label="Nota"
            onClick={() => setNoteOpen(true)}
            colorClass="bg-purple-50 text-purple-700 hover:bg-purple-100"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="resumen" className="w-full">
          <TabsList className="w-full h-auto flex overflow-x-auto scrollbar-none gap-0 p-0 bg-gray-100 rounded-lg">
            <TabsTrigger value="resumen" className="flex-1 min-w-[60px] text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
              Resumen
            </TabsTrigger>
            <TabsTrigger value="policies" className="flex-1 min-w-[60px] text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
              Pólizas
            </TabsTrigger>
            <TabsTrigger value="opportunities" className="flex-1 min-w-[60px] text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
              Oport.
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex-1 min-w-[60px] text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
              Historial
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex-1 min-w-[60px] text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
              Docs
            </TabsTrigger>
            <TabsTrigger value="loyalty" className="flex-1 min-w-[60px] text-xs px-2 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
              Fidel.
            </TabsTrigger>
          </TabsList>

          {/* Resumen Tab */}
          <TabsContent value="resumen" className="mt-3">
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <a href={`mailto:${client.email}`} className="text-sm font-medium text-emerald-700 truncate block" onClick={(e) => e.stopPropagation()}>
                      {client.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Teléfono</p>
                    <a href={`tel:${client.phone}`} className="text-sm font-medium text-emerald-700" onClick={(e) => e.stopPropagation()}>
                      {client.phone || '-'}
                    </a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Documento</p>
                    <p className="text-sm font-medium text-gray-900">{client.documentType || 'DNI'}: {client.documentNumber || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Creado el</p>
                    <p className="text-sm font-medium text-gray-900">{createdDateFormatted}</p>
                  </div>
                </div>

                {/* Corredor responsable */}
                {agentName && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Corredor responsable</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                            {agentName.charAt(0)}{(client.ownerAgent?.lastName || '').charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{agentName}</p>
                          {agentPosition && (
                            <p className="text-xs text-gray-500">{agentPosition}</p>
                          )}
                          {agentEmail && (
                            <a href={`mailto:${agentEmail}`} className="text-xs text-emerald-700 truncate block" onClick={(e) => e.stopPropagation()}>
                              {agentEmail}
                            </a>
                          )}
                        </div>
                        {isAdminOrSuperAdmin && client.ownerAgentId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="ml-auto text-xs text-emerald-700 h-7 px-2"
                            onClick={() => {
                              useAppStore.getState().setPage('admin')
                            }}
                          >
                            Ver cartera
                          </Button>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {clientTags.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Etiquetas</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {clientTags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {client.observations && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Observaciones</p>
                      <p className="text-sm text-gray-700">{client.observations}</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policies Tab */}
          <TabsContent value="policies" className="mt-3">
            {clientPolicies.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Todavía no hay pólizas registradas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {clientPolicies.map((p) => (
                  <MobilePolicyCard key={p.id} policy={p} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="mt-3">
            {clientOpportunities.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Todavía no hay oportunidades registradas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {clientOpportunities.map((o) => (
                  <MobileOpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Interactions Tab (Timeline) */}
          <TabsContent value="interactions" className="mt-3">
            {canEdit && (
              <div className="flex justify-end mb-2">
                <Button size="sm" onClick={() => setInteractionOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                  <Plus className="mr-1 h-3.5 w-3.5" /> Añadir
                </Button>
              </div>
            )}
            {interactions.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Todavía no hay interacciones registradas.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-100" />
                <div className="space-y-0">
                  {interactions.map((i) => {
                    const Icon = interactionIcons[i.type] || StickyNote
                    return (
                      <div key={i.id} className="relative flex gap-3 p-3">
                        <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-100 flex items-center justify-center shrink-0 z-10">
                          <Icon className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0 bg-white rounded-lg border border-gray-100 p-3">
                          <p className="text-sm text-gray-900">{i.description}</p>
                          <p className="text-[10px] text-gray-400 mt-1">
                            {i.agentName} · {i.type} · {i.date ? new Date(i.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents" className="mt-3">
            {clientDocuments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Todavía no hay documentos.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {clientDocuments.map((d) => (
                  <MobileDocumentCard key={d.id} doc={d} />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Loyalty Tab */}
          <TabsContent value="loyalty" className="mt-3">
            {loyaltyData ? (
              <div className="space-y-3">
                <Card>
                  <CardContent className="p-4 text-center">
                    <Heart className={`h-6 w-6 mx-auto mb-2 ${clientIsAtRisk ? 'text-red-400' : 'text-emerald-500'}`} />
                    <div className="text-3xl font-bold text-emerald-600">{loyaltyData.loyaltyScore}</div>
                    <p className="text-xs text-gray-500 mt-1">Score de Fidelización</p>
                    <Progress value={loyaltyData.loyaltyScore} className="mt-3 h-2" />
                    {clientIsAtRisk && (
                      <Badge className="bg-red-100 text-red-700 border-0 mt-3">Cliente en riesgo</Badge>
                    )}
                  </CardContent>
                </Card>
                <div className="grid grid-cols-2 gap-2">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold text-gray-700">{loyaltyData.policyCount}</p>
                      <p className="text-xs text-gray-500">Pólizas</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xl font-bold text-gray-700">{loyaltyData.yearsAsClient}</p>
                      <p className="text-xs text-gray-500">Años</p>
                    </CardContent>
                  </Card>
                </div>
                {loyaltyData.recommendedAction && (
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-emerald-700 mb-1">Acción recomendada</p>
                      <p className="text-sm text-gray-600">{loyaltyData.recommendedAction}</p>
                    </CardContent>
                  </Card>
                )}
                {loyaltyData.lastInteraction && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Última interacción: {loyaltyData.lastInteraction}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm text-gray-500">Todavía no hay datos de fidelización.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Note Dialog */}
        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Nota</DialogTitle>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Nota</Label>
              <Textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Escribe una nota..." />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveNote} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        {canEdit && (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nombre</Label><Input defaultValue={client.name} /></div>
                  <div className="space-y-2"><Label>Apellido</Label><Input defaultValue={client.lastName} /></div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input defaultValue={client.email} /></div>
                <div className="space-y-2"><Label>Teléfono</Label><Input defaultValue={client.phone} /></div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
                <Button onClick={() => { setEditOpen(false); toast({ title: 'Cliente actualizado' }) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Add Interaction Dialog */}
        <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Interacción</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newInteraction.type} onValueChange={(v) => setNewInteraction({ ...newInteraction, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="llamada">Llamada</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="reunion">Reunión</SelectItem>
                    <SelectItem value="nota">Nota</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descripción</Label>
                <Textarea value={newInteraction.description} onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInteractionOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddInteraction} className="bg-emerald-600 hover:bg-emerald-700 text-white">Registrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // ─── Desktop / Tablet View ────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setPage('clients')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{client.name} {client.lastName}</h1>
          <p className="text-sm text-gray-500">{client.documentType || 'DNI'}: {client.documentNumber}</p>
        </div>
        {canEdit ? (
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </Button>
        ) : (
          <Badge variant="outline" className="text-sm text-gray-400 border-gray-200 px-3 py-1.5">
            <Eye className="h-4 w-4 mr-1.5" /> Solo lectura
          </Badge>
        )}
      </div>

      {/* Client Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Información del Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium">{client.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Teléfono</p>
                <p className="text-sm font-medium">{client.phone}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Estado</p>
                <Badge className={`${statusColors[client.status] || 'bg-gray-100 text-gray-700'} border-0 mt-1`}>{client.status}</Badge>
              </div>
              <div>
                <p className="text-xs text-gray-500">Documento</p>
                <p className="text-sm font-medium">{client.documentType || 'DNI'}: {client.documentNumber || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Etiquetas</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {clientTags.length > 0 ? clientTags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-[10px]">{tag}</Badge>
                  )) : <span className="text-sm text-gray-400">-</span>}
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500">Creado el</p>
                <p className="text-sm font-medium">{createdDateFormatted}</p>
              </div>
            </div>
            <Separator className="my-4" />

            {/* Corredor responsable */}
            {agentName && (
              <div className="flex items-center gap-3 mb-4">
                <p className="text-xs text-gray-500 shrink-0">Corredor responsable:</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-bold">
                      {agentName.charAt(0)}{(client.ownerAgent?.lastName || '').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{agentName}</p>
                    {(agentPosition || agentEmail) && (
                      <p className="text-xs text-gray-500">
                        {agentPosition}{agentPosition && agentEmail ? ' · ' : ''}{agentEmail}
                      </p>
                    )}
                  </div>
                  {isAdminOrSuperAdmin && client.ownerAgentId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2 text-xs text-emerald-700 h-7 px-2"
                      onClick={() => {
                        useAppStore.getState().setPage('admin')
                      }}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" /> Ver cartera
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <p className="text-xs text-gray-500">RGPD:</p>
              {client.rgpdConsent ? (
                <div className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">Consentimiento otorgado{rgpdDate ? ` (${rgpdDate})` : ''}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs font-medium">Pendiente de consentimiento</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Loyalty Score */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Heart className="h-4 w-4 text-emerald-500" /> Fidelización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-emerald-600">{clientLoyaltyScore}</div>
              <p className="text-xs text-gray-500 mt-1">Score de Fidelización</p>
              <Progress value={clientLoyaltyScore} className="mt-3 h-2" />
              {clientIsAtRisk && (
                <Badge className="bg-red-100 text-red-700 border-0 mt-3">Cliente en riesgo</Badge>
              )}
              {loyaltyData && loyaltyData.recommendedAction && (
                <p className="text-xs text-gray-500 mt-3">{loyaltyData.recommendedAction}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies"><Shield className="mr-1 h-4 w-4" /> Pólizas</TabsTrigger>
          <TabsTrigger value="opportunities"><TrendingUp className="mr-1 h-4 w-4" /> Oportunidades</TabsTrigger>
          <TabsTrigger value="interactions"><MessageSquare className="mr-1 h-4 w-4" /> Interacciones</TabsTrigger>
          <TabsTrigger value="documents"><FileText className="mr-1 h-4 w-4" /> Documentos</TabsTrigger>
          <TabsTrigger value="loyalty"><Heart className="mr-1 h-4 w-4" /> Fidelización</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {clientPolicies.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  Todavía no hay pólizas registradas.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº Póliza</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Vendida por</TableHead>
                      <TableHead>Responsable actual</TableHead>
                      <TableHead>Prima anual</TableHead>
                      <TableHead>Vencimiento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientPolicies.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.policyNumber}</TableCell>
                        <TableCell>{p.product}</TableCell>
                        <TableCell><Badge className={`${policyStatusColors[p.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{p.status}</Badge></TableCell>
                        <TableCell>
                          {p.soldByAgentName ? (
                            <span className="text-sm">{p.soldByAgentName}</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.ownerAgentName ? (
                            <span className="text-sm">{p.ownerAgentName}</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>€{p.premium}/año</TableCell>
                        <TableCell>{p.endDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {clientOpportunities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  Todavía no hay oportunidades registradas.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Prima</TableHead>
                      <TableHead>Prob.</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Fecha Cierre</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientOpportunities.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">{o.product}</TableCell>
                        <TableCell>€{o.premium}</TableCell>
                        <TableCell>{o.probability}%</TableCell>
                        <TableCell><Badge className={`${oppStatusColors[o.status] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{o.status}</Badge></TableCell>
                        <TableCell>{o.closeDate || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="interactions" className="mt-4">
          {canEdit && (
            <div className="flex justify-end mb-4">
              <Button size="sm" onClick={() => setInteractionOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Plus className="mr-1 h-4 w-4" /> Añadir Interacción
              </Button>
            </div>
          )}
          <Card>
            <CardContent className="p-0">
              {interactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  Todavía no hay interacciones registradas.
                </div>
              ) : (
                <div className="divide-y">
                  {interactions.map((i) => {
                    const Icon = interactionIcons[i.type] || StickyNote
                    return (
                      <div key={i.id} className="flex gap-3 p-4">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                          <Icon className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">{i.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {i.agentName} · {i.type} · {i.date}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {clientDocuments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  Todavía no hay documentos.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Tamaño</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clientDocuments.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-medium">{d.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{d.type}</Badge></TableCell>
                        <TableCell>{d.date}</TableCell>
                        <TableCell>{d.size}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="loyalty" className="mt-4">
          <Card>
            <CardContent className="p-6">
              {loyaltyData ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-emerald-50 rounded-lg">
                      <p className="text-2xl font-bold text-emerald-600">{loyaltyData.loyaltyScore}</p>
                      <p className="text-xs text-gray-500">Score</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-700">{loyaltyData.policyCount}</p>
                      <p className="text-xs text-gray-500">Pólizas</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-700">{loyaltyData.yearsAsClient}</p>
                      <p className="text-xs text-gray-500">Años</p>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <p className="text-2xl font-bold text-gray-700">{loyaltyData.lastInteraction}</p>
                      <p className="text-xs text-gray-500">Última interacción</p>
                    </div>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-lg">
                    <p className="text-sm font-medium text-emerald-700">Acción recomendada</p>
                    <p className="text-sm text-gray-600 mt-1">{loyaltyData.recommendedAction}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Heart className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  Todavía no hay datos de fidelización.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      {canEdit && (
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Cliente</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Nombre</Label><Input defaultValue={client.name} /></div>
                <div className="space-y-2"><Label>Apellido</Label><Input defaultValue={client.lastName} /></div>
              </div>
              <div className="space-y-2"><Label>Email</Label><Input defaultValue={client.email} /></div>
              <div className="space-y-2"><Label>Teléfono</Label><Input defaultValue={client.phone} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
              <Button onClick={() => { setEditOpen(false); toast({ title: 'Cliente actualizado' }) }} className="bg-emerald-600 hover:bg-emerald-700 text-white">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Interaction Dialog */}
      <Dialog open={interactionOpen} onOpenChange={setInteractionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Interacción</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={newInteraction.type} onValueChange={(v) => setNewInteraction({ ...newInteraction, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="llamada">Llamada</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="reunion">Reunión</SelectItem>
                  <SelectItem value="nota">Nota</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea value={newInteraction.description} onChange={(e) => setNewInteraction({ ...newInteraction, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInteractionOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddInteraction} className="bg-emerald-600 hover:bg-emerald-700 text-white">Registrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
