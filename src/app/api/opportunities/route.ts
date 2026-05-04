import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createOpportunitySchema = z.object({
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  leadId: z.string().optional(),
  product: z.string().min(1, 'El producto es obligatorio'),
  productId: z.string().optional(),
  estimatedPremium: z.number().min(0, 'La prima estimada debe ser positiva'),
  probability: z.number().min(0).max(100).optional(),
  status: z.enum(['nuevo', 'contactado', 'cita_programada', 'en_estudio', 'propuesta_enviada', 'negociacion', 'ganado', 'perdido']).optional(),
  agentId: z.string().optional(),
  closingDate: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const agentId = searchParams.get('agentId') || '';
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

    if (agentId) {
      where.agentId = agentId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    const [opportunities, total] = await Promise.all([
      db.opportunity.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true } },
          lead: { select: { id: true, source: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.opportunity.count({ where }),
    ]);

    return NextResponse.json({
      data: opportunities,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Opportunities list error:', error);
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
    const validation = createOpportunitySchema.safeParse(body);

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

    const opportunity = await db.opportunity.create({
      data: {
        ...data,
        closingDate: data.closingDate ? new Date(data.closingDate) : undefined,
        nextActionDate: data.nextActionDate ? new Date(data.nextActionDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        lead: { select: { id: true, source: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'opportunity',
        entityId: opportunity.id,
        details: JSON.stringify({ clientId: data.clientId, product: data.product, estimatedPremium: data.estimatedPremium }),
      },
    });

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (error) {
    console.error('Opportunity create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
