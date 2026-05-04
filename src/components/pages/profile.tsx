'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import { useIsMobile } from '@/hooks/use-mobile'
import { User, Mail, Phone, Lock, Shield } from 'lucide-react'

export default function ProfilePage() {
  const { user } = useAppStore()
  const { toast } = useToast()
  const isMobile = useIsMobile()
  const [form, setForm] = useState({
    name: user?.name || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [activeTab, setActiveTab] = useState('personal')

  const handleSaveProfile = () => {
    toast({ title: 'Perfil actualizado', description: 'Tus datos han sido guardados correctamente' })
  }

  const handleChangePassword = () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden', variant: 'destructive' })
      return
    }
    if (passwordForm.newPassword.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' })
      return
    }
    toast({ title: 'Contraseña actualizada' })
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
  }

  const initials = user ? `${user.name.charAt(0)}${user.lastName.charAt(0)}` : 'U'

  const rolePermissions: Record<string, string[]> = {
    super_administrador: ['Dashboard', 'Clientes', 'Leads', 'Oportunidades', 'Pólizas', 'Citas', 'Tareas', 'Campañas', 'Fidelización', 'Incidencias', 'Documentos', 'Reportes', 'Administración', 'Configuración'],
    administrador: ['Dashboard', 'Clientes', 'Leads', 'Oportunidades', 'Pólizas', 'Citas', 'Tareas', 'Campañas', 'Fidelización', 'Incidencias', 'Documentos', 'Reportes', 'Administración'],
    corredor: ['Dashboard', 'Clientes', 'Leads', 'Oportunidades', 'Pólizas', 'Citas', 'Tareas', 'Documentos'],
    atencion_cliente: ['Dashboard', 'Clientes', 'Citas', 'Incidencias'],
    solo_lectura: ['Dashboard', 'Clientes'],
  }

  const roleColors: Record<string, string> = {
    super_administrador: 'bg-red-100 text-red-700',
    administrador: 'bg-emerald-100 text-emerald-700',
    corredor: 'bg-teal-100 text-teal-700',
    atencion_cliente: 'bg-purple-100 text-purple-700',
    solo_lectura: 'bg-gray-100 text-gray-700',
  }

  const roleLabels: Record<string, string> = {
    super_administrador: 'Super Admin',
    administrador: 'Administrador',
    corredor: 'Corredor/Agente',
    atencion_cliente: 'Atención al Cliente',
    solo_lectura: 'Solo Lectura',
  }

  // Mobile view
  if (isMobile) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg md:text-2xl font-bold text-gray-900">Mi Perfil</h1>

        {/* Profile Header */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-20 w-20 mb-3">
                <AvatarFallback className="bg-emerald-600 text-white text-2xl">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-semibold text-gray-900">{user?.name} {user?.lastName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <Badge className={`${roleColors[user?.role || 'corredor']} border-0 text-xs mt-2 capitalize`}>
                {roleLabels[user?.role || 'corredor'] || user?.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <ScrollArea className="w-full">
          <div className="flex gap-2 pb-1 -mx-4 px-4">
            {[
              { value: 'personal', label: 'Datos' },
              { value: 'password', label: 'Contraseña' },
              { value: 'permissions', label: 'Permisos' },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0 min-h-[32px] ${
                  activeTab === tab.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-600 active:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollArea>

        {/* Personal Info Tab */}
        {activeTab === 'personal' && (
          <Card>
            <CardContent className="p-3 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-sm">Nombre</Label>
                  <Input className="h-11" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Apellido</Label>
                  <Input className="h-11" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Email</Label>
                <Input className="h-11" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Teléfono</Label>
                <Input className="h-11" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-11">
                Guardar Cambios
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Password Tab */}
        {activeTab === 'password' && (
          <Card>
            <CardContent className="p-3 space-y-4">
              <div className="space-y-2">
                <Label className="text-sm">Contraseña Actual</Label>
                <Input className="h-11" type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Nueva Contraseña</Label>
                <Input className="h-11" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Confirmar Contraseña</Label>
                <Input className="h-11" type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
              </div>
              <Button onClick={handleChangePassword} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full h-11">
                Cambiar Contraseña
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Rol: </span>
                <Badge className={`${roleColors[user?.role || 'corredor']} border-0 capitalize text-xs`}>
                  {roleLabels[user?.role || 'corredor'] || user?.role}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mb-3">Permisos asignados:</p>
              <div className="flex flex-wrap gap-1">
                {(rolePermissions[user?.role || 'corredor'] || []).map((perm) => (
                  <Badge key={perm} variant="outline" className="text-[10px]">{perm}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  // Desktop view
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi Perfil</h1>
        <p className="text-sm text-gray-500">Gestiona tu información personal y configuración</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-emerald-600 text-white text-xl">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{user?.name} {user?.lastName}</h2>
              <p className="text-sm text-gray-500">{user?.email}</p>
              <Badge className={`${roleColors[user?.role || 'corredor']} border-0 text-xs mt-1 capitalize`}>
                {user?.role}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" /> Información Personal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nombre</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Apellido</Label>
              <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Teléfono</Label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <Button onClick={handleSaveProfile} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Guardar Cambios
          </Button>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600" /> Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Contraseña Actual</Label>
            <Input type="password" value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nueva Contraseña</Label>
              <Input type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Confirmar Contraseña</Label>
              <Input type="password" value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} />
            </div>
          </div>
          <Button onClick={handleChangePassword} className="bg-emerald-600 hover:bg-emerald-700 text-white">
            Cambiar Contraseña
          </Button>
        </CardContent>
      </Card>

      {/* Role & Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-emerald-600" /> Rol y Permisos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm font-medium">Rol actual:</span>
            <Badge className={`${roleColors[user?.role || 'corredor']} border-0 capitalize`}>{user?.role}</Badge>
          </div>
          <p className="text-sm text-gray-500 mb-3">Permisos asignados:</p>
          <div className="flex flex-wrap gap-1">
            {(rolePermissions[user?.role || 'corredor'] || []).map((perm) => (
              <Badge key={perm} variant="outline" className="text-xs">{perm}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
