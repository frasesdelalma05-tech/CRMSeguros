import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';

// ============================================================
// PATCH /api/admin/users/[id]/toggle-status - Toggle user active/inactive
// ============================================================
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
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;

    // Cannot deactivate yourself
    if (id === user.userId) {
      return NextResponse.json(
        { error: 'No puedes cambiar tu propio estado.' },
        { status: 400 }
      );
    }

    // Verify target user exists
    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Only super_administrador can deactivate administrador users
    if (targetUser.role.name === 'administrador' && !isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede cambiar el estado de un administrador.' },
        { status: 403 }
      );
    }

    // Toggle status
    const newIsActive = !targetUser.isActive;

    const updatedUser = await db.user.update({
      where: { id },
      data: { isActive: newIsActive },
      include: {
        role: { select: { id: true, name: true, description: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'user_status',
        entityId: id,
        details: JSON.stringify({
          targetUserEmail: targetUser.email,
          previousStatus: targetUser.isActive,
          newStatus: newIsActive,
        }),
      },
    });

    // Remove sensitive fields
    const { password, refreshToken, ...safeUser } = updatedUser;

    return NextResponse.json({
      data: safeUser,
      message: newIsActive ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente',
    });
  } catch (error) {
    console.error('Admin user toggle status error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
