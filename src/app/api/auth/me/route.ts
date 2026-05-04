import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    // authenticateRequestWithSupabase tries Supabase Auth first,
    // then falls back to legacy JWT
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const fullUser = await db.user.findUnique({
      where: { id: user.userId },
      include: { role: { include: { permissions: true } } },
    });

    if (!fullUser || !fullUser.isActive) {
      return NextResponse.json(
        { error: 'Usuario no encontrado o inactivo' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: {
        id: fullUser.id,
        email: fullUser.email,
        name: fullUser.name,
        lastName: fullUser.lastName,
        phone: fullUser.phone,
        avatar: fullUser.avatar,
        isActive: fullUser.isActive,
        lastLogin: fullUser.lastLogin,
        role: {
          id: fullUser.role.id,
          name: fullUser.role.name,
          description: fullUser.role.description,
          permissions: fullUser.role.permissions.map((p) => ({
            id: p.id,
            name: p.name,
            module: p.module,
            action: p.action,
          })),
        },
        createdAt: fullUser.createdAt,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
