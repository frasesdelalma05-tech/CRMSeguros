'use client'

import { useState } from 'react'
import { useAppStore, type PageName } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Plus, UserPlus, Calendar, CheckSquare, TrendingUp, X } from 'lucide-react'

const fabActions: { label: string; page: PageName; icon: React.ElementType; color: string }[] = [
  { label: 'Nuevo Cliente', page: 'clients', icon: UserPlus, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { label: 'Nueva Cita', page: 'appointments', icon: Calendar, color: 'bg-teal-600 hover:bg-teal-700 text-white' },
  { label: 'Nueva Tarea', page: 'tasks', icon: CheckSquare, color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  { label: 'Nueva Oportunidad', page: 'opportunities', icon: TrendingUp, color: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
]

export default function FAB() {
  const [open, setOpen] = useState(false)

  return (
    <div className="fixed bottom-20 right-4 z-40 md:hidden flex flex-col items-end gap-2">
      {/* Action buttons */}
      {open && (
        <div className="flex flex-col items-end gap-2 animate-in slide-in-from-bottom-4 fade-in duration-200">
          {fabActions.map((action) => (
            <div key={action.label} className="flex items-center gap-2">
              <span className="text-xs font-medium bg-white shadow-md rounded-lg px-3 py-1.5 text-gray-700 whitespace-nowrap">
                {action.label}
              </span>
              <Button
                size="icon"
                className={`h-11 w-11 rounded-full shadow-lg ${action.color}`}
                onClick={() => {
                  // Navigate to the page - the page component will handle showing the create dialog
                  setOpen(false)
                  // We use a custom event to signal the page to open create dialog
                  window.dispatchEvent(new CustomEvent('fab-create', { detail: { page: action.page } }))
                }}
                aria-label={action.label}
              >
                <action.icon className="h-5 w-5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Main FAB button */}
      <Button
        size="icon"
        className={`h-14 w-14 rounded-full shadow-xl transition-transform duration-200 ${
          open
            ? 'bg-gray-800 hover:bg-gray-900 text-white rotate-45'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Cerrar acciones' : 'Acciones rápidas'}
        aria-expanded={open}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  )
}
