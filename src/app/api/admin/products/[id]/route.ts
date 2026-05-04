import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authenticateRequestWithSupabase } from '@/lib/auth';
import { db } from '@/lib/db';
import { hasAdminAccess, isSuperAdmin } from '@/lib/permissions';

const updateProductSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  basePremium: z.number().optional(),
  coverages: z.string().optional(),
  isActive: z.boolean().optional(),
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

    const product = await db.insuranceProduct.findUnique({
      where: { id },
      include: {
        _count: { select: { policies: true } },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('Product get error:', error);
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

    if (!hasAdminAccess(user.roleName)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.insuranceProduct.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    const data = validation.data;

    const product = await db.insuranceProduct.update({
      where: { id },
      data,
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'update',
        entity: 'insuranceProduct',
        entityId: id,
        details: JSON.stringify(validation.data),
      },
    });

    return NextResponse.json({ data: product });
  } catch (error) {
    console.error('Product update error:', error);
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

    if (!isSuperAdmin(user.roleName)) {
      return NextResponse.json({ error: 'Solo un super administrador puede eliminar productos' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.insuranceProduct.findUnique({
      where: { id },
      include: { _count: { select: { policies: true } } },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Check if product has active policies
    if (existing._count.policies > 0) {
      // Soft delete by deactivating instead
      await db.insuranceProduct.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        data: { message: 'Producto desactivado (tiene pólizas asociadas)' },
      });
    }

    await db.insuranceProduct.delete({ where: { id } });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'insuranceProduct',
        entityId: id,
        details: JSON.stringify({ name: existing.name, category: existing.category }),
      },
    });

    return NextResponse.json({ data: { message: 'Producto eliminado correctamente' } });
  } catch (error) {
    console.error('Product delete error:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
