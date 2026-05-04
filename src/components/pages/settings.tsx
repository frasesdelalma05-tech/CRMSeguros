'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { Settings, Bell, Shield, Palette, Globe, Clock, ChevronRight } from 'lucide-react'

export default function SettingsPage() {
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [settings, setSettings] = useState({
    emailNotifications: true,
    expiringAlerts: true,
    autoAssignLeads: false,
    darkMode: false,
    language: 'es',
    timezone: 'europe_madrid',
    alertDays: '30',
    twoFactor: false,
  })

  const handleSave = () => {
    toast({ title: 'Configuración guardada', description: 'Tus preferencias han sido actualizadas' })
  }

  const settingSections = [
    {
      id: 'notifications',
      icon: Bell,
      title: 'Notificaciones',
      items: [
        {
          key: 'emailNotifications' as const,
          title: 'Notificaciones por email',
          description: 'Recibir alertas y notificaciones por correo electrónico',
          type: 'switch' as const,
        },
        {
          key: 'expiringAlerts' as const,
          title: 'Alertas de pólizas por vencer',
          description: 'Notificar cuando una póliza está próxima a vencer',
          type: 'switch' as const,
        },
        {
          key: 'autoAssignLeads' as const,
          title: 'Auto-asignación de leads',
          description: 'Asignar leads automáticamente al agente disponible',
          type: 'switch' as const,
        },
      ],
    },
    {
      id: 'appearance',
      icon: Palette,
      title: 'Apariencia',
      items: [
        {
          key: 'darkMode' as const,
          title: 'Modo oscuro',
          description: 'Activar el tema oscuro en la interfaz',
          type: 'switch' as const,
        },
      ],
    },
    {
      id: 'security',
      icon: Shield,
      title: 'Seguridad',
      items: [
        {
          key: 'twoFactor' as const,
          title: 'Autenticación de dos factores',
          description: 'Añade una capa extra de seguridad a tu cuenta',
          type: 'switch' as const,
        },
      ],
    },
  ]

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-xs md:text-sm text-gray-500">Personaliza tu experiencia en SeguriCRM</p>
        </div>

        {/* Settings Groups */}
        {settingSections.map((section) => (
          <Card key={section.id}>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <section.icon className="h-4 w-4 text-emerald-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="space-y-0">
                {section.items.map((item, idx) => (
                  <div key={item.key}>
                    {idx > 0 && <Separator className="my-3" />}
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{item.description}</p>
                      </div>
                      <Switch
                        checked={settings[item.key]}
                        onCheckedChange={(v) => setSettings({ ...settings, [item.key]: v })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Regional Settings */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="h-4 w-4 text-emerald-600" />
              Regional
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-3">
            <div className="space-y-2">
              <Label className="text-sm">Idioma</Label>
              <Select value={settings.language} onValueChange={(v) => setSettings({ ...settings, language: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Zona horaria</Label>
              <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="europe_madrid">Europe/Madrid (CET)</SelectItem>
                  <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                  <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alert Days */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-emerald-600" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <Label className="text-sm">Días de alerta de renovación</Label>
            <Input
              type="number"
              value={settings.alertDays}
              onChange={(e) => setSettings({ ...settings, alertDays: e.target.value })}
              className="h-11 w-24"
            />
            <p className="text-[11px] text-gray-400">Número de días antes del vencimiento para enviar alertas</p>
          </CardContent>
        </Card>

        <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-11">
          Guardar Configuración
        </Button>
      </div>
    )
  }

  // Desktop view
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500">Personaliza tu experiencia en SeguriCRM</p>
      </div>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" /> Notificaciones
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notificaciones por email</p>
              <p className="text-xs text-gray-500">Recibir alertas y notificaciones por correo electrónico</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(v) => setSettings({ ...settings, emailNotifications: v })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Alertas de pólizas por vencer</p>
              <p className="text-xs text-gray-500">Notificar cuando una póliza está próxima a vencer</p>
            </div>
            <Switch
              checked={settings.expiringAlerts}
              onCheckedChange={(v) => setSettings({ ...settings, expiringAlerts: v })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-asignación de leads</p>
              <p className="text-xs text-gray-500">Asignar leads automáticamente al agente disponible</p>
            </div>
            <Switch
              checked={settings.autoAssignLeads}
              onCheckedChange={(v) => setSettings({ ...settings, autoAssignLeads: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4 text-emerald-600" /> Apariencia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Modo oscuro</p>
              <p className="text-xs text-gray-500">Activar el tema oscuro en la interfaz</p>
            </div>
            <Switch
              checked={settings.darkMode}
              onCheckedChange={(v) => setSettings({ ...settings, darkMode: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regional */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" /> Regional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Idioma</Label>
            <Select value={settings.language} onValueChange={(v) => setSettings({ ...settings, language: v })}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select value={settings.timezone} onValueChange={(v) => setSettings({ ...settings, timezone: v })}>
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="europe_madrid">Europe/Madrid (CET)</SelectItem>
                <SelectItem value="europe_london">Europe/London (GMT)</SelectItem>
                <SelectItem value="america_new_york">America/New_York (EST)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" /> Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Autenticación de dos factores</p>
              <p className="text-xs text-gray-500">Añade una capa extra de seguridad a tu cuenta</p>
            </div>
            <Switch
              checked={settings.twoFactor}
              onCheckedChange={(v) => setSettings({ ...settings, twoFactor: v })}
            />
          </div>
          <Separator />
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              Días de alerta de renovación
            </Label>
            <Input
              type="number"
              value={settings.alertDays}
              onChange={(e) => setSettings({ ...settings, alertDays: e.target.value })}
              className="w-32"
            />
            <p className="text-xs text-gray-400">Número de días antes del vencimiento para enviar alertas</p>
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white">
        Guardar Configuración
      </Button>
    </div>
  )
}
