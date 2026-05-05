'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, type PageName } from '@/lib/store'
import { api, type Notification, type Client, type Policy, type AdminUser, type Lead } from '@/lib/api'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  LayoutDashboard, Users, UserPlus, TrendingUp, Shield, Calendar,
  CheckSquare, Megaphone, Heart, AlertTriangle, FileText, BarChart3,
  Settings, User, LogOut, Bell, Search, Menu, Loader2,
  X, UserCircle, FileCheck, Briefcase,
} from 'lucide-react'
import BottomNavigation from '@/components/bottom-navigation'
import FAB from '@/components/fab'
import { useIdleTimeout } from '@/hooks/use-idle-timeout'

// Display type for notifications
interface NotificationDisplay {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
}

function mapApiNotification(n: Notification): NotificationDisplay {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type,
    read: n.isRead,
    createdAt: n.createdAt,
  }
}

// Search result types
interface SearchResults {
  clients: Client[]
  policies: Policy[]
  leads: Lead[]
  agents: AdminUser[]
}

const policyStatusColors: Record<string, string> = {
  activa: 'bg-emerald-100 text-emerald-800',
  en_renovacion: 'bg-amber-100 text-amber-800',
  vencida: 'bg-red-100 text-red-800',
  cancelada: 'bg-gray-100 text-gray-800',
  suspendida: 'bg-orange-100 text-orange-800',
  pendiente: 'bg-blue-100 text-blue-800',
}

const navItems: { title: string; page: PageName; icon: React.ElementType; roles?: string[] }[] = [
  { title: 'Dashboard', page: 'dashboard', icon: LayoutDashboard },
  { title: 'Clientes', page: 'clients', icon: Users },
  { title: 'Leads', page: 'leads', icon: UserPlus },
  { title: 'Oportunidades', page: 'opportunities', icon: TrendingUp },
  { title: 'Pólizas', page: 'policies', icon: Shield },
  { title: 'Citas', page: 'appointments', icon: Calendar },
  { title: 'Tareas', page: 'tasks', icon: CheckSquare },
  { title: 'Campañas', page: 'campaigns', icon: Megaphone },
  { title: 'Fidelización', page: 'loyalty', icon: Heart },
  { title: 'Incidencias', page: 'incidents', icon: AlertTriangle },
  { title: 'Documentos', page: 'documents', icon: FileText },
  { title: 'Reportes', page: 'reports', icon: BarChart3 },
  { title: 'Administración', page: 'admin', icon: Settings, roles: ['super_administrador', 'administrador'] },
]

function AppSidebar() {
  const { page, setPage, user } = useAppStore()

  const filteredItems = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role?.toLowerCase() ?? ''))
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Shield className="h-8 w-8 text-emerald-400 shrink-0" />
          <span className="text-xl font-bold group-data-[collapsible=icon]:hidden">
            SeguriCRM
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={page === item.page}
                    onClick={() => setPage(item.page)}
                    tooltip={item.title}
                    className="data-[active=true]:bg-emerald-600 data-[active=true]:text-white"
                  >
                    <item.icon className="h-5 w-5" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={page === 'profile'}
              onClick={() => setPage('profile')}
              tooltip="Perfil"
              className="data-[active=true]:bg-emerald-600 data-[active=true]:text-white"
            >
              <User className="h-5 w-5" />
              <span>Mi Perfil</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function MobileSidebarTrigger() {
  const { toggleSidebar, isMobile } = useSidebar()
  if (!isMobile) return null
  return (
    <Button
      variant="ghost"
      size="icon"
      className="-ml-1"
      onClick={toggleSidebar}
    >
      <Menu className="h-5 w-5" />
    </Button>
  )
}

