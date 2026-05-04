import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin, isAdministrador } from '@/lib/permissions';

// GET /api/admin/summary — Dashboard summary KPIs
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Get role IDs
    const [adminRole, corredorRole] = await Promise.all([
      db.role.findFirst({ where: { name: 'administrador' } }),
      db.role.findFirst({ where: { name: 'corredor' } }),
    ]);

    if (isSuperAdmin(user.roleName)) {
      // ── super_administrador: full overview ──
      const [totalAdmins, totalCorredores, totalClients, totalActivePolicies, premiumResult] =
        await Promise.all([
          db.user.count({
            where: { roleId: adminRole?.id, deletedAt: null },
          }),
          db.user.count({
            where: { roleId: corredorRole?.id, deletedAt: null },
          }),
          db.client.count({ where: { deletedAt: null } }),
          db.policy.count({
            where: { status: 'activa', deletedAt: null },
          }),
          db.policy.aggregate({
            where: { status: 'activa', deletedAt: null },
            _sum: { premium: true },
          }),
        ]);

      const totalPremium = premiumResult._sum.premium ?? 0;

      // For each administrador: their corredores, clients, policies, premium
      const admins = await db.user.findMany({
        where: { roleId: adminRole?.id, deletedAt: null },
        select: {
          id: true,
          name: true,
          lastName: true,
          email: true,
          isActive: true,
          managedUsers: {
            where: { roleId: corredorRole?.id, deletedAt: null },
            select: { id: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Build per-admin stats
      const adminsWithStats = await Promise.all(
        admins.map(async (admin) => {
          const corredorIds = admin.managedUsers.map((mu) => mu.id);

          const [clientCount, policyCount, policyPremium] = corredorIds.length > 0
            ? await Promise.all([
                db.client.count({
                  where: { ownerAgentId: { in: corredorIds }, deletedAt: null },
                }),
                db.policy.count({
                  where: {
                    OR: [
                      { soldByAgentId: { in: corredorIds } },
                      { ownerAgentId: { in: corredorIds } },
                    ],
                    deletedAt: null,
                  },
                }),
                db.policy.aggregate({
                  where: {
                    OR: [
                      { soldByAgentId: { in: corredorIds } },
                      { ownerAgentId: { in: corredorIds } },
                    ],
                    status: 'activa',
                    deletedAt: null,
                  },
                  _sum: { premium: true },
                }),
              ])
            : [{ clientCount: 0 }, { policyCount: 0 }, { _sum: { premium: 0 } }];

          return {
            id: admin.id,
            name: admin.name,
            lastName: admin.lastName,
            email: admin.email,
            isActive: admin.isActive,
            corredoresCount: admin.managedUsers.length,
            clientsCount: corredorIds.length > 0 ? clientCount : 0,
            policiesCount: corredorIds.length > 0 ? policyCount : 0,
            premium: corredorIds.length > 0 ? (policyPremium._sum.premium ?? 0) : 0,
          };
        })
      );

      return NextResponse.json({
        data: {
          kpis: {
            totalAdmins,
            totalCorredores,
            totalClients,
            totalPolicies: totalActivePolicies,
            totalPremium,
          },
          admins: adminsWithStats,
        },
      });
    }

    if (isAdministrador(user.roleName)) {
      // ── administrador: only their corredores ──
      const corredores = await db.user.findMany({
        where: { managerId: user.userId, roleId: corredorRole?.id, deletedAt: null },
        select: { id: true, name: true, lastName: true, email: true, isActive: true },
      });

      const corredorIds = corredores.map((c) => c.id);

      const [totalClients, totalPolicies, premiumResult] = corredorIds.length > 0
        ? await Promise.all([
            db.client.count({
              where: { ownerAgentId: { in: corredorIds }, deletedAt: null },
            }),
            db.policy.count({
              where: {
                OR: [
                  { soldByAgentId: { in: corredorIds } },
                  { ownerAgentId: { in: corredorIds } },
                ],
                deletedAt: null,
              },
            }),
            db.policy.aggregate({
              where: {
                OR: [
                  { soldByAgentId: { in: corredorIds } },
                  { ownerAgentId: { in: corredorIds } },
                ],
                status: 'activa',
                deletedAt: null,
              },
              _sum: { premium: true },
            }),
          ])
        : [0, 0, { _sum: { premium: 0 } }];

      const totalPremium = premiumResult._sum.premium ?? 0;

      // Per-agent stats
      const agentsWithStats = await Promise.all(
        corredores.map(async (agent) => {
          const [clientCount, policyCount, policyPremium] = await Promise.all([
            db.client.count({
              where: { ownerAgentId: agent.id, deletedAt: null },
            }),
            db.policy.count({
              where: {
                OR: [{ soldByAgentId: agent.id }, { ownerAgentId: agent.id }],
                deletedAt: null,
              },
            }),
            db.policy.aggregate({
              where: {
                OR: [{ soldByAgentId: agent.id }, { ownerAgentId: agent.id }],
                status: 'activa',
                deletedAt: null,
              },
              _sum: { premium: true },
            }),
          ]);

          return {
            ...agent,
            clientsCount: clientCount,
            policiesCount: policyCount,
            premium: policyPremium._sum.premium ?? 0,
          };
        })
      );

      return NextResponse.json({
        data: {
          kpis: {
            totalCorredores: corredores.length,
            totalClients,
            totalPolicies,
            totalPremium,
          },
          agents: agentsWithStats,
        },
      });
    }

    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  } catch (error) {
    console.error('Admin summary error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
