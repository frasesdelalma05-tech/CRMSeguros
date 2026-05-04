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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
// mock-data removed
import { api, type DocumentItem } from '@/lib/api'
import { Upload, Search, FileText, Download, FolderOpen } from 'lucide-react'

// Display type
interface DocumentDisplay {
  id: string
  name: string
  type: string
  clientId?: string
  clientName: string
  policyId?: string
  policyNumber?: string
  date: string
  size: string
  createdAt: string
}

function mapApiDocument(d: DocumentItem): DocumentDisplay {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    clientId: d.clientId,
    clientName: d.client ? `${d.client.name} ${d.client.lastName}` : '',
    policyId: d.policyId,
    policyNumber: undefined,
    date: d.createdAt?.split('T')[0] || '',
    size: d.size ? `${(d.size / 1024 / 1024).toFixed(1)} MB` : '',
    createdAt: d.createdAt,
  }
}



const typeColors: Record<string, string> = {
  poliza: 'bg-emerald-100 text-emerald-700',
  contrato: 'bg-blue-100 text-blue-700',
  factura: 'bg-amber-100 text-amber-700',
  identificacion: 'bg-purple-100 text-purple-700',
  otro: 'bg-gray-100 text-gray-700',
}

const typeLabels: Record<string, string> = {
  poliza: 'Póliza',
  contrato: 'Contrato',
  factura: 'Factura',
  identificacion: 'ID',
  otro: 'Otro',
}

const filterPills = [
  { value: 'all', label: 'Todos' },
  { value: 'poliza', label: 'Póliza' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'factura', label: 'Factura' },
  { value: 'identificacion', label: 'ID' },
]

export default function DocumentsPage() {
  const { token } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [documents, setDocuments] = useState<DocumentDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await api.getDocuments({ page: '1', limit: '50' })
        setDocuments(res.data.map(mapApiDocument))
      } catch {
        setDocuments([])
      } finally {
        setLoading(false)
      }
    }
    fetchDocuments()
  }, [token])

  const filtered = documents.filter((d) => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) || d.clientName.toLowerCase().includes(search.toLowerCase())
    const matchesType = typeFilter === 'all' || d.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleUpload = () => {
    toast({ title: 'Documento subido', description: 'El documento se ha subido correctamente (simulado)' })
    setUploadOpen(false)
  }

  if (loading) {
    return (
      <div className="space-y-3 md:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-7 w-32 mb-1" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        {isMobile ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i}><CardContent className="p-3"><Skeleton className="h-14 w-full" /></CardContent></Card>
            ))}
          </div>
        ) : (
          <Card><CardContent className="p-0"><div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => (<Skeleton key={i} className="h-12 w-full" />))}</div></CardContent></Card>
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
            <h1 className="text-lg md:text-2xl font-bold text-gray-900">Documentos</h1>
            <p className="text-xs md:text-sm text-gray-500">{filtered.length} documentos</p>
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-10"
            onClick={() => setUploadOpen(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            <span className="text-sm">Subir</span>
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar documentos..." className="pl-9 h-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Type Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {filterPills.map((pill) => (
            <button
              key={pill.value}
              onClick={() => setTypeFilter(pill.value)}
              className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[32px] ${
                typeFilter === pill.value
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 active:bg-gray-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Document Cards */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FolderOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500 mb-1">Todavía no hay documentos.</p>
                <p className="text-xs text-gray-400">Sube un documento para empezar</p>
              </CardContent>
            </Card>
          ) : (
            filtered.map((d) => (
              <Card key={d.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{d.name}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => toast({ title: 'Descargando...', description: d.name })}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`${typeColors[d.type] || 'bg-gray-100 text-gray-700'} border-0 text-[10px]`}>
                          {typeLabels[d.type] || d.type}
                        </Badge>
                        <span className="text-[11px] text-gray-400">{d.clientName}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                        <span>{d.date}</span>
                        {d.size && <><span>·</span><span>{d.size}</span></>}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Mobile Upload Sheet */}
        <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
          <SheetContent side="bottom" className="h-[75vh]">
            <SheetHeader>
              <SheetTitle>Subir Documento</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 p-4 overflow-y-auto flex-1">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Toca para seleccionar archivos</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG (máx. 10MB)</p>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Nombre</Label>
                <Input className="h-11" placeholder="Nombre del documento" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Tipo</Label>
                <Select defaultValue="otro">
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poliza">Póliza</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="factura">Factura</SelectItem>
                    <SelectItem value="identificacion">Identificación</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <SheetFooter className="flex-row gap-3 p-4 border-t">
              <Button variant="outline" className="flex-1 h-11" onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpload} className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white">Subir</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documentos</h1>
          <p className="text-sm text-gray-500">{filtered.length} documentos</p>
        </div>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Upload className="mr-2 h-4 w-4" /> Subir Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Subir Documento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Arrastra archivos aquí o haz clic para seleccionar</p>
                <p className="text-xs text-gray-400 mt-1">PDF, DOC, DOCX, JPG (máx. 10MB)</p>
              </div>
              <div className="space-y-2"><Label>Nombre</Label><Input placeholder="Nombre del documento" /></div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select defaultValue="otro">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="poliza">Póliza</SelectItem>
                    <SelectItem value="contrato">Contrato</SelectItem>
                    <SelectItem value="factura">Factura</SelectItem>
                    <SelectItem value="identificacion">Identificación</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpload} className="bg-emerald-600 hover:bg-emerald-700 text-white">Subir</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar documentos..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="poliza">Póliza</SelectItem>
                <SelectItem value="contrato">Contrato</SelectItem>
                <SelectItem value="factura">Factura</SelectItem>
                <SelectItem value="identificacion">Identificación</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
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
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Póliza</TableHead>
                <TableHead className="hidden sm:table-cell">Fecha</TableHead>
                <TableHead className="hidden lg:table-cell">Tamaño</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">Todavía no hay documentos.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {d.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${typeColors[d.type] || 'bg-gray-100 text-gray-700'} border-0 text-xs`}>{d.type}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">{d.clientName}</TableCell>
                    <TableCell className="hidden md:table-cell text-gray-500">{d.policyNumber || '-'}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">{d.date}</TableCell>
                    <TableCell className="hidden lg:table-cell text-gray-500">{d.size}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toast({ title: 'Descargando...', description: d.name })}>
                        <Download className="h-4 w-4" />
                      </Button>
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
