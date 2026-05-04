import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const updateLoyaltySchema = z.object({
  score: z.number().min(0).max(100).optional(),
  activePolicies: z.number().optional(),
  totalPremium: z.number().optional(),
  yearsAsClient: z.number().optional(),
  lastContactDate: z.string().optional(),
  isAtRisk: z.boolean().optional(),
  riskReason: z.string().optional(),
  recommendedActions: z.string().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { clientId } = await params;

    const loyaltyScore = await db.loyaltyScore.findUnique({
      where: { clientId },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true, status: true } },
      },
    });

    if (!loyaltyScore) {
      return NextResponse.json({ error: 'Score de fidelización no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: loyaltyScore });
  } catch (error) {
    console.error('Loyalty get error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { clientId } = await params;
    const body = await request.json();
    const validation = updateLoyaltySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.loyaltyScore.findUnique({ where: { clientId } });
    if (!existing) {
      return NextResponse.json({ error: 'Score de fidelización no encontrado' }, { status: 404 });
    }

    const data = validation.data;

    const loyaltyScore = await db.loyaltyScore.update({
      where: { clientId },
      data: {
        ...data,
        lastContactDate: data.lastContactDate ? new Date(data.lastContactDate) : undefined,
        lastUpdated: new Date(),
      },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'loyaltyScore',
        entityId: loyaltyScore.id,
        details: JSON.stringify({ clientId, ...validation.data }),
      },
    });

    return NextResponse.json({ data: loyaltyScore });
  } catch (error) {
    console.error('Loyalty update error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
