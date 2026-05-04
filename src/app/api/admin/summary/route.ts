import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const isSuper = user.roleName === 'super_administrador';

    // Get role IDs
    const adminRole = await db.role.findFirst({ where: { name: 'administrador' } });
    const corredorRole = await db.role.findFirst({ where: { name: 'corredor' } });

    const baseFilter = { deletedAt: null };
    const adminFilter = adminRole ? { ...baseFilter, roleId: adminRole.id } : baseFilter;
    const corredorFilter = corredorRole ? { ...baseFilter, roleId: corredorRole.id } : baseFilter;

    // For administrador: only count their managed corredores
    const corredorWhere = isSuper
      ? corredorFilter
      : { ...corredorFilter, managerId: user.userId };

    const clientWhere = isSuper
      ? { deletedAt: null }
      : { deletedAt: null, ownerAgentId: { in: await getManagedAgentIds(user.userId) } };

    const [
      totalAdmins,
      totalCorredores,
      corredoresActivos,
      corredoresInactivos,
      totalClientes,
      totalPolizas,
      policyPremiumResult,
    ] = await Promise.all([
      isSuper ? db.user.count({ where: adminFilter }) : Promise.resolve(1),
      db.user.count({ where: corredorWhere }),
      db.user.count({ where: { ...corredorWhere, isActive: true } }),
      db.user.count({ where: { ...corredorWhere, isActive: false } }),
      db.client.count({ where: clientWhere }),
      db.policy.count({ where: { deletedAt: null, ...(isSuper ? {} : { ownerAgentId: { in: await getManagedAgentIds(user.userId) } }) } }),
      db.policy.aggregate({
        where: { deletedAt: null, status: 'activa', ...(isSuper ? {} : { ownerAgentId: { in: await getManagedAgentIds(user.userId) } }) },
        _sum: { premium: true },
      }),
    ]);

    return NextResponse.json({
      data: {
        totalAdmins,
        totalCorredores,
        corredoresActivos,
        corredoresInactivos,
        totalClientes,
        totalPolizas,
        primaTotalEstimada: policyPremiumResult._sum.premium || 0,
      },
    });
  } catch (error) {
    console.error('Admin summary error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

async function getManagedAgentIds(adminId: string): Promise<string[]> {
  const managedUsers = await db.user.findMany({
    where: { managerId: adminId, deletedAt: null },
    select: { id: true },
  });
  return [...managedUsers.map((u) => u.id), adminId];
}
