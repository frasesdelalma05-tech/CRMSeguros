import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { isCorredor, hasAdminAccess, canSearchDni } from '@/lib/permissions';

// GET /api/search/global?q=XXXXXXXX
// Global search across clients, policies, leads, and agents
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ error: 'La búsqueda debe tener al menos 2 caracteres' }, { status: 400 });
    }

    const limit = 10;
    const results: {
      clients: unknown[];
      policies: unknown[];
      leads: unknown[];
      agents: unknown[];
    } = {
      clients: [],
      policies: [],
      leads: [],
      agents: [],
    };

    // Search clients
    const clientWhere: Record<string, unknown> = {
      deletedAt: null,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { documentNumber: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
      ],
    };

    // Corredores only see their own clients in search
    if (isCorredor(user.roleName)) {
      clientWhere.ownerAgentId = user.userId;
    }

    results.clients = await db.client.findMany({
      where: clientWhere,
      include: {
        ownerAgent: { select: { id: true, name: true, lastName: true } },
        _count: { select: { policies: true } },
      },
      take: limit,
    });

    // Search policies
    const policyWhere: Record<string, unknown> = {
      deletedAt: null,
    };

    if (isCorredor(user.roleName)) {
      policyWhere.AND = [
        {
          OR: [
            { policyNumber: { contains: q, mode: 'insensitive' } },
            { productName: { contains: q, mode: 'insensitive' } },
          ],
        },
        {
          OR: [
            { soldByAgentId: user.userId },
            { ownerAgentId: user.userId },
          ],
        },
      ];
    } else {
      policyWhere.OR = [
        { policyNumber: { contains: q, mode: 'insensitive' } },
        { productName: { contains: q, mode: 'insensitive' } },
      ];
    }

    results.policies = await db.policy.findMany({
      where: policyWhere,
      include: {
        client: { select: { id: true, name: true, lastName: true } },
        soldByAgent: { select: { id: true, name: true, lastName: true } },
        ownerAgent: { select: { id: true, name: true, lastName: true } },
      },
      take: limit,
    });

    // Search leads (only for corredores and admins)
    if (hasAdminAccess(user.roleName) || isCorredor(user.roleName)) {
      const leadWhere: Record<string, unknown> = {
        deletedAt: null,
        OR: [
          { product: { contains: q, mode: 'insensitive' } },
          { notes: { contains: q, mode: 'insensitive' } },
          { client: { name: { contains: q, mode: 'insensitive' } } },
          { client: { lastName: { contains: q, mode: 'insensitive' } } },
        ],
      };

      if (isCorredor(user.roleName)) {
        leadWhere.agentId = user.userId;
      }

      results.leads = await db.lead.findMany({
        where: leadWhere,
        include: {
          client: { select: { id: true, name: true, lastName: true } },
          agent: { select: { id: true, name: true, lastName: true } },
        },
        take: limit,
      });
    }

    // Search agents (only for admins)
    if (hasAdminAccess(user.roleName)) {
      const corredorRole = await db.role.findFirst({ where: { name: 'corredor' } });
      if (corredorRole) {
        results.agents = await db.user.findMany({
          where: {
            roleId: corredorRole.id,
            deletedAt: null,
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { lastName: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          },
          select: {
            id: true,
            name: true,
            lastName: true,
            email: true,
            position: true,
            isActive: true,
            _count: {
              select: { assignedClients: true, soldPolicies: true },
            },
          },
          take: limit,
        });
      }
    }

    // Audit log for global search
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'search_global',
        entity: 'system',
        details: JSON.stringify({ query: q }),
      },
    });

    return NextResponse.json({ data: results });
  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
