'use client'

import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Shield, Users, TrendingUp, Heart, BarChart3, Lock, FileText, Award, Phone, CheckCircle2, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback } from 'react'

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } },
}

export default function LandingPage() {
  const { setPage } = useAppStore()

  const scrollToSection = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const goToLogin = useCallback(() => {
    setPage('login')
  }, [setPage])

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-emerald-600" />
            <span className="text-xl font-bold text-gray-900">SeguriCRM</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <button
              onClick={() => scrollToSection('beneficios')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Beneficios
            </button>
            <button
              onClick={() => scrollToSection('productos')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Productos
            </button>
            <button
              onClick={() => scrollToSection('funcionalidades')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Funcionalidades
            </button>
            <button
              onClick={() => scrollToSection('seguridad')}
              className="hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Seguridad
            </button>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={goToLogin} className="text-emerald-600 hover:text-emerald-700">
              Iniciar Sesión
            </Button>
            <Button onClick={goToLogin} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Acceder al CRM
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-white" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Shield className="h-4 w-4" />
            Plataforma #1 en gestión de seguros
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
            SeguriCRM - La gestión inteligente
            <br />
            <span className="text-emerald-600">para tu agencia de seguros</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
            Centraliza clientes, pólizas, leads y oportunidades en una sola plataforma.
            Automatiza procesos, fideliza clientes y crece tu negocio asegurador.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={goToLogin}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-6 text-lg"
            >
              Acceder al CRM
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={goToLogin}
              className="px-8 py-6 text-lg border-emerald-600 text-emerald-600 hover:bg-emerald-50"
            >
              Iniciar Sesión
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>+1.000 agencias</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>+50.000 pólizas gestionadas</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>99.9% disponibilidad</span>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Benefits Section */}
      <section id="beneficios" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas para gestionar tu agencia
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Una plataforma completa diseñada específicamente para el sector asegurador
            </p>
          </motion.div>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {[
              { icon: Users, title: 'Gestión de Clientes', desc: 'Base de datos centralizada con historial completo, RGPD y segmentación avanzada.', color: 'emerald' },
              { icon: TrendingUp, title: 'Pipeline de Ventas', desc: 'Kanban visual para leads y oportunidades con seguimiento automatizado.', color: 'teal' },
              { icon: Shield, title: 'Pólizas', desc: 'Gestión integral de pólizas con alertas de renovación y seguimiento de siniestros.', color: 'emerald' },
              { icon: Heart, title: 'Fidelización', desc: 'Score de fidelización y recomendaciones personalizadas para retener clientes.', color: 'teal' },
              { icon: BarChart3, title: 'Reportes', desc: 'Dashboards y reportes personalizados con métricas clave de negocio.', color: 'emerald' },
              { icon: Lock, title: 'Seguridad', desc: 'Cumplimiento RGPD, cifrado de datos y control de acceso por roles.', color: 'teal' },
            ].map((benefit, i) => (
              <motion.div key={i} variants={fadeInUp}>
                <Card
                  className="h-full hover:shadow-lg hover:border-emerald-200 transition-all duration-200 cursor-pointer border-0 shadow-sm group"
                  onClick={goToLogin}
                  role="button"
                  aria-label={`${benefit.title} - Acceder al CRM`}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToLogin() } }}
                >
                  <CardContent className="p-6">
                    <div className={`w-12 h-12 rounded-lg bg-${benefit.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <benefit.icon className={`h-6 w-6 text-${benefit.color}-600`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600 text-sm mb-3">{benefit.desc}</p>
                    <span className="text-emerald-600 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Gestionar en CRM <ArrowRight className="h-3 w-3" />
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section id="productos" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Seguros para cada necesidad
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Gestiona todo tipo de productos aseguradores desde una única plataforma
            </p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { name: 'Auto', icon: '🚗' },
              { name: 'Hogar', icon: '🏠' },
              { name: 'Vida', icon: '❤️' },
              { name: 'Salud', icon: '🏥' },
              { name: 'Empresarial', icon: '🏢' },
              { name: 'Viaje', icon: '✈️' },
            ].map((product, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="text-center hover:shadow-md hover:border-emerald-200 hover:scale-105 transition-all duration-200 cursor-pointer border-0 shadow-sm group"
                  onClick={goToLogin}
                  role="button"
                  aria-label={`Seguro ${product.name} - Gestionar en CRM`}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToLogin() } }}
                >
                  <CardContent className="p-6">
                    <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{product.icon}</div>
                    <p className="text-sm font-medium text-gray-700">{product.name}</p>
                    <span className="text-emerald-600 text-xs font-medium mt-2 block opacity-0 group-hover:opacity-100 transition-opacity">
                      Gestionar en CRM
                    </span>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Funcionalidades que impulsan tu negocio
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Automatización, inteligencia y eficiencia en cada proceso
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              { icon: FileText, title: 'Gestión Documental', desc: 'Almacena y organiza todos los documentos de clientes y pólizas en un solo lugar. Acceso rápido y seguro.' },
              { icon: Award, title: 'Score de Fidelización', desc: 'Algoritmo inteligente que calcula el riesgo de fidelización de cada cliente y sugiere acciones personalizadas.' },
              { icon: Phone, title: 'Campañas Multicanal', desc: 'Crea y gestiona campañas por email, SMS, llamadas y redes sociales con métricas en tiempo real.' },
              { icon: BarChart3, title: 'Reportes Avanzados', desc: 'Dashboards personalizados con KPIs de ventas, retención, conversión y rendimiento por agente.' },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
              >
                <Card
                  className="h-full border-0 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all duration-200 cursor-pointer group"
                  onClick={goToLogin}
                  role="button"
                  aria-label={`${feature.title} - Acceder al CRM`}
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToLogin() } }}
                >
                  <CardContent className="p-6 flex gap-4">
                    <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <feature.icon className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-600 text-sm mb-2">{feature.desc}</p>
                      <span className="text-emerald-600 text-xs font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Gestionar en CRM <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="seguridad" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Seguridad y cumplimiento
                <span className="text-emerald-600"> RGPD</span>
              </h2>
              <p className="text-lg text-gray-600 mb-8">
                Protegemos los datos de tus clientes con los más altos estándares de seguridad
                y cumplimiento normativo europeo.
              </p>
              <div className="space-y-4">
                {[
                  'Cifrado de datos en reposo y en tránsito',
                  'Consentimiento y gestión RGPD integrados',
                  'Control de acceso basado en roles',
                  'Auditoría y registro de actividades',
                  'Copias de seguridad automáticas',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-8"
            >
              <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Lock className="h-8 w-8 text-emerald-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Protección de Datos</p>
                    <p className="text-sm text-gray-500">Nivel de seguridad: Máximo</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cifrado AES-256</span>
                    <span className="text-emerald-600 font-medium">Activo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cumplimiento RGPD</span>
                    <span className="text-emerald-600 font-medium">100%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Auditoría</span>
                    <span className="text-emerald-600 font-medium">En tiempo real</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-emerald-600 to-teal-600">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto px-4 text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Empieza a transformar tu agencia hoy
          </h2>
          <p className="text-lg text-emerald-100 mb-10">
            Únete a más de 1.000 agencias que ya gestionan su negocio con SeguriCRM
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={goToLogin}
              className="bg-white text-emerald-600 hover:bg-emerald-50 px-8 py-6 text-lg font-semibold"
            >
              Acceder al CRM
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={goToLogin}
              className="border-white text-white hover:bg-white/10 px-8 py-6 text-lg"
            >
              Iniciar Sesión
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="h-6 w-6 text-emerald-400" />
                <span className="text-lg font-bold text-white">SeguriCRM</span>
              </div>
              <p className="text-sm">La gestión inteligente para tu agencia de seguros.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Producto</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection('funcionalidades')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Funcionalidades
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('productos')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Productos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('beneficios')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Beneficios
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Empresa</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection('seguridad')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Seguridad
                  </button>
                </li>
                <li>
                  <button
                    onClick={goToLogin}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Contacto
                  </button>
                </li>
                <li>
                  <button
                    onClick={goToLogin}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Acceso CRM
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection('seguridad')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Privacidad
                  </button>
                </li>
                <li>
                  <button
                    onClick={goToLogin}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Términos
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection('seguridad')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    RGPD
                  </button>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} SeguriCRM. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
