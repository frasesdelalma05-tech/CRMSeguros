import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { isSuperAdmin, isAdministrador } from '@/lib/permissions';

// ============================================================
// ZOD SCHEMA
// ============================================================
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

// ============================================================
// PATCH /api/admin/users/[id]/reset-password - Reset user password
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

    // Only super_admin and administrador can reset passwords
    if (!isSuperAdmin(user.roleName) && !isAdministrador(user.roleName)) {
      return NextResponse.json(
        { error: 'No tienes permiso para restablecer contraseñas.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = resetPasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { newPassword } = validation.data;

    // Verify target user exists
    const targetUser = await db.user.findFirst({
      where: { id, deletedAt: null },
      include: { role: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Permission check: administrador can only reset passwords for their managed corredores
    if (isAdministrador(user.roleName)) {
      // Must be a corredor
      if (targetUser.role.name !== 'corredor') {
        return NextResponse.json(
          { error: 'Solo puedes restablecer contraseñas de corredores bajo tu supervisión.' },
          { status: 403 }
        );
      }

      // Must be managed by this administrador
      if (targetUser.managerId !== user.userId && targetUser.createdById !== user.userId) {
        return NextResponse.json(
          { error: 'Solo puedes restablecer contraseñas de corredores que gestionas o creaste.' },
          { status: 403 }
        );
      }
    }

    // Reset password via Supabase Auth
    if (!targetUser.supabaseId) {
      return NextResponse.json(
        { error: 'El usuario no tiene una cuenta de autenticación vinculada.' },
        { status: 400 }
      );
    }

    try {
      const supabase = createServerClient();
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        targetUser.supabaseId,
        { password: newPassword }
      );

      if (updateError) {
        return NextResponse.json(
          { error: `Error al restablecer la contraseña: ${updateError.message}` },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('Supabase password reset error:', err);
      return NextResponse.json(
        { error: 'Error al restablecer la contraseña en Supabase Auth.' },
        { status: 500 }
      );
    }

    // Audit log (without storing the password)
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'user',
        entityId: id,
        details: JSON.stringify({
          actionType: 'reset_password',
          targetEmail: targetUser.email,
          targetName: `${targetUser.name} ${targetUser.lastName}`,
          targetRole: targetUser.role.name,
          resetBy: user.roleName,
          // Explicitly NOT storing the password
        }),
      },
    });

    return NextResponse.json({
      message: 'Contraseña restablecida correctamente',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
