import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Total clients (not deleted)
    const totalClients = await db.client.count({
      where: { deletedAt: null },
    });

    // Total leads
    const totalLeads = await db.lead.count({
      where: { deletedAt: null },
    });

    // Active policies
    const activePolicies = await db.policy.count({
      where: { deletedAt: null, status: 'activa' },
    });

    // Expiring policies (next 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringPolicies = await db.policy.count({
      where: {
        deletedAt: null,
        status: 'activa',
        endDate: { gte: now, lte: thirtyDaysFromNow },
      },
    });

    // Today's appointments
    const todayAppointments = await db.appointment.count({
      where: {
        deletedAt: null,
        date: { gte: startOfDay, lt: endOfDay },
      },
    });

    // Open opportunities
    const openOpportunities = await db.opportunity.count({
      where: {
        deletedAt: null,
        status: { notIn: ['ganado', 'perdido'] },
      },
    });

    // Monthly conversion rate
    const monthLeads = await db.lead.count({
      where: {
        deletedAt: null,
        createdAt: { gte: startOfMonth },
      },
    });
    const monthWonLeads = await db.lead.count({
      where: {
        deletedAt: null,
        status: 'ganado',
        createdAt: { gte: startOfMonth },
      },
    });
    const monthlyConversion = monthLeads > 0 ? Math.round((monthWonLeads / monthLeads) * 100) : 0;

    // Estimated revenue (total active policies premium)
    const revenueResult = await db.policy.aggregate({
      where: { deletedAt: null, status: 'activa' },
      _sum: { premium: true },
    });
    const estimatedRevenue = revenueResult._sum.premium || 0;

    // At-risk clients
    const atRiskClients = await db.loyaltyScore.count({
      where: { isAtRisk: true },
    });

    // Pending tasks
    const pendingTasks = await db.task.count({
      where: {
        deletedAt: null,
        status: { in: ['pendiente', 'en_progreso'] },
      },
    });

    // Recent activities (last 10 audit logs)
    const recentActivities = await db.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, lastName: true } },
      },
    });

    return NextResponse.json({
      data: {
        totalClients,
        totalLeads,
        activePolicies,
        expiringPolicies,
        todayAppointments,
        openOpportunities,
        monthlyConversion,
        estimatedRevenue,
        atRiskClients,
        pendingTasks,
        recentActivities: recentActivities.map((a) => ({
          id: a.id,
          action: a.action,
          entity: a.entity,
          entityId: a.entityId,
          details: a.details,
          userName: a.user ? `${a.user.name} ${a.user.lastName || ''}`.trim() : 'Sistema',
          createdAt: a.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
