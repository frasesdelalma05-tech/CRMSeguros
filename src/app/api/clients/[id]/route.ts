import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  canUpdateClients,
  canDeleteClients,
  isCorredor,
  hasAdminAccess,
} from '@/lib/permissions';

const updateClientSchema = z.object({
  documentType: z.enum(['DNI', 'NIE', 'PASSPORT']).optional(),
  documentNumber: z.string().nullable().optional(),
  name: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  mobile: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  province: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  birthDate: z.string().optional(),
  status: z.enum(['activo', 'inactivo', 'prospecto', 'baja']).optional(),
  source: z.enum(['web', 'referido', 'campana', 'cold_call', 'evento', 'otro']).optional(),
  ownerAgentId: z.string().nullable().optional(),
  rgpdConsent: z.boolean().optional(),
  observations: z.string().optional(),
  tags: z.string().optional(),
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

    const client = await db.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
        createdBy: { select: { id: true, name: true, lastName: true } },
        updatedBy: { select: { id: true, name: true, lastName: true } },
        policies: {
          where: { deletedAt: null },
          include: {
            soldByAgent: { select: { id: true, name: true, lastName: true } },
            ownerAgent: { select: { id: true, name: true, lastName: true } },
            product: { select: { id: true, name: true, category: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        interactions: { orderBy: { createdAt: 'desc' }, take: 10 },
        opportunities: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        loyaltyScore: true,
        documents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        incidents: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        _count: { select: { policies: true, opportunities: true, interactions: true, incidents: true } },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Role-based access: corredor can only see their own clients
    if (isCorredor(user.roleName) && client.ownerAgentId !== user.userId) {
      // Still allow viewing but mark as not editable
    }

    const enrichedClient = {
      ...client,
      canEdit: hasAdminAccess(user.roleName) || (isCorredor(user.roleName) && client.ownerAgentId === user.userId),
      belongsToCurrentUser: client.ownerAgentId === user.userId,
    };

    return NextResponse.json({ data: enrichedClient });
  } catch (error) {
    console.error('Client get error:', error);
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

    // Permission check
    if (!canUpdateClients(user.roleName)) {
      return NextResponse.json(
        { error: 'No tienes permiso para actualizar clientes.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Corredor can only update their own clients
    if (isCorredor(user.roleName) && existing.ownerAgentId !== user.userId) {
      return NextResponse.json(
        { error: 'Solo puedes modificar clientes que tienes asignados.' },
        { status: 403 }
      );
    }

    const data = validation.data;

    // Check email uniqueness if changed
    if (data.email && data.email !== existing.email) {
      const emailExists = await db.client.findFirst({
        where: { email: data.email, deletedAt: null, id: { not: id } },
      });
      if (emailExists) {
        return NextResponse.json({ error: 'Ya existe un cliente con este email' }, { status: 409 });
      }
    }

    // Check documentNumber uniqueness if changed
    if (data.documentNumber && data.documentNumber !== existing.documentNumber) {
      const docExists = await db.client.findFirst({
        where: { documentNumber: data.documentNumber, deletedAt: null, id: { not: id } },
      });
      if (docExists) {
        return NextResponse.json({ error: 'Ya existe un cliente con este número de documento' }, { status: 409 });
      }
    }

    const client = await db.client.update({
      where: { id },
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        rgpdConsentDate: data.rgpdConsent && !existing.rgpdConsent ? new Date() : undefined,
        updatedById: user.userId,
      },
      include: {
        ownerAgent: { select: { id: true, name: true, lastName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'client',
        entityId: id,
        details: JSON.stringify({
          changedFields: Object.keys(data),
          clientName: `${existing.name} ${existing.lastName}`,
        }),
      },
    });

    return NextResponse.json({ data: client });
  } catch (error) {
    console.error('Client update error:', error);
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

    // BUSINESS RULE: Only super_administrador can delete sensitive data
    if (!canDeleteClients(user.roleName)) {
      return NextResponse.json(
        { error: 'Solo un super administrador puede eliminar clientes. Los administradores pueden desactivar clientes.' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await db.client.findFirst({ where: { id, deletedAt: null } });
    if (!existing) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
    }

    // Soft delete
    await db.client.update({
      where: { id },
      data: { deletedAt: new Date(), updatedById: user.userId },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'client',
        entityId: id,
        details: JSON.stringify({ name: existing.name, lastName: existing.lastName, email: existing.email, documentNumber: existing.documentNumber }),
      },
    });

    return NextResponse.json({ data: { message: 'Cliente eliminado correctamente' } });
  } catch (error) {
    console.error('Client delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
