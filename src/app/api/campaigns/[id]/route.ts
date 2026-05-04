import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateCampaignSchema = z.object({
  name: z.string().optional(),
  objective: z.string().optional(),
  type: z.enum(['email', 'llamada', 'sms', 'whatsapp', 'mixta']).optional(),
  segment: z.enum(['todos', 'clientes_activos', 'prospectos', 'polizas_por_vencer', 'cumpleanos']).optional(),
  productId: z.string().nullable().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  status: z.enum(['borrador', 'activa', 'pausada', 'completada', 'cancelada']).optional(),
  responsibleId: z.string().nullable().optional(),
  metrics: z.string().optional(),
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

    const campaign = await db.campaign.findFirst({
      where: { id, deletedAt: null },
      include: {
        responsible: { select: { id: true, name: true, lastName: true, email: true } },
        members: {
          include: {
            client: { select: { id: true, name: true, lastName: true, email: true } },
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: campaign });
  } catch (error) {
    console.error('Campaign get error:', error);
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
    const validation = updateCampaignSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.campaign.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    const data = validation.data;

    const campaign = await db.campaign.update({
      where: { id },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
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
        action: 'update',
        entity: 'campaign',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: campaign });
  } catch (error) {
    console.error('Campaign update error:', error);
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

    const existing = await db.campaign.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    await db.campaign.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'campaign',
        entityId: id,
      },
    });

    return NextResponse.json({ data: { message: 'Campaña eliminada correctamente' } });
  } catch (error) {
    console.error('Campaign delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
