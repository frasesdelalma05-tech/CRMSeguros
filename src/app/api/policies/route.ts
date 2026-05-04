import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  canCreatePolicies,
  canUpdatePolicies,
  canDeletePolicies,
  isCorredor,
  hasAdminAccess,
  getPolicyVisibilityFilter,
} from '@/lib/permissions';

const createPolicySchema = z.object({
  policyNumber: z.string().min(1, 'El número de póliza es obligatorio'),
  clientId: z.string().min(1, 'El cliente es obligatorio'),
  productId: z.string().optional(),
  productName: z.string().min(1, 'El nombre del producto es obligatorio'),
  startDate: z.string().min(1, 'La fecha de inicio es obligatoria'),
  endDate: z.string().min(1, 'La fecha de fin es obligatoria'),
  status: z.enum(['activa', 'pendiente', 'vencida', 'cancelada', 'en_renovacion']).optional(),
  premium: z.number().min(0, 'La prima debe ser positiva'),
  paymentMethod: z.enum(['mensual', 'trimestral', 'semestral', 'anual']).optional(),
  coverages: z.string().optional(),
  renewalDate: z.string().optional(),
  soldByAgentId: z.string().optional(),
  ownerAgentId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || '';
    const clientId = searchParams.get('clientId') || '';
    const search = searchParams.get('search') || '';
    const soldByAgentId = searchParams.get('soldByAgentId') || '';
    const ownerAgentId = searchParams.get('ownerAgentId') || '';
    const expiringSoon = searchParams.get('expiringSoon') === 'true';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (status) {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (soldByAgentId) {
      where.soldByAgentId = soldByAgentId;
    }

    if (ownerAgentId) {
      where.ownerAgentId = ownerAgentId;
    }

    if (search) {
      where.OR = [
        { policyNumber: { contains: search, mode: 'insensitive' } },
        { productName: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (expiringSoon) {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.endDate = { gte: now, lte: thirtyDaysFromNow };
      where.status = 'activa';
    }

    // Apply role-based visibility filter
    const visibilityFilter = getPolicyVisibilityFilter(user.roleName, user.userId);
    if (visibilityFilter) {
      // Merge with existing OR conditions if any
      if (where.OR && visibilityFilter.OR) {
        where.AND = [
          { OR: where.OR },
          visibilityFilter,
        ];
        delete where.OR;
      } else {
        Object.assign(where, visibilityFilter);
      }
    }

    const [policies, total] = await Promise.all([
      db.policy.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true, email: true } },
          product: { select: { id: true, name: true, category: true } },
          soldByAgent: { select: { id: true, name: true, lastName: true } },
          ownerAgent: { select: { id: true, name: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.policy.count({ where }),
    ]);

    return NextResponse.json({
      data: policies,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Policies list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Permission check
    if (!canCreatePolicies(user.roleName)) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear pólizas.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createPolicySchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check policy number uniqueness
    const existingPolicy = await db.policy.findUnique({ where: { policyNumber: data.policyNumber } });
    if (existingPolicy && !existingPolicy.deletedAt) {
      return NextResponse.json({ error: 'Ya existe una póliza con este número' }, { status: 409 });
    }

    // Verify client exists
    const client = await db.client.findFirst({ where: { id: data.clientId, deletedAt: null } });
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // If the current user is a corredor, auto-set soldByAgentId and ownerAgentId
    if (isCorredor(user.roleName)) {
      if (!data.soldByAgentId) {
        data.soldByAgentId = user.userId;
      }
      if (!data.ownerAgentId) {
        data.ownerAgentId = user.userId;
      }
    }

    const policy = await db.policy.create({
      data: {
        policyNumber: data.policyNumber,
        clientId: data.clientId,
        productId: data.productId || undefined,
        productName: data.productName,
        soldByAgentId: data.soldByAgentId || undefined,
        ownerAgentId: data.ownerAgentId || undefined,
        createdById: user.userId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        status: data.status,
        premium: data.premium,
        paymentMethod: data.paymentMethod,
        coverages: data.coverages,
        renewalDate: data.renewalDate ? new Date(data.renewalDate) : undefined,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true, email: true } },
        product: { select: { id: true, name: true, category: true } },
        soldByAgent: { select: { id: true, name: true, lastName: true } },
        ownerAgent: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'policy',
        entityId: policy.id,
        details: JSON.stringify({
          policyNumber: data.policyNumber,
          clientId: data.clientId,
          premium: data.premium,
          soldByAgentId: data.soldByAgentId,
          ownerAgentId: data.ownerAgentId,
        }),
      },
    });

    return NextResponse.json({ data: policy }, { status: 201 });
  } catch (error) {
    console.error('Policy create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
