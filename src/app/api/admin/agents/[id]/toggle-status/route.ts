import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';

// PATCH /api/admin/agents/[id]/toggle-status - Toggle agent active/inactive
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Solo administradores pueden activar/desactivar corredores' }, { status: 403 });
    }

    const { id } = await params;

    // Verify target user exists and is a corredor
    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.role.name !== 'corredor') {
      return NextResponse.json({ error: 'Solo se puede cambiar el estado de corredores/agentes desde este endpoint' }, { status: 400 });
    }

    // Cannot change your own status
    if (id === user.userId) {
      return NextResponse.json({ error: 'No puedes cambiar tu propio estado' }, { status: 400 });
    }

    // Toggle status
    const newIsActive = !targetUser.isActive;

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: newIsActive },
      include: {
        role: { select: { id: true, name: true } },
        _count: {
          select: {
            assignedClients: true,
            soldPolicies: true,
            ownedPolicies: true,
          },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: newIsActive ? 'activate' : 'deactivate',
        entity: 'agent',
        entityId: id,
        details: JSON.stringify({
          agentEmail: targetUser.email,
          agentName: `${targetUser.name} ${targetUser.lastName}`,
          previousStatus: targetUser.isActive,
          newStatus: newIsActive,
        }),
      },
    });

    // Remove sensitive fields
    const { password, refreshToken, ...safeUser } = updatedUser;

    return NextResponse.json({
      data: safeUser,
      message: newIsActive ? 'Corredor activado correctamente' : 'Corredor desactivado correctamente',
    });
  } catch (error) {
    console.error('Agent toggle status error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
