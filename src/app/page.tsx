'use client'

import { useEffect } from 'react'
import { useAppStore, type PageName } from '@/lib/store'
import LandingPage from '@/components/landing'
import LoginForm from '@/components/auth/login-form'
import ForgotPasswordForm from '@/components/auth/forgot-password-form'
import AppLayout from '@/components/app-layout'
import DashboardPage from '@/components/pages/dashboard'
import ClientsPage from '@/components/pages/clients'
import ClientDetailPage from '@/components/pages/client-detail'
import LeadsPage from '@/components/pages/leads'
import OpportunitiesPage from '@/components/pages/opportunities'
import PoliciesPage from '@/components/pages/policies'
import PolicyDetailPage from '@/components/pages/policy-detail'
import AppointmentsPage from '@/components/pages/appointments'
import TasksPage from '@/components/pages/tasks'
import CampaignsPage from '@/components/pages/campaigns'
import LoyaltyPage from '@/components/pages/loyalty'
import IncidentsPage from '@/components/pages/incidents'
import DocumentsPage from '@/components/pages/documents'
import ReportsPage from '@/components/pages/reports'
import AdminPage from '@/components/pages/admin'
import ProfilePage from '@/components/pages/profile'
import SettingsPage from '@/components/pages/settings'

function PageRenderer({ page }: { page: PageName }) {
  switch (page) {
    case 'dashboard':
      return <DashboardPage />
    case 'clients':
      return <ClientsPage />
    case 'client-detail':
      return <ClientDetailPage />
    case 'leads':
      return <LeadsPage />
    case 'opportunities':
      return <OpportunitiesPage />
    case 'policies':
      return <PoliciesPage />
    case 'policy-detail':
      return <PolicyDetailPage />
    case 'appointments':
    case 'calendar':
      return <AppointmentsPage />
    case 'tasks':
      return <TasksPage />
    case 'campaigns':
      return <CampaignsPage />
    case 'loyalty':
      return <LoyaltyPage />
    case 'incidents':
      return <IncidentsPage />
    case 'documents':
      return <DocumentsPage />
    case 'reports':
      return <ReportsPage />
    case 'admin':
      return <AdminPage />
    case 'profile':
      return <ProfilePage />
    case 'settings':
      return <SettingsPage />
    default:
      return <DashboardPage />
  }
}

export default function Home() {
  const { page, user, setPage } = useAppStore()
  const restoreSession = useAppStore((s) => s.restoreSession)

  // Restore auth state from localStorage and Supabase session on mount
  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  // Public pages (not authenticated)
  // Note: 'register' is disabled for public — users are created by admins only
  const isPublicPage = ['landing', 'login', 'forgot-password'].includes(page)

  if (!user && !isPublicPage) {
    // Not authenticated and trying to access private page
    return <LandingPage />
  }

  // Public pages
  if (isPublicPage) {
    switch (page) {
      case 'login':
        return <LoginForm />
      case 'forgot-password':
        return <ForgotPasswordForm />
      default:
        return <LandingPage />
    }
  }

  // Authenticated pages
  return (
    <AppLayout>
      <PageRenderer page={page} />
    </AppLayout>
  )
}
