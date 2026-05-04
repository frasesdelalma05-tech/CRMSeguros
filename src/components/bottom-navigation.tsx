'use client'

import { useAppStore, type PageName } from '@/lib/store'
import { LayoutDashboard, Users, Calendar, Shield, MoreHorizontal } from 'lucide-react'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  UserPlus, TrendingUp, CheckSquare, Megaphone, Heart,
  AlertTriangle, FileText, BarChart3, Settings, User,
} from 'lucide-react'

const mainNavItems: { title: string; page: PageName; icon: React.ElementType }[] = [
  { title: 'Inicio', page: 'dashboard', icon: LayoutDashboard },
  { title: 'Clientes', page: 'clients', icon: Users },
  { title: 'Citas', page: 'appointments', icon: Calendar },
  { title: 'Pólizas', page: 'policies', icon: Shield },
]

const moreNavItems: { title: string; page: PageName; icon: React.ElementType; roles?: string[] }[] = [
  { title: 'Leads', page: 'leads', icon: UserPlus },
  { title: 'Oportunidades', page: 'opportunities', icon: TrendingUp },
  { title: 'Tareas', page: 'tasks', icon: CheckSquare },
  { title: 'Campañas', page: 'campaigns', icon: Megaphone },
  { title: 'Fidelización', page: 'loyalty', icon: Heart },
  { title: 'Incidencias', page: 'incidents', icon: AlertTriangle },
  { title: 'Documentos', page: 'documents', icon: FileText },
  { title: 'Reportes', page: 'reports', icon: BarChart3 },
  { title: 'Administración', page: 'admin', icon: Settings, roles: ['super_administrador', 'administrador'] },
]

export default function BottomNavigation() {
  const { page, setPage, user } = useAppStore()

  const isMainActive = (p: PageName) => page === p
  const isMoreActive = moreNavItems.some((item) => item.page === page)

  const filteredMoreItems = moreNavItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden bottom-nav-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {mainNavItems.map((item) => {
          const active = isMainActive(item.page)
          return (
            <button
              key={item.page}
              onClick={() => setPage(item.page)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-lg transition-colors min-w-0 ${
                active
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700 active:text-emerald-600'
              }`}
              aria-label={item.title}
              aria-current={active ? 'page' : undefined}
            >
              <item.icon className={`h-5 w-5 ${active ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[10px] leading-tight truncate ${active ? 'font-semibold' : 'font-medium'}`}>
                {item.title}
              </span>
            </button>
          )
        })}

        {/* More button with sheet */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 px-1 rounded-lg transition-colors min-w-0 ${
                isMoreActive
                  ? 'text-emerald-600'
                  : 'text-gray-500 hover:text-gray-700 active:text-emerald-600'
              }`}
              aria-label="Más opciones"
            >
              <MoreHorizontal className={`h-5 w-5 ${isMoreActive ? 'stroke-[2.5px]' : ''}`} />
              <span className={`text-[10px] leading-tight ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
                Más
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Más opciones</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 p-4 overflow-y-auto">
              {filteredMoreItems.map((item) => {
                const active = page === item.page
                return (
                  <button
                    key={item.page}
                    onClick={() => { setPage(item.page) }}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors ${
                      active
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 active:bg-emerald-50'
                    }`}
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="text-xs font-medium text-center leading-tight">{item.title}</span>
                  </button>
                )
              })}
              <Separator className="col-span-3 my-1" />
              <button
                onClick={() => setPage('profile')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors ${
                  page === 'profile'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <User className="h-6 w-6" />
                <span className="text-xs font-medium text-center leading-tight">Perfil</span>
              </button>
              <button
                onClick={() => setPage('settings')}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl transition-colors ${
                  page === 'settings'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className="h-6 w-6" />
                <span className="text-xs font-medium text-center leading-tight">Ajustes</span>
              </button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
