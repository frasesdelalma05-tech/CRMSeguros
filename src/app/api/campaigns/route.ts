import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createCampaignSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  objective: z.string().optional(),
  type: z.enum(['email', 'llamada', 'sms', 'whatsapp', 'mixta']),
  segment: z.enum(['todos', 'clientes_activos', 'prospectos', 'polizas_por_vencer', 'cumpleanos']).optional(),
  productId: z.string().optional(),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria'),
  endDate: z.string().optional(),
  status: z.enum(['borrador', 'activa', 'pausada', 'completada', 'cancelada']).optional(),
  responsibleId: z.string().optional(),
  metrics: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [campaigns, total] = await Promise.all([
      db.campaign.findMany({
        where,
        include: {
          responsible: { select: { id: true, name: true, lastName: true } },
          _count: { select: { members: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.campaign.count({ where }),
    ]);

    return NextResponse.json({
      data: campaigns,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Campaigns list error:', error);
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
    const validation = createCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const campaign = await db.campaign.create({
      data: {
        ...data,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        responsible: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'campaign',
        entityId: campaign.id,
        details: JSON.stringify({ name: data.name, type: data.type }),
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    console.error('Campaign create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
