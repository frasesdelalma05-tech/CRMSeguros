'use client'

import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield, Loader2, ArrowLeft, Mail } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/client'

export default function ForgotPasswordForm() {
  const { setPage } = useAppStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Use Supabase Auth for password reset
      const supabase = getSupabaseClient()
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/`,
      })

      if (supabaseError) {
        // Supabase password reset failed - still show success to avoid email enumeration
        console.warn('Supabase password reset error:', supabaseError.message)
      }

      // Always show success message to prevent email enumeration attacks
      setSent(true)
    } catch (err) {
      // Even on error, show success to prevent email enumeration
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-10 w-10 text-emerald-600" />
            <span className="text-2xl font-bold text-gray-900">SeguriCRM</span>
          </div>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader>
            <CardTitle>Recuperar Contraseña</CardTitle>
            <CardDescription>
              Introduce tu email y te enviaremos un enlace para restablecer tu contraseña
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Email enviado</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Si existe una cuenta asociada a <strong>{email}</strong>,
                  recibirás un enlace de recuperación en tu bandeja de entrada.
                </p>
                <Button
                  onClick={() => setPage('login')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Volver a Iniciar Sesión
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Enlace de Recuperación'
                  )}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => setPage('login')}
                className="text-sm text-gray-500 hover:text-emerald-600 inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a Iniciar Sesión
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
