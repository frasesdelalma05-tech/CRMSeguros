import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createAppointmentSchema = z.object({
  clientId: z.string().optional(),
  agentId: z.string().min(1, 'El agente es obligatorio'),
  title: z.string().min(1, 'El título es obligatorio'),
  description: z.string().optional(),
  type: z.enum(['llamada', 'videollamada', 'visita_presencial', 'renovacion', 'seguimiento', 'firma_poliza']),
  status: z.enum(['programada', 'confirmada', 'completada', 'cancelada', 'reagendada']).optional(),
  date: z.string().min(1, 'La fecha es obligatoria'),
  endDate: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  reminder: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId') || '';
    const clientId = searchParams.get('clientId') || '';
    const date = searchParams.get('date') || '';
    const status = searchParams.get('status') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (agentId) {
      where.agentId = agentId;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);
      where.date = { gte: startDate, lt: endDate };
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [appointments, total] = await Promise.all([
      db.appointment.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true } },
          agent: { select: { id: true, name: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { date: 'asc' },
      }),
      db.appointment.count({ where }),
    ]);

    return NextResponse.json({
      data: appointments,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Appointments list error:', error);
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
    const validation = createAppointmentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const appointment = await db.appointment.create({
      data: {
        ...data,
        date: new Date(data.date),
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
        action: 'create',
        entity: 'appointment',
        entityId: appointment.id,
        details: JSON.stringify({ title: data.title, date: data.date, type: data.type }),
      },
    });

    return NextResponse.json({ data: appointment }, { status: 201 });
  } catch (error) {
    console.error('Appointment create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
