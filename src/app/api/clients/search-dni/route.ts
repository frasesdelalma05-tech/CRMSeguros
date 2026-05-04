import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { canSearchDni, hasAdminAccess, isCorredor } from '@/lib/permissions';

// GET /api/clients/search-dni?dni=12345678A
// Legacy centralized search by document number - kept for backward compatibility
// New code should use /api/search/client?document=XXXXXXXX
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Check permission using shared helper
    if (!canSearchDni(user.roleName)) {
      return NextResponse.json({ error: 'No tienes permiso para buscar por documento' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentQuery = searchParams.get('dni')?.trim();

    if (!documentQuery || documentQuery.length < 3) {
      return NextResponse.json({ error: 'El número de documento debe tener al menos 3 caracteres' }, { status: 400 });
    }

    // Search client by documentNumber (case-insensitive)
    const clients = await db.client.findMany({
      where: {
        documentNumber: { contains: documentQuery, mode: 'insensitive' },
        deletedAt: null,
      },
      include: {
        ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
        policies: {
          where: { deletedAt: null },
          include: {
            soldByAgent: { select: { id: true, name: true, lastName: true } },
            ownerAgent: { select: { id: true, name: true, lastName: true } },
            product: { select: { id: true, name: true, category: true } },
          },
        },
        leads: {
          where: { deletedAt: null },
          include: {
            agent: { select: { id: true, name: true, lastName: true } },
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        _count: { select: { policies: true, opportunities: true } },
      },
    });

    // Determine if the current user can edit each client
    const results = clients.map(client => ({
      ...client,
      canEdit: hasAdminAccess(user.roleName) || (isCorredor(user.roleName) && client.ownerAgentId === user.userId),
      belongsToCurrentUser: client.ownerAgentId === user.userId,
    }));

    // Audit log for document search
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'search_dni',
        entity: 'client',
        details: JSON.stringify({ documentNumber: documentQuery, resultsCount: results.length }),
      },
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Document search error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
