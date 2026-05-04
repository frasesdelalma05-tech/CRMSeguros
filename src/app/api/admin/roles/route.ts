import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!['super_administrador', 'administrador'].includes(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const roles = await db.role.findMany({
      include: {
        permissions: { select: { id: true, name: true, module: true, action: true } },
        _count: { select: { users: { where: { isActive: true, deletedAt: null } } } },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ data: roles });
  } catch (error) {
    console.error('Admin roles list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
