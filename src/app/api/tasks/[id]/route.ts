import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateTaskSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  clientId: z.string().nullable().optional(),
  opportunityId: z.string().nullable().optional(),
  policyId: z.string().nullable().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  status: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).optional(),
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

    const task = await db.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        opportunity: { select: { id: true, product: true, status: true } },
        policy: { select: { id: true, policyNumber: true, productName: true } },
        assignee: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Task get error:', error);
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

    const { id } = await params;
    const body = await request.json();
    const validation = updateTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    const data = validation.data;

    // If completing task, set completedAt
    const completedAt = data.status === 'completada' && existing.status !== 'completada' ? new Date() : undefined;

    const task = await db.task.update({
      where: { id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        completedAt,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true } },
        assignee: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'task',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: task });
  } catch (error) {
    console.error('Task update error:', error);
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

    const { id } = await params;

    const existing = await db.task.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    await db.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'task',
        entityId: id,
      },
    });

    return NextResponse.json({ data: { message: 'Tarea eliminada correctamente' } });
  } catch (error) {
    console.error('Task delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
