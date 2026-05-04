import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createInteractionSchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  leadId: z.string().optional(),
  type: z.enum(['llamada', 'email', 'sms', 'whatsapp', 'visita', 'reunion', 'nota']),
  direction: z.enum(['entrante', 'saliente']).optional(),
  subject: z.string().optional(),
  notes: z.string().min(1, 'Las notas son obligatorias'),
  agentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || '';
    const leadId = searchParams.get('leadId') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (clientId) {
      where.clientId = clientId;
    }

    if (leadId) {
      where.leadId = leadId;
    }

    if (type) {
      where.type = type;
    }

    const [interactions, total] = await Promise.all([
      db.interaction.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true } },
          lead: { select: { id: true, source: true, status: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.interaction.count({ where }),
    ]);

    return NextResponse.json({
      data: interactions,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Interactions list error:', error);
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
    const validation = createInteractionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Verify client exists
    const client = await db.client.findFirst({ where: { id: data.clientId, deletedAt: null } });
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    const interaction = await db.interaction.create({
      data: {
        ...data,
        agentId: data.agentId || user.userId,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'interaction',
        entityId: interaction.id,
        details: JSON.stringify({ clientId: data.clientId, type: data.type }),
      },
    });

    return NextResponse.json({ data: interaction }, { status: 201 });
  } catch (error) {
    console.error('Interaction create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
