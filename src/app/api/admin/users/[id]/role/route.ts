import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA
// ============================================================
const changeRoleSchema = z.object({
  roleId: z.string().min(1, 'El rol es obligatorio'),
});

// ============================================================
// PATCH /api/admin/users/[id]/role - Change user role
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
    const body = await request.json();
    const validation = changeRoleSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { roleId } = validation.data;

    // Verify target user exists
    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verify new role exists
    const newRole = await db.role.findUnique({ where: { id: roleId } });
    if (!newRole) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
    }

    // Only super_administrador can assign super_administrador role
    if (newRole.name === 'super_administrador' && !isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede asignar el rol de super administrador.' },
        { status: 403 }
      );
    }

    // Only super_administrador can change roles of administrador users
    if (targetUser.role.name === 'administrador' && !isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede cambiar el rol de un administrador.' },
        { status: 403 }
      );
    }

    // Cannot remove your own super_administrador role if you're the only one
    if (
      isSuperAdmin(user.roleName) &&
      id === user.userId &&
      newRole.name !== 'super_administrador'
    ) {
      const superAdminCount = await db.user.count({
        where: {
          isActive: true,
          deletedAt: null,
          role: { name: 'super_administrador' },
        },
      });

      if (superAdminCount <= 1) {
        return NextResponse.json(
          { error: 'No puedes remover tu rol de super administrador porque eres el único. Asigna otro super administrador primero.' },
          { status: 400 }
        );
      }
    }

    // Update role
    const updatedUser = await db.user.update({
      where: { id },
      data: { roleId },
      include: {
        role: { select: { id: true, name: true, description: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'user_role',
        entityId: id,
        details: JSON.stringify({
          previousRole: targetUser.role.name,
          newRole: newRole.name,
          targetUserEmail: targetUser.email,
        }),
      },
    });

    // Remove sensitive fields
    const { password, refreshToken, ...safeUser } = updatedUser;

    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error('Admin user role change error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
