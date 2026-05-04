import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { isSuperAdmin } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA
// ============================================================
const updateAdminSchema = z.object({
  name: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  documentType: z.string().optional(),
  documentNumber: z.string().optional(),
  office: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================
// PATCH /api/admin/admins/[id] - Update administrador (super_admin only)
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

    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede editar administradores.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateAdminSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify target user exists and is an administrador
    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (targetUser.role.name !== 'administrador') {
      return NextResponse.json(
        { error: 'Este endpoint solo permite editar administradores.' },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check email uniqueness if changed
    if (data.email && data.email !== targetUser.email) {
      const emailExists = await db.user.findFirst({
        where: { email: data.email, id: { not: id } },
      });
      if (emailExists) {
        return NextResponse.json({ error: 'El email ya está registrado' }, { status: 409 });
      }

      // Update email in Supabase Auth too
      if (targetUser.supabaseId) {
        try {
          const supabase = createServerClient();
          await supabase.auth.admin.updateUserById(targetUser.supabaseId, {
            email: data.email,
          });
        } catch (err) {
          console.error('Failed to update email in Supabase Auth:', err);
          // Continue with DB update even if Supabase update fails
        }
      }
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.lastName !== undefined) updateData.lastName = data.lastName || null;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.documentType !== undefined) updateData.documentType = data.documentType || null;
    if (data.documentNumber !== undefined) updateData.documentNumber = data.documentNumber || null;
    if (data.office !== undefined) updateData.office = data.office || null;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    const updatedUser = await db.user.update({
      where: { id },
      data: updateData,
      include: {
        role: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
        _count: {
          select: {
            managedUsers: true,
            createdUsers: true,
          },
        },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'admin',
        entityId: id,
        details: JSON.stringify({
          adminEmail: targetUser.email,
          adminName: `${targetUser.name} ${targetUser.lastName}`,
          changedFields: Object.keys(updateData),
          updatedBy: user.roleName,
        }),
      },
    });

    // Remove sensitive fields
    const { password, refreshToken, ...safeUser } = updatedUser;

    // Get stats for managed corredores
    const managedAgentIds = await db.user.findMany({
      where: { managerId: id, deletedAt: null },
      select: { id: true },
    });
    const agentIds = managedAgentIds.map((a) => a.id);

    let totalClients = 0;
    let totalPolicies = 0;

    if (agentIds.length > 0) {
      totalClients = await db.client.count({
        where: {
          ownerAgentId: { in: agentIds },
          deletedAt: null,
        },
      });

      totalPolicies = await db.policy.count({
        where: {
          deletedAt: null,
          OR: [
            { soldByAgentId: { in: agentIds } },
            { ownerAgentId: { in: agentIds } },
          ],
        },
      });
    }

    return NextResponse.json({ data: { ...safeUser, totalClients, totalPolicies } });
  } catch (error) {
    console.error('Admin update error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
