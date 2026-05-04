import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createLeadSchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  agentId: z.string().optional(),
  source: z.enum(['web', 'referido', 'campana', 'cold_call', 'evento']).optional(),
  status: z.enum(['nuevo', 'contactado', 'cita_programada', 'en_estudio', 'propuesta_enviada', 'negociacion', 'ganado', 'perdido']).optional(),
  estimatedPremium: z.number().optional(),
  probability: z.number().min(0).max(100).optional(),
  product: z.string().optional(),
  productId: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
  closingDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const agentId = searchParams.get('agentId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { product: { contains: search } },
        { notes: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { lastName: { contains: search } } },
        { client: { email: { contains: search } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true } },
          agent: { select: { id: true, name: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      data: leads,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Leads list error:', error);
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
    const validation = createLeadSchema.safeParse(body);

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

    const lead = await db.lead.create({
      data: {
        ...data,
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
        closingDate: data.closingDate ? new Date(data.closingDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        agent: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'lead',
        entityId: lead.id,
        details: JSON.stringify({ clientId: data.clientId, product: data.product }),
      },
    });

    return NextResponse.json({ data: lead }, { status: 201 });
  } catch (error) {
    console.error('Lead create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
