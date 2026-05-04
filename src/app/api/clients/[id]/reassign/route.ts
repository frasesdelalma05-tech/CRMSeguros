import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { canReassign } from '@/lib/permissions';

const reassignSchema = z.object({
  ownerAgentId: z.string().min(1, 'El ID del corredor es obligatorio'),
});

// PATCH /api/clients/[id]/reassign - Reassign client to a different corredor
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!canReassign(user.roleName)) {
      return NextResponse.json({ error: 'Solo administradores pueden reasignar clientes' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = reassignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { ownerAgentId } = validation.data;

    // Verify client exists
    const client = await db.client.findFirst({ where: { id, deletedAt: null } });
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Verify agent exists and is active
    const agent = await db.user.findFirst({
      where: { id: ownerAgentId, isActive: true, deletedAt: null },
      include: { role: true },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Corredor no encontrado o inactivo' }, { status: 404 });
    }

    const previousAgentId = client.ownerAgentId;

    // Update client
    const updated = await db.client.update({
      where: { id },
      data: { ownerAgentId, updatedById: user.userId },
      include: {
        ownerAgent: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'reassign',
        entity: 'client',
        entityId: id,
        details: JSON.stringify({ previousAgentId, newAgentId: ownerAgentId, clientName: `${client.name} ${client.lastName}` }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Client reassign error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
