import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin, isAdministrador } from '@/lib/permissions';

// ============================================================
// GET /api/admin/agents/[id]/portfolio - Get full portfolio for an agent
// ============================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;

    // Get the agent with manager info
    const agent = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, lastName: true, email: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agente no encontrado' }, { status: 404 });
    }

    // Verify the user is a corredor
    if (agent.role.name !== 'corredor') {
      return NextResponse.json(
        { error: 'El usuario especificado no es un corredor/agente.' },
        { status: 400 }
      );
    }

    // Permission check: administrador can only see their managed corredores
    if (isAdministrador(user.roleName)) {
      if (agent.managerId !== user.userId && agent.createdById !== user.userId) {
        return NextResponse.json(
          { error: 'Solo puedes ver el portafolio de corredores que gestionas o creaste.' },
          { status: 403 }
        );
      }
    }

    // Fetch portfolio data in parallel
    const [clients, policies, appointments, totalPremiumResult, pendingAppointmentsCount] =
      await Promise.all([
        // Assigned clients
        db.client.findMany({
          where: {
            ownerAgentId: id,
            deletedAt: null,
          },
          include: {
            policies: {
              where: { deletedAt: null },
              select: {
                id: true,
                policyNumber: true,
                productName: true,
                status: true,
                premium: true,
                startDate: true,
                endDate: true,
              },
            },
            loyaltyScore: {
              select: {
                score: true,
                isAtRisk: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Sold/owned policies
        db.policy.findMany({
          where: {
            deletedAt: null,
            OR: [{ soldByAgentId: id }, { ownerAgentId: id }],
          },
          include: {
            client: { select: { id: true, name: true, lastName: true, email: true } },
            product: { select: { id: true, name: true, category: true } },
          },
          orderBy: { createdAt: 'desc' },
        }),

        // Appointments count (all)
        db.appointment.count({
          where: {
            agentId: id,
            deletedAt: null,
          },
        }),

        // Total premium from active policies
        db.policy.aggregate({
          _sum: { premium: true },
          where: {
            status: 'activa',
            deletedAt: null,
            OR: [{ soldByAgentId: id }, { ownerAgentId: id }],
          },
        }),

        // Pending appointments count
        db.appointment.count({
          where: {
            agentId: id,
            status: 'programada',
            deletedAt: null,
          },
        }),
      ]);

    // Remove sensitive fields from agent
    const { password, refreshToken, ...safeAgent } = agent;

    // Remove sensitive fields from clients
    const safeClients = clients.map((c) => {
      const { deletedAt, ...rest } = c;
      return rest;
    });

    // Remove sensitive fields from policies
    const safePolicies = policies.map((p) => {
      const { deletedAt, ...rest } = p;
      return rest;
    });

    return NextResponse.json({
      data: {
        agent: safeAgent,
        clients: safeClients,
        policies: safePolicies,
        appointments,
        totalPremium: totalPremiumResult._sum.premium ?? 0,
        pendingAppointments: pendingAppointmentsCount,
      },
    });
  } catch (error) {
    console.error('Agent portfolio error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
