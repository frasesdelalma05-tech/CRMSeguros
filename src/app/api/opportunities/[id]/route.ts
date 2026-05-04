import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateOpportunitySchema = z.object({
  clientId: z.string().optional(),
  leadId: z.string().nullable().optional(),
  product: z.string().optional(),
  productId: z.string().optional(),
  estimatedPremium: z.number().min(0).optional(),
  probability: z.number().min(0).max(100).optional(),
  status: z.enum(['nuevo', 'contactado', 'cita_programada', 'en_estudio', 'propuesta_enviada', 'negociacion', 'ganado', 'perdido']).optional(),
  agentId: z.string().nullable().optional(),
  closingDate: z.string().optional(),
  notes: z.string().optional(),
  nextAction: z.string().optional(),
  nextActionDate: z.string().optional(),
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

    const opportunity = await db.opportunity.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        lead: { select: { id: true, source: true, status: true } },
        tasks: { where: { deletedAt: null }, orderBy: { dueDate: 'asc' } },
        documents: { where: { deletedAt: null } },
      },
    });

    if (!opportunity) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: opportunity });
  } catch (error) {
    console.error('Opportunity get error:', error);
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
    const validation = updateOpportunitySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.opportunity.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 });
    }

    const data = validation.data;

    const opportunity = await db.opportunity.update({
      where: { id },
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
        action: 'update',
        entity: 'opportunity',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: opportunity });
  } catch (error) {
    console.error('Opportunity update error:', error);
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

    const existing = await db.opportunity.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Oportunidad no encontrada' }, { status: 404 });
    }

    await db.opportunity.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'opportunity',
        entityId: id,
      },
    });

    return NextResponse.json({ data: { message: 'Oportunidad eliminada correctamente' } });
  } catch (error) {
    console.error('Opportunity delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
