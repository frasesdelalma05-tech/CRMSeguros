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
    const type = searchParams.get('type') || '';

    if (!type) {
      return NextResponse.json({ error: 'El parámetro type es obligatorio' }, { status: 400 });
    }

    let data: unknown;

    switch (type) {
      case 'clients_by_status': {
        const grouped = await db.client.groupBy({
          by: ['status'],
          where: { deletedAt: null },
          _count: { status: true },
        });
        data = grouped.map((g) => ({
          status: g.status,
          count: g._count.status,
        }));
        break;
      }

      case 'sales_by_agent': {
        const agents = await db.user.findMany({
          where: { deletedAt: null, isActive: true },
          include: {
            assignedLeads: {
              where: { deletedAt: null, status: 'ganado' },
              select: { estimatedPremium: true },
            },
          },
        });
        data = agents.map((a) => ({
          agentId: a.id,
          agentName: `${a.name} ${a.lastName || ''}`.trim(),
          wonLeads: a.assignedLeads.length,
          totalPremium: a.assignedLeads.reduce((sum, l) => sum + (l.estimatedPremium || 0), 0),
        }));
        break;
      }

      case 'policies_by_product': {
        const grouped = await db.policy.groupBy({
          by: ['productName'],
          where: { deletedAt: null },
          _count: { productName: true },
          _sum: { premium: true },
        });
        data = grouped.map((g) => ({
          product: g.productName,
          count: g._count.productName,
          totalPremium: g._sum.premium || 0,
        }));
        break;
      }

      case 'opportunities_won_lost': {
        const won = await db.opportunity.count({
          where: { deletedAt: null, status: 'ganado' },
        });
        const lost = await db.opportunity.count({
          where: { deletedAt: null, status: 'perdido' },
        });
        const open = await db.opportunity.count({
          where: { deletedAt: null, status: { notIn: ['ganado', 'perdido'] } },
        });
        data = { won, lost, open };
        break;
      }

      case 'appointments_completed': {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const completed = await db.appointment.count({
          where: { deletedAt: null, status: 'completada', date: { gte: startOfMonth } },
        });
        const total = await db.appointment.count({
          where: { deletedAt: null, date: { gte: startOfMonth } },
        });
        data = { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
        break;
      }

      case 'renewals_upcoming': {
        const now = new Date();
        const ninetyDaysFromNow = new Date();
        ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
        const policies = await db.policy.findMany({
          where: {
            deletedAt: null,
            status: 'activa',
            endDate: { gte: now, lte: ninetyDaysFromNow },
          },
          include: {
            client: { select: { name: true, lastName: true, email: true } },
          },
          orderBy: { endDate: 'asc' },
        });
        data = policies.map((p) => ({
          policyId: p.id,
          policyNumber: p.policyNumber,
          productName: p.productName,
          endDate: p.endDate,
          premium: p.premium,
          client: `${p.client.name} ${p.client.lastName}`,
        }));
        break;
      }

      case 'clients_at_risk': {
        const atRiskClients = await db.loyaltyScore.findMany({
          where: { isAtRisk: true },
          include: {
            client: {
              select: { id: true, name: true, lastName: true, email: true, status: true },
            },
          },
        });
        data = atRiskClients.map((ls) => ({
          clientId: ls.clientId,
          clientName: `${ls.client.name} ${ls.client.lastName}`,
          email: ls.client.email,
          score: ls.score,
          riskReason: ls.riskReason,
        }));
        break;
      }

      case 'campaign_metrics': {
        const campaigns = await db.campaign.findMany({
          where: { deletedAt: null },
          include: {
            _count: { select: { members: true } },
            members: {
              select: { status: true },
            },
          },
        });
        data = campaigns.map((c) => ({
          campaignId: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          totalMembers: c._count.members,
          converted: c.members.filter((m) => m.status === 'convertido').length,
          contacted: c.members.filter((m) => m.status === 'contactado').length,
          notInterested: c.members.filter((m) => m.status === 'no_interesado').length,
        }));
        break;
      }

      case 'estimated_revenue': {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const monthlyRevenue = await db.policy.aggregate({
          where: { deletedAt: null, status: 'activa', createdAt: { gte: startOfMonth } },
          _sum: { premium: true },
        });

        const annualRevenue = await db.policy.aggregate({
          where: { deletedAt: null, status: 'activa', createdAt: { gte: startOfYear } },
          _sum: { premium: true },
        });

        const totalActivePremium = await db.policy.aggregate({
          where: { deletedAt: null, status: 'activa' },
          _sum: { premium: true },
        });

        data = {
          monthlyPremium: monthlyRevenue._sum.premium || 0,
          annualPremium: annualRevenue._sum.premium || 0,
          totalActivePremium: totalActivePremium._sum.premium || 0,
        };
        break;
      }

      default:
        return NextResponse.json(
          { error: `Tipo de reporte no válido: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
