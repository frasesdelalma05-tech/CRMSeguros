import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin, isAdministrador } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA
// ============================================================
const updateAgentSchema = z.object({
  name: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  managerId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// PATCH /api/admin/agents/[id] - Update agent details
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
      return NextResponse.json(
        { error: 'Solo administradores pueden editar corredores/agentes.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateAgentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify target user exists and is a corredor
    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.role.name !== 'corredor') {
      return NextResponse.json(
        { error: 'Este endpoint solo permite editar corredores/agentes.' },
        { status: 400 }
      );
    }

    // Permission check: administrador can only edit their own corredores
    if (isAdministrador(user.roleName)) {
      if (targetUser.managerId !== user.userId && targetUser.createdById !== user.userId) {
        return NextResponse.json(
          { error: 'Solo puedes editar corredores que gestionas o creaste.' },
          { status: 403 }
        );
      }

      // administrador cannot change managerId
      if (validation.data.managerId !== undefined) {
        return NextResponse.json(
          { error: 'No tienes permiso para cambiar el manager de un corredor.' },
          { status: 403 }
        );
      }
    }

    // Build update data
    const data = validation.data;
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.documentType !== undefined) updateData.documentType = data.documentType || null;
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber || null;
    if (data.office !== undefined) updateData.office = data.office || null;
    if (data.managerId !== undefined) updateData.managerId = data.managerId || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true } },
        manager: { select: { id: true, name: true, lastName: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
        _count: {
          select: {
            assignedClients: true,
            soldPolicies: true,
            ownedPolicies: true,
            assignedLeads: true,
          },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'agent',
        entityId: id,
        details: JSON.stringify({
          agentEmail: targetUser.email,
          agentName: `${targetUser.name} ${targetUser.lastName}`,
          changedFields: Object.keys(updateData),
          updatedBy: user.roleName,
        }),
      },
    });

    // Remove sensitive fields
    const { password, refreshToken, ...safeUser } = updatedUser;

    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error('Agent update error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
// ============================================================
// DELETE /api/admin/agents/[id] - Soft delete agent
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

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo administradores pueden eliminar corredores/agentes.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.role.name !== 'corredor') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar corredores/agentes desde este endpoint.' },
        { status: 400 }
      );
    }

    if (isAdministrador(user.roleName)) {
      if (targetUser.managerId !== user.userId && targetUser.createdById !== user.userId) {
        return NextResponse.json(
          { error: 'Solo puedes eliminar corredores que gestionas o creaste.' },
          { status: 403 }
        );
      }
    }

    await db.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'agent',
        entityId: id,
        details: JSON.stringify({
          agentEmail: targetUser.email,
          agentName: `${targetUser.name} ${targetUser.lastName ?? ''}`.trim(),
          deletedBy: user.roleName,
          softDelete: true,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Corredor eliminado correctamente',
    });
  } catch (error) {
    console.error('Agent delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
