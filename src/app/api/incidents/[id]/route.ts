import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateIncidentSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  status: z.enum(['abierta', 'en_proceso', 'resuelta', 'cerrada']).optional(),
  clientId: z.string().nullable().optional(),
  policyId: z.string().nullable().optional(),
  assignedTo: z.string().nullable().optional(),
  resolution: z.string().optional(),
  internalNotes: z.string().optional(),
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

    const incident = await db.incident.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        policy: { select: { id: true, policyNumber: true, productName: true, status: true } },
        documents: { where: { deletedAt: null } },
      },
    });

    if (!incident) {
      return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: incident });
  } catch (error) {
    console.error('Incident get error:', error);
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
    const validation = updateIncidentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.incident.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
    }

    const data = validation.data;

    const incident = await db.incident.update({
      where: { id },
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
        action: 'update',
        entity: 'incident',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: incident });
  } catch (error) {
    console.error('Incident update error:', error);
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

    const existing = await db.incident.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Incidencia no encontrada' }, { status: 404 });
    }

    await db.incident.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'incident',
        entityId: id,
      },
    });

    return NextResponse.json({ data: { message: 'Incidencia eliminada correctamente' } });
  } catch (error) {
    console.error('Incident delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
