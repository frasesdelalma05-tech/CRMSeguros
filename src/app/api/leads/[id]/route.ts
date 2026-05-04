import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateLeadSchema = z.object({
  clientId: z.string().optional(),
  agentId: z.string().nullable().optional(),
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

    const lead = await db.lead.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        agent: { select: { id: true, name: true, lastName: true } },
        opportunities: { where: { deletedAt: null } },
        interactions: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: lead });
  } catch (error) {
    console.error('Lead get error:', error);
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
    const validation = updateLeadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    const data = validation.data;

    const lead = await db.lead.update({
      where: { id },
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
        action: 'update',
        entity: 'lead',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: lead });
  } catch (error) {
    console.error('Lead update error:', error);
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

    const existing = await db.lead.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    await db.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'lead',
        entityId: id,
      },
    });

    return NextResponse.json({ data: { message: 'Lead eliminado correctamente' } });
  } catch (error) {
    console.error('Lead delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
