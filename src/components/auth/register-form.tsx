'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Lock } from 'lucide-react'

export default function RegisterForm() {
  const { setPage } = useAppStore()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4 cursor-pointer" onClick={() => setPage('landing')}>
            <Shield className="h-10 w-10 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">SeguriCRM</span>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <CardTitle>Registro no disponible</CardTitle>
            <CardDescription>
              El registro público está desactivado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Para obtener acceso al sistema, contacta con un administrador de tu organización.
            </p>
            <Button
              onClick={() => setPage('login')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Ir a Iniciar Sesión
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
