import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createIncidentSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  priority: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  status: z.enum(['abierta', 'en_proceso', 'resuelta', 'cerrada']).optional(),
  clientId: z.string().optional(),
  policyId: z.string().optional(),
  assignedTo: z.string().optional(),
  resolution: z.string().optional(),
  internalNotes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const clientId = searchParams.get('clientId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const [incidents, total] = await Promise.all([
      db.incident.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true } },
          policy: { select: { id: true, policyNumber: true, productName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.incident.count({ where }),
    ]);

    return NextResponse.json({
      data: incidents,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Incidents list error:', error);
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
    const validation = createIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const incident = await db.incident.create({
      data,
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        policy: { select: { id: true, policyNumber: true, productName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'incident',
        entityId: incident.id,
        details: JSON.stringify({ title: data.title, priority: data.priority }),
      },
    });

    return NextResponse.json({ data: incident }, { status: 201 });
  } catch (error) {
    console.error('Incident create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
