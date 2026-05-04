import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase, hashPassword } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMAS
// ============================================================
const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  roleId: z.string().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// GET /api/admin/users/[id] - Get user with role + permissions
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

    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: {
        role: { include: { permissions: true } },
        manager: { select: { id: true, name: true, lastName: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Remove sensitive fields
    const { password, refreshToken, ...safeUser } = targetUser;

    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error('Admin user get error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================
// PUT /api/admin/users/[id] - Update user
// ============================================================
export async function PUT(
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
    const validation = updateUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const data = validation.data;

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const emailExists = await db.user.findFirst({
        where: { email: data.email, id: { not: id } },
      });
      if (emailExists) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
      }
    }

    // If changing roleId, enforce restrictions
    if (data.roleId) {
      const newRole = await db.role.findUnique({ where: { id: data.roleId } });
      if (!newRole) {
        return NextResponse.json({ error: 'Rol no encontrado' }, { status: 404 });
      }

      // Only super_administrador can assign super_administrador or administrador roles
      if (['super_administrador', 'administrador'].includes(newRole.name) && !isSuperAdmin(user.roleName)) {
        return NextResponse.json(
          { error: 'Solo un super administrador puede asignar roles de administrador.' },
          { status: 403 }
        );
      }
    }

    // Validate managerId if provided
    if (data.managerId !== undefined && data.managerId !== null) {
      const manager = await db.user.findFirst({
        where: { id: data.managerId, deletedAt: null },
        include: { role: true },
      });
      if (!manager) {
        return NextResponse.json({ error: 'Manager no encontrado' }, { status: 404 });
      }
      if (manager.role.name !== 'administrador') {
        return NextResponse.json(
          { error: 'El manager debe ser un administrador.' },
          { status: 400 }
        );
      }
    }

    // Cannot deactivate yourself
    if (data.isActive === false && id === user.userId) {
      return NextResponse.json(
        { error: 'No puedes desactivar tu propia cuenta.' },
        { status: 400 }
      );
    }

    // Build update data - no password updates here
    const updateData: Record<string, unknown> = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.documentType !== undefined) updateData.documentType = data.documentType || null;
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber || null;
    if (data.office !== undefined) updateData.office = data.office || null;
    if (data.roleId !== undefined) updateData.roleId = data.roleId;
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true, description: true } },
        manager: { select: { id: true, name: true, lastName: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'user',
        entityId: id,
        details: JSON.stringify({
          ...validation.data,
          changedFields: Object.keys(updateData),
        }),
      },
    });

    // Remove sensitive fields
    const { password: _, refreshToken: __, ...safeUser } = updatedUser;

    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error('Admin user update error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// ============================================================
// DELETE /api/admin/users/[id] - Soft delete (super_admin only)
// ============================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Only super_administrador can delete users
    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede eliminar usuarios.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Cannot delete yourself
    if (id === user.userId) {
      return NextResponse.json(
        { error: 'No puedes eliminar tu propia cuenta.' },
        { status: 400 }
      );
    }

    const existing = await db.user.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Soft delete
    await db.user.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'user',
        entityId: id,
        details: JSON.stringify({ email: existing.email, name: existing.name, method: 'soft_delete' }),
      },
    });

    return NextResponse.json({ data: { message: 'Usuario eliminado correctamente' } });
  } catch (error) {
    console.error('Admin user delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