// Shared search results dropdown content
function SearchResultsList({
  results,
  isSearching,
  searchQuery,
  onNavigate,
}: {
  results: SearchResults | null
  isSearching: boolean
  searchQuery: string
  onNavigate: (type: 'client' | 'policy' | 'agent', id: string) => void
}) {
  const hasResults = results && (
    results.clients.length > 0 ||
    results.policies.length > 0 ||
    results.agents.length > 0
  )

  if (!searchQuery.trim()) return null

  if (isSearching) {
    return (
      <div className="flex items-center justify-center py-8 gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Buscando...</span>
      </div>
    )
  }

  if (!hasResults) {
    return (
      <div className="py-8 text-center text-gray-500">
        <Search className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No se encontraron resultados</p>
      </div>
    )
  }

  return (
    <ScrollArea className="max-h-96">
      {/* Clients */}
      {results!.clients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <Users className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Clientes</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results!.clients.length}</Badge>
          </div>
          {results!.clients.map((client) => (
            <button
              key={client.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
              onClick={() => onNavigate('client', client.id)}
            >
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <UserCircle className="h-4 w-4 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{client.name} {client.lastName}</p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {client.documentNumber && <span>{client.documentType || 'DNI'}: {client.documentNumber}</span>}
                  {client.phone && <span>· {client.phone}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Policies */}
      {results!.policies.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <FileCheck className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pólizas</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results!.policies.length}</Badge>
          </div>
          {results!.policies.map((policy) => (
            <button
              key={policy.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
              onClick={() => onNavigate('policy', policy.id)}
            >
              <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">{policy.policyNumber}</p>
                  <Badge className={`text-[10px] h-4 px-1.5 ${policyStatusColors[policy.status] || 'bg-gray-100 text-gray-800'}`}>
                    {policy.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 truncate">{policy.productName}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Agents (Corredores) */}
      {results!.agents.length > 0 && (
        <div>
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b">
            <Briefcase className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Corredores</span>
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-auto">{results!.agents.length}</Badge>
          </div>
          {results!.agents.map((agent) => (
            <button
              key={agent.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b border-gray-50"
              onClick={() => onNavigate('agent', agent.id)}
            >
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Briefcase className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{agent.name} {agent.lastName}</p>
                {agent.position && <p className="text-xs text-gray-500 truncate">{agent.position}</p>}
              </div>
            </button>
          ))}
        </div>
      )}
    </ScrollArea>
  )
}

function AppHeader() {
  const { user, token, setPage, setSelectedId, logout } = useAppStore()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationDisplay[]>([])
  const unreadCount = notifications.filter((n) => !n.read).length
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)

  // Fetch notifications
  useEffect(() => {
    async function fetchNotifications() {
      try {
        const res = await api.getNotifications()
        setNotifications(res.data.map(mapApiNotification))
      } catch {
        setNotifications([])
      }
    }
    fetchNotifications()
  }, [token])

  // Debounced search
  const performSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    try {
      const res = await api.globalSearch(q)
      setSearchResults(res.data)
    } catch {
      setSearchResults(null)
    } finally {
      setIsSearching(false)
    }
  }, [])

  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    if (!value.trim()) {
      setSearchResults(null)
      setIsSearching(false)
      return
    }
    setIsSearching(true)
    debounceRef.current = setTimeout(() => {
      performSearch(value)
    }, 300)
  }, [performSearch])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Navigation handler
  const handleSearchNavigate = useCallback((type: 'client' | 'policy' | 'agent', id: string) => {
    setSearchOpen(false)
    setMobileSearchOpen(false)
    setSearchQuery('')
    setSearchResults(null)

    if (type === 'client') {
      setSelectedId(id)
      setPage('client-detail')
    } else if (type === 'policy') {
      setSelectedId(id)
      setPage('policies')
    } else if (type === 'agent') {
      setPage('admin')
    }
  }, [setPage, setSelectedId])

  // Focus mobile search input when sheet opens
  useEffect(() => {
    if (mobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100)
    }
  }, [mobileSearchOpen])

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      if (unreadIds.length > 0) {
        await api.markNotificationsRead(unreadIds)
      }
    } catch {
      // Silently fail - UI already updated
    }
  }

  const initials = user
    ? `${user.name.charAt(0)}${user.lastName.charAt(0)}`
    : 'U'

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-white px-3 lg:px-6 sticky top-0 z-30">
      {/* Desktop sidebar trigger */}
      <SidebarTrigger className="-ml-1 hidden md:flex" />

      {/* Mobile menu button - triggers sidebar Sheet via useSidebar */}
      <MobileSidebarTrigger />

      <Separator orientation="vertical" className="h-6 hidden md:block" />

      {/* Page title - mobile */}
      <div className="flex-1 md:hidden">
        <p className="text-sm font-semibold text-gray-900 truncate">SeguriCRM</p>
      </div>

      {/* Search - desktop */}
      <div className="flex-1 max-w-md hidden md:block relative">
        <Popover open={searchOpen} onOpenChange={setSearchOpen}>
          <PopoverTrigger asChild>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                ref={searchInputRef}
                placeholder="Buscar clientes, pólizas, corredores..."
                className="pl-9 pr-8 bg-gray-50 border-0"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                onFocus={() => { if (searchQuery.trim()) setSearchOpen(true) }}
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-200"
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults(null)
                    setIsSearching(false)
                    searchInputRef.current?.focus()
                  }}
                >
                  <X className="h-3 w-3 text-gray-400" />
                </button>
              )}
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <SearchResultsList
              results={searchResults}
              isSearching={isSearching}
              searchQuery={searchQuery}
              onNavigate={handleSearchNavigate}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-1 md:gap-2 ml-auto">
        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        {/* Mobile search Sheet */}
        <Sheet open={mobileSearchOpen} onOpenChange={(open) => {
          setMobileSearchOpen(open)
          if (!open) {
            setSearchQuery('')
            setSearchResults(null)
            setIsSearching(false)
          }
        }}>
          <SheetContent side="top" className="h-[85vh] p-0">
            <SheetHeader className="p-4 pb-2">
              <SheetTitle>Buscar</SheetTitle>
              <SheetDescription>Busca clientes, pólizas o corredores</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  ref={mobileSearchInputRef}
                  placeholder="Buscar clientes, pólizas, corredores..."
                  className="pl-9 pr-8 bg-gray-50 border"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchQuery && (
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded-full hover:bg-gray-200"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults(null)
                      setIsSearching(false)
                      mobileSearchInputRef.current?.focus()
                    }}
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            <div className="border-t">
              <SearchResultsList
                results={searchResults}
                isSearching={isSearching}
                searchQuery={searchQuery}
                onNavigate={handleSearchNavigate}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Notifications */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-gray-600" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between p-4 border-b">
              <h4 className="font-semibold text-sm">Notificaciones</h4>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-emerald-600 hover:text-emerald-700"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>
            <ScrollArea className="max-h-72">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer ${
                      !notif.read ? 'bg-emerald-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notif.read && (
                        <div className="w-2 h-2 bg-emerald-500 rounded-full mt-1.5 shrink-0" />
                      )}
                      <div className={!notif.read ? '' : 'ml-4'}>
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-emerald-600 text-white text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline text-sm font-medium text-gray-700">
                {user?.name} {user?.lastName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="text-sm font-medium">{user?.name} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
                <Badge variant="secondary" className="mt-1 text-[10px] capitalize">
                  {user?.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPage('profile')}>
              <User className="mr-2 h-4 w-4" />
              Mi Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPage('settings')}>
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // Auto-logout after 10 minutes of inactivity
  useIdleTimeout()

  return (
    <SidebarProvider>
      <div
        className="flex min-h-screen w-full"
        style={{
          '--sidebar-width': '16rem',
          '--sidebar': '#111827',
          '--sidebar-foreground': '#f3f4f6',
          '--sidebar-primary': '#10b981',
          '--sidebar-primary-foreground': '#ffffff',
          '--sidebar-accent': '#1e293b',
          '--sidebar-accent-foreground': '#f3f4f6',
          '--sidebar-border': '#374151',
          '--sidebar-ring': '#10b981',
        } as React.CSSProperties}
      >
        <AppSidebar />
        <SidebarInset className="flex-1">
          <AppHeader />
          <main className="flex-1 p-3 md:p-4 lg:p-6 bg-gray-50 min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-3.5rem)] pb-20 md:pb-6 overflow-x-hidden">
            {children}
          </main>
        </SidebarInset>
      </div>
      {/* Mobile bottom navigation */}
      <BottomNavigation />
      {/* Mobile FAB */}
      <FAB />
    </SidebarProvider>
  )
}
