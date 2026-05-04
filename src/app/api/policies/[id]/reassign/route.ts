import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { canReassign } from '@/lib/permissions';

const reassignSchema = z.object({
  ownerAgentId: z.string().min(1, 'El ID del corredor es obligatorio'),
});

// PATCH /api/policies/[id]/reassign - Reassign policy to a different corredor (owner agent)
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
      return NextResponse.json({ error: 'Solo administradores pueden reasignar pólizas' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = reassignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Datos inválidos', details: validation.error.flatten().fieldErrors }, { status: 400 });
    }

    const { ownerAgentId } = validation.data;

    // Verify policy exists
    const policy = await db.policy.findFirst({ where: { id, deletedAt: null } });
    if (!policy) {
      return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
    }

    // Verify agent exists and is active
    const agent = await db.user.findFirst({
      where: { id: ownerAgentId, isActive: true, deletedAt: null },
      include: { role: true },
    });
    if (!agent) {
      return NextResponse.json({ error: 'Corredor no encontrado o inactivo' }, { status: 404 });
    }

    const previousOwnerAgentId = policy.ownerAgentId;

    // Update policy owner agent (soldByAgentId remains unchanged)
    const updated = await db.policy.update({
      where: { id },
      data: { ownerAgentId },
      include: {
        soldByAgent: { select: { id: true, name: true, lastName: true } },
        ownerAgent: { select: { id: true, name: true, lastName: true } },
        client: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'reassign',
        entity: 'policy',
        entityId: id,
        details: JSON.stringify({ previousOwnerAgentId, newOwnerAgentId: ownerAgentId, policyNumber: policy.policyNumber }),
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Policy reassign error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
