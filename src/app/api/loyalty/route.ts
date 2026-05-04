import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isAtRisk = searchParams.get('isAtRisk');
    const minScore = searchParams.get('minScore');
    const maxScore = searchParams.get('maxScore');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (isAtRisk !== null && isAtRisk !== undefined && isAtRisk !== '') {
      where.isAtRisk = isAtRisk === 'true';
    }

    if (minScore) {
      where.score = { ...((where.score as Record<string, unknown>) || {}), gte: parseInt(minScore, 10) };
    }

    if (maxScore) {
      where.score = { ...((where.score as Record<string, unknown>) || {}), lte: parseInt(maxScore, 10) };
    }

    const [scores, total] = await Promise.all([
      db.loyaltyScore.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true, status: true } },
        },
        skip,
        take: limit,
        orderBy: { score: 'asc' },
      }),
      db.loyaltyScore.count({ where }),
    ]);

    return NextResponse.json({
      data: scores,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Loyalty list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
