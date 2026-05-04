import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateAppointmentSchema = z.object({
  clientId: z.string().nullable().optional(),
  agentId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['llamada', 'videollamada', 'visita_presencial', 'renovacion', 'seguimiento', 'firma_poliza']).optional(),
  status: z.enum(['programada', 'confirmada', 'completada', 'cancelada', 'reagendada']).optional(),
  date: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  reminder: z.boolean().optional(),
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

    const appointment = await db.appointment.findFirst({
      where: { id, deletedAt: null },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true, phone: true } },
        agent: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    if (!appointment) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ data: appointment });
  } catch (error) {
    console.error('Appointment get error:', error);
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
    const validation = updateAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.appointment.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    const data = validation.data;

    const appointment = await db.appointment.update({
      where: { id },
      data: {
        ...data,
        date: data.date ? new Date(data.date) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
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
        entity: 'appointment',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: appointment });
  } catch (error) {
    console.error('Appointment update error:', error);
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

    const existing = await db.appointment.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    await db.appointment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'appointment',
        entityId: id,
      },
    });

    return NextResponse.json({ data: { message: 'Cita eliminada correctamente' } });
  } catch (error) {
    console.error('Appointment delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
