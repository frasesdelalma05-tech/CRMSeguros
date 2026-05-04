import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  canCreateClients,
  canUpdateClients,
  canDeleteClients,
  isCorredor,
  isAtencionCliente,
  isSoloLectura,
  hasAdminAccess,
} from '@/lib/permissions';

const createClientSchema = z.object({
  documentType: z.enum(['DNI', 'NIE', 'PASSPORT']).optional(),
  documentNumber: z.string().optional(),
  name: z.string().min(1, 'El nombre es obligatorio'),
  lastName: z.string().min(1, 'El apellido es obligatorio'),
  email: z.string().email('Email inválido'),
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
  ownerAgentId: z.string().optional(),
  rgpdConsent: z.boolean().optional(),
  observations: z.string().optional(),
  tags: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const ownerAgentId = searchParams.get('ownerAgentId') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { documentNumber: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (ownerAgentId) {
      where.ownerAgentId = ownerAgentId;
    }

    // Role-based filtering
    if (isCorredor(user.roleName) && !ownerAgentId) {
      // Corredores see their own clients by default
      where.ownerAgentId = user.userId;
    }
    // atencion_cliente and solo_lectura can view all clients (but cannot modify)
    // super_admin and administrador can view all clients

    const [clients, total] = await Promise.all([
      db.client.findMany({
        where,
        include: {
          ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
          _count: { select: { policies: true, opportunities: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.client.count({ where }),
    ]);

    // Add canEdit flag based on role
    const enrichedClients = clients.map(client => ({
      ...client,
      canEdit: hasAdminAccess(user.roleName) || (isCorredor(user.roleName) && client.ownerAgentId === user.userId),
      belongsToCurrentUser: client.ownerAgentId === user.userId,
    }));

    return NextResponse.json({
      data: enrichedClients,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Clients list error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Permission check: solo_lectura and atencion_cliente cannot create clients
    if (!canCreateClients(user.roleName)) {
      return NextResponse.json(
        { error: 'No tienes permiso para crear clientes.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = createClientSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    // If the current user is a corredor, auto-assign the client to themselves
    if (isCorredor(user.roleName) && !data.ownerAgentId) {
      data.ownerAgentId = user.userId;
    }

    // Check email uniqueness
    const existingByEmail = await db.client.findFirst({
      where: { email: data.email, deletedAt: null },
    });
    if (existingByEmail) {
      // Return the existing client with ownership info
      const existingClient = await db.client.findFirst({
        where: { id: existingByEmail.id, deletedAt: null },
        include: {
          ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
          policies: {
            where: { deletedAt: null },
            include: {
              soldByAgent: { select: { id: true, name: true, lastName: true } },
              ownerAgent: { select: { id: true, name: true, lastName: true } },
            },
          },
          _count: { select: { policies: true, opportunities: true } },
        },
      });

      // Audit log for duplicate attempt
      await db.auditLog.create({
        data: {
          userId: user.userId,
          action: 'create_duplicate',
          entity: 'client',
          entityId: existingByEmail.id,
          details: JSON.stringify({
            attemptedEmail: data.email,
            reason: 'email_already_exists',
            existingClientName: `${existingByEmail.name} ${existingByEmail.lastName}`,
          }),
        },
      });

      return NextResponse.json({
        data: {
          ...existingClient,
          canEdit: hasAdminAccess(user.roleName) || (isCorredor(user.roleName) && existingByEmail.ownerAgentId === user.userId),
          belongsToCurrentUser: existingByEmail.ownerAgentId === user.userId,
        },
        duplicate: true,
        duplicateField: 'email',
        message: 'Ya existe un cliente con este email.',
        managedBy: existingClient?.ownerAgent
          ? `${existingClient.ownerAgent.name} ${existingClient.ownerAgent.lastName}`
          : 'Sin corredor asignado',
      }, { status: 200 });
    }

    // BUSINESS RULE: Check documentNumber uniqueness - do not duplicate
    if (data.documentNumber) {
      const existingByDoc = await db.client.findFirst({
        where: { documentNumber: data.documentNumber, deletedAt: null },
        include: {
          ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
          policies: {
            where: { deletedAt: null },
            include: {
              soldByAgent: { select: { id: true, name: true, lastName: true } },
              ownerAgent: { select: { id: true, name: true, lastName: true } },
            },
          },
          _count: { select: { policies: true, opportunities: true } },
        },
      });

      if (existingByDoc) {
        // Audit log for DNI/NIE duplicate attempt
        await db.auditLog.create({
          data: {
            userId: user.userId,
            action: 'create_duplicate',
            entity: 'client',
            entityId: existingByDoc.id,
            details: JSON.stringify({
              attemptedDocument: data.documentNumber,
              attemptedDocumentType: data.documentType,
              reason: 'document_already_exists',
              existingClientName: `${existingByDoc.name} ${existingByDoc.lastName}`,
            }),
          },
        });

        // Return the existing client instead of erroring
        return NextResponse.json({
          data: {
            ...existingByDoc,
            canEdit: hasAdminAccess(user.roleName) || (isCorredor(user.roleName) && existingByDoc.ownerAgentId === user.userId),
            belongsToCurrentUser: existingByDoc.ownerAgentId === user.userId,
          },
          duplicate: true,
          duplicateField: 'documentNumber',
          message: `Ya existe un cliente con ${data.documentType || 'documento'} ${data.documentNumber}.`,
          managedBy: existingByDoc.ownerAgent
            ? `${existingByDoc.ownerAgent.name} ${existingByDoc.ownerAgent.lastName}`
            : 'Sin corredor asignado',
        }, { status: 200 });
      }
    }

    const client = await db.client.create({
      data: {
        ...data,
        birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
        rgpdConsent: data.rgpdConsent || false,
        rgpdConsentDate: data.rgpdConsent ? new Date() : undefined,
        createdById: user.userId,
      },
      include: {
        ownerAgent: { select: { id: true, name: true, lastName: true, email: true, position: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'client',
        entityId: client.id,
        details: JSON.stringify({ name: client.name, lastName: client.lastName, email: client.email, documentNumber: client.documentNumber }),
      },
    });

    return NextResponse.json({ data: client, duplicate: false }, { status: 201 });
  } catch (error) {
    console.error('Client create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
