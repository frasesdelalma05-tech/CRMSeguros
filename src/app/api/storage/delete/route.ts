import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { deleteFile, STORAGE_BUCKETS, type StorageBucket } from '@/lib/supabase/admin';
import { db } from '@/lib/db';
import { authenticateRequestWithSupabase } from '@/lib/auth';

const VALID_BUCKETS = Object.values(STORAGE_BUCKETS) as string[];
const ALLOWED_ROLES = ['super_administrador', 'administrador'];

const deleteSchema = z.object({
  documentId: z
    .string()
    .uuid('ID de documento no válido')
    .min(1, 'El ID del documento es obligatorio'),
});

export async function DELETE(request: NextRequest) {
  try {
    // 1. Authenticate the user - only admin roles can delete
    const user = await authenticateRequestWithSupabase(request.headers);
    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    if (!ALLOWED_ROLES.includes(user.roleName)) {
      return NextResponse.json(
        {
          error:
            'Permiso denegado. Solo administradores pueden eliminar archivos',
        },
        { status: 403 }
      );
    }

    // 2. Parse and validate the request body
    const body = await request.json();
    const validation = deleteSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos inválidos',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { documentId } = validation.data;

    // 3. Look up the document in the database
    const document = await db.document.findFirst({
      where: { id: documentId, deletedAt: null },
    });

    if (!document) {
      return NextResponse.json(
        { error: 'Documento no encontrado' },
        { status: 404 }
      );
    }

    // 4. Delete the file from Supabase Storage
    if (document.storagePath && document.bucket) {
      const bucket = document.bucket as StorageBucket;

      if (VALID_BUCKETS.includes(bucket)) {
        try {
          await deleteFile(bucket, [document.storagePath]);
        } catch (storageError) {
          console.error('Storage delete error (non-fatal):', storageError);
          // Continue with soft-delete even if storage deletion fails
          // The file may have already been removed from storage
        }
      }
    }

    // 5. Soft-delete the Document record (set deletedAt)
    await db.document.update({
      where: { id: documentId },
      data: { deletedAt: new Date() },
    });

    // Audit log
    await db.auditLog.create({
      data: {
        userId: user.userId,
        action: 'delete',
        entity: 'document',
        entityId: documentId,
        details: JSON.stringify({
          name: document.name,
          type: document.type,
          bucket: document.bucket,
          storagePath: document.storagePath,
        }),
      },
    });

    // 6. Return success
    return NextResponse.json({
      data: {
        success: true,
        documentId,
      },
    });
  } catch (error) {
    console.error('File delete error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
