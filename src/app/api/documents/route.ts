import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';

const createDocumentSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  type: z.enum(['poliza', 'contrato', 'factura', 'identificacion', 'otro']),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  url: z.string().min(1, 'La URL es obligatoria'),
  clientId: z.string().optional(),
  policyId: z.string().optional(),
  opportunityId: z.string().optional(),
  incidentId: z.string().optional(),
  uploadedBy: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId') || '';
    const policyId = searchParams.get('policyId') || '';
    const type = searchParams.get('type') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      deletedAt: null,
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (policyId) {
      where.policyId = policyId;
    }

    if (type) {
      where.type = type;
    }

    const [documents, total] = await Promise.all([
      db.document.findMany({
        where,
        include: {
          client: { select: { id: true, name: true, lastName: true } },
          policy: { select: { id: true, policyNumber: true, productName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      db.document.count({ where }),
    ]);

    return NextResponse.json({
      data: documents,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('Documents list error:', error);
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
    const validation = createDocumentSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const data = validation.data;

    const document = await db.document.create({
      data: {
        ...data,
        uploadedBy: data.uploadedBy || user.userId,
      },
      include: {
        client: { select: { id: true, name: true, lastName: true } },
        policy: { select: { id: true, policyNumber: true, productName: true } },
      },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'create',
        entity: 'document',
        entityId: document.id,
        details: JSON.stringify({ name: data.name, type: data.type }),
      },
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error('Document create error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
