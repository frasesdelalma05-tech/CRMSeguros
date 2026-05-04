import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createTaskSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  clientId: z.string().optional(),
  opportunityId: z.string().optional(),
  policyId: z.string().optional(),
  assigneeId: z.string().min(1, 'El asignado es obligatorio'),
  dueDate: z.string().min(1, 'La fecha límite es obligatoria'),
  priority: z.enum(['baja', 'media', 'alta', 'urgente']).optional(),
  status: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const assigneeId = searchParams.get('assigneeId') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const clientId = searchParams.get('clientId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (assigneeId) {
      where.assigneeId = assigneeId;
    }

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const [tasks, total] = await Promise.all([
      db.task.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true } },
          opportunity: { select: { id: true, product: true } },
          policy: { select: { id: true, policyNumber: true, productName: true } },
          assignee: { select: { id: true, name: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { dueDate: 'asc' },
      }),
      db.task.count({ where }),
    ]);

    return NextResponse.json({
      data: tasks,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Tasks list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createTaskSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const task = await db.task.create({
      data: {
        ...data,
        dueDate: new Date(data.dueDate),
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
        action: 'create',
        entity: 'task',
        entityId: task.id,
        details: JSON.stringify({ title: data.title, assigneeId: data.assigneeId }),
      },
    });

    return NextResponse.json({ data: task }, { status: 201 });
  } catch (error) {
    console.error('Task create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
