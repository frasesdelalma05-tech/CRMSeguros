import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  canUpdatePolicies,
  canDeletePolicies,
  isCorredor,
  hasAdminAccess,
} from '@/lib/permissions';

const updatePolicySchema = z.object({
  policyNumber: z.string().optional(),
  clientId: z.string().optional(),
  productId: z.string().nullable().optional(),
  productName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['activa', 'pendiente', 'vencida', 'cancelada', 'en_renovacion']).optional(),
  premium: z.number().min(0).optional(),
  paymentMethod: z.enum(['mensual', 'trimestral', 'semestral', 'anual']).optional(),
  coverages: z.string().optional(),
  renewalDate: z.string().optional(),
  cancellationDate: z.string().optional(),
  cancellationReason: z.string().optional(),
  ownerAgentId: z.string().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;

    const policy = await db.policy.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        product: { select: { id: true, name: true, category: true, description: true } },
        soldByAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
        ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
        incidents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        documents: { where: { deletedAt: null } },
        tasks: { where: { deletedAt: null }, orderBy: { dueDate: 'asc' } },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
    }

    // Corredor access check: can only see policies they sold or own
    if (isCorredor(user.roleName)) {
      if (policy.soldByAgentId !== user.userId && policy.ownerAgentId !== user.userId) {
        return NextResponse.json({ error: 'No tienes permiso para ver esta póliza' }, { status: 403 });
      }
    }

    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error('Policy get error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Permission check: only admin roles can update policies
    if (!canUpdatePolicies(user.roleName)) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar pólizas. Solo administradores pueden modificar pólizas.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updatePolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.policy.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
    }

    const data = validation.data;

    const policy = await db.policy.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
        cancellationDate: data.cancellationDate ? new Date(data.cancellationDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        product: { select: { id: true, name: true, category: true } },
        soldByAgent: { select: { id: true, name: true, lastName: true } },
        ownerAgent: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'policy',
        entityId: id,
        details: JSON.stringify({
          changedFields: Object.keys(data),
          policyNumber: existing.policyNumber,
        }),
      },
    });

    return NextResponse.json({ data: policy });
  } catch (error) {
    console.error('Policy update error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // BUSINESS RULE: Only super_administrador can delete sensitive data
    if (!canDeletePolicies(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede eliminar pólizas. Los administradores pueden cancelar pólizas.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.policy.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Póliza no encontrada' }, { status: 404 });
    }

    // Soft delete
    await db.policy.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'policy',
        entityId: id,
        details: JSON.stringify({ policyNumber: existing.policyNumber, clientId: existing.clientId, premium: existing.premium }),
      },
    });

    return NextResponse.json({ data: { message: 'Póliza eliminada correctamente' } });
  } catch (error) {
    console.error('Policy delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
