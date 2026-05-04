import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

// Load .env.local before PrismaClient is instantiated
function loadEnvLocal() {
  const envPaths = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
  ];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/);
        if (match) {
          const [, key, value] = match;
          // For DATABASE_URL and DIRECT_URL, ALWAYS override from .env.local
          // because the system might have the old SQLite URL
          if (key === 'DATABASE_URL' || key === 'DIRECT_URL') {
            process.env[key] = value;
          } else if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    }
  }
}
loadEnvLocal();

const prisma = new PrismaClient();

// ============================================================
// ROLE DEFINITIONS
// ============================================================
const ROLES = [
  {
    name: 'super_administrador',
    description: 'Control total del sistema. Puede crear administradores y corredores. Cambiar propietario de clientes y pólizas. Ver auditoría. Eliminar datos sensibles.',
  },
  {
    name: 'administrador',
    description: 'Puede crear corredores/agentes, asignar clientes y pólizas. No puede crear super admins ni eliminar datos sensibles.',
  },
  {
    name: 'corredor',
    description: 'Corredor/Agente de seguros. Gestiona clientes, citas, oportunidades y pólizas asignadas. Puede buscar por DNI/NIE.',
  },
  {
    name: 'atencion_cliente',
    description: 'Busca clientes por DNI/NIE, ve datos básicos, crea incidencias y registra llamadas/notas. No puede modificar pólizas ni eliminar datos.',
  },
  {
    name: 'solo_lectura',
    description: 'Puede consultar información permitida. No puede crear, editar ni borrar.',
  },
] as const;

// ============================================================
// PERMISSION DEFINITIONS (dot notation: module.action)
// ============================================================
const PERMISSIONS: { name: string; description: string; module: string; action: string }[] = [
  // users
  { name: 'users.view', description: 'Ver usuarios', module: 'users', action: 'view' },
  { name: 'users.create', description: 'Crear usuarios', module: 'users', action: 'create' },
  { name: 'users.update', description: 'Actualizar usuarios', module: 'users', action: 'update' },
  { name: 'users.disable', description: 'Desactivar usuarios', module: 'users', action: 'disable' },
  { name: 'users.assign_roles', description: 'Asignar roles a usuarios', module: 'users', action: 'assign_roles' },
  { name: 'users.assign_super_admin', description: 'Asignar rol super_administrador', module: 'users', action: 'assign_super_admin' },

  // clients
  { name: 'clients.view', description: 'Ver clientes', module: 'clients', action: 'view' },
  { name: 'clients.create', description: 'Crear clientes', module: 'clients', action: 'create' },
  { name: 'clients.update', description: 'Actualizar clientes', module: 'clients', action: 'update' },
  { name: 'clients.delete', description: 'Eliminar clientes', module: 'clients', action: 'delete' },
  { name: 'clients.search_dni', description: 'Buscar clientes por DNI/NIE (búsqueda centralizada)', module: 'clients', action: 'search_dni' },
  { name: 'clients.reassign', description: 'Reasignar corredor/agente de un cliente', module: 'clients', action: 'reassign' },

  // policies
  { name: 'policies.view', description: 'Ver pólizas', module: 'policies', action: 'view' },
  { name: 'policies.create', description: 'Crear pólizas', module: 'policies', action: 'create' },
  { name: 'policies.update', description: 'Actualizar pólizas', module: 'policies', action: 'update' },
  { name: 'policies.delete', description: 'Eliminar pólizas', module: 'policies', action: 'delete' },
  { name: 'policies.reassign', description: 'Reasignar corredor/agente de una póliza', module: 'policies', action: 'reassign' },

  // appointments
  { name: 'appointments.view', description: 'Ver citas', module: 'appointments', action: 'view' },
  { name: 'appointments.create', description: 'Crear citas', module: 'appointments', action: 'create' },
  { name: 'appointments.update', description: 'Actualizar citas', module: 'appointments', action: 'update' },
  { name: 'appointments.delete', description: 'Eliminar citas', module: 'appointments', action: 'delete' },

  // leads
  { name: 'leads.view', description: 'Ver leads', module: 'leads', action: 'view' },
  { name: 'leads.create', description: 'Crear leads', module: 'leads', action: 'create' },
  { name: 'leads.update', description: 'Actualizar leads', module: 'leads', action: 'update' },
  { name: 'leads.delete', description: 'Eliminar leads', module: 'leads', action: 'delete' },

  // opportunities
  { name: 'opportunities.view', description: 'Ver oportunidades', module: 'opportunities', action: 'view' },
  { name: 'opportunities.create', description: 'Crear oportunidades', module: 'opportunities', action: 'create' },
  { name: 'opportunities.update', description: 'Actualizar oportunidades', module: 'opportunities', action: 'update' },
  { name: 'opportunities.delete', description: 'Eliminar oportunidades', module: 'opportunities', action: 'delete' },

  // tasks
  { name: 'tasks.view', description: 'Ver tareas', module: 'tasks', action: 'view' },
  { name: 'tasks.create', description: 'Crear tareas', module: 'tasks', action: 'create' },
  { name: 'tasks.update', description: 'Actualizar tareas', module: 'tasks', action: 'update' },
  { name: 'tasks.delete', description: 'Eliminar tareas', module: 'tasks', action: 'delete' },

  // campaigns
  { name: 'campaigns.view', description: 'Ver campañas', module: 'campaigns', action: 'view' },
  { name: 'campaigns.create', description: 'Crear campañas', module: 'campaigns', action: 'create' },
  { name: 'campaigns.update', description: 'Actualizar campañas', module: 'campaigns', action: 'update' },
  { name: 'campaigns.delete', description: 'Eliminar campañas', module: 'campaigns', action: 'delete' },

  // incidents
  { name: 'incidents.view', description: 'Ver incidencias', module: 'incidents', action: 'view' },
  { name: 'incidents.create', description: 'Crear incidencias', module: 'incidents', action: 'create' },
  { name: 'incidents.update', description: 'Actualizar incidencias', module: 'incidents', action: 'update' },
  { name: 'incidents.delete', description: 'Eliminar incidencias', module: 'incidents', action: 'delete' },

  // documents
  { name: 'documents.view', description: 'Ver documentos', module: 'documents', action: 'view' },
  { name: 'documents.create', description: 'Crear documentos', module: 'documents', action: 'create' },
  { name: 'documents.update', description: 'Actualizar documentos', module: 'documents', action: 'update' },
  { name: 'documents.delete', description: 'Eliminar documentos', module: 'documents', action: 'delete' },

  // reports
  { name: 'reports.view', description: 'Ver reportes', module: 'reports', action: 'view' },

  // admin
  { name: 'admin.access', description: 'Acceso al panel de administración', module: 'admin', action: 'access' },
  { name: 'audit.view', description: 'Ver auditoría', module: 'audit', action: 'view' },
  { name: 'settings.manage', description: 'Gestionar configuraciones', module: 'settings', action: 'manage' },

  // loyalty
  { name: 'loyalty.view', description: 'Ver fidelización', module: 'loyalty', action: 'view' },
  { name: 'loyalty.update', description: 'Actualizar fidelización', module: 'loyalty', action: 'update' },
];

// ============================================================
// PERMISSION ASSIGNMENTS PER ROLE
// ============================================================
function getPermissionsForRole(roleName: string, permMap: Map<string, string>): string[] {
  const permIds: string[] = [];

  const all = () => permMap.values().toArray();
  const byModule = (mod: string) => {
    const ids: string[] = [];
    permMap.forEach((id, name) => {
      if (name.startsWith(`${mod}.`)) ids.push(id);
    });
    return ids;
  };
  const byName = (name: string) => {
    const id = permMap.get(name);
    return id ? [id] : [];
  };
  const allViews = () => {
    const ids: string[] = [];
    permMap.forEach((id, name) => {
      if (name.endsWith('.view')) ids.push(id);
    });
    return ids;
  };

  switch (roleName) {
    case 'super_administrador':
      return all();

    case 'administrador':
      // ALL except users.assign_super_admin, audit.view, settings.manage, clients.delete, policies.delete, documents.delete
      return all().filter(id => {
        const skipNames = ['users.assign_super_admin', 'clients.delete', 'policies.delete', 'documents.delete'];
        let skip = false;
        skipNames.forEach(sn => {
          if (permMap.get(sn) === id) skip = true;
        });
        return !skip;
      });

    case 'corredor':
      // clients.view, clients.create, clients.update, clients.search_dni
      // policies.view, policies.create
      // appointments.* (all), leads.* (all), opportunities.* (all), tasks.* (all)
      // documents.view, loyalty.view, incidents.view
      // NO clients.delete, NO policies.delete, NO policies.update, NO campaigns, NO incidents.delete, NO documents.delete
      return [
        ...byName('clients.view'),
        ...byName('clients.create'),
        ...byName('clients.update'),
        ...byName('clients.search_dni'),
        ...byName('policies.view'),
        ...byName('policies.create'),
        ...byModule('appointments'),
        ...byModule('leads'),
        ...byModule('opportunities'),
        ...byModule('tasks'),
        ...byName('documents.view'),
        ...byName('documents.create'),
        ...byName('loyalty.view'),
        ...byName('incidents.view'),
      ];

    case 'atencion_cliente':
      // clients.view, clients.search_dni (NO create/update/delete)
      // appointments.* (all), incidents.create, incidents.view, incidents.update
      // documents.view, loyalty.view, interactions
      return [
        ...byName('clients.view'),
        ...byName('clients.search_dni'),
        ...byName('policies.view'),
        ...byModule('appointments'),
        ...byName('incidents.view'),
        ...byName('incidents.create'),
        ...byName('incidents.update'),
        ...byName('documents.view'),
        ...byName('loyalty.view'),
        ...byModule('interactions'),
      ];

    case 'solo_lectura':
      // All *.view permissions
      return allViews();

    default:
      return [];
  }
}

// ============================================================
// INSURANCE PRODUCTS
// ============================================================
const PRODUCTS = [
  { name: 'Seguro de Decesos', category: 'decesos', description: 'Cobertura completa de servicios funerarios', basePremium: 12.50, coverages: ['Servicios funerarios', 'Traslado', 'Repatriación', 'Gestión documental', 'Asesoría jurídica'] },
  { name: 'Seguro de Hogar', category: 'hogar', description: 'Protección integral para tu vivienda', basePremium: 35.00, coverages: ['Incendio', 'Robo', 'Daños por agua', 'Responsabilidad civil', 'Continente y contenido'] },
  { name: 'Seguro de Vida', category: 'vida', description: 'Protección financiera para tus seres queridos', basePremium: 25.00, coverages: ['Fallecimiento', 'Incapacidad permanente', 'Enfermedades graves', 'Doble capital por accidente'] },
  { name: 'Seguro de Salud', category: 'salud', description: 'Asistencia médica completa', basePremium: 65.00, coverages: ['Consultas médicas', 'Hospitalización', 'Pruebas diagnósticas', 'Especialistas', 'Urgencias'] },
  { name: 'Seguro de Accidentes', category: 'accidentes', description: 'Protección ante accidentes personales', basePremium: 15.00, coverages: ['Muerte accidental', 'Incapacidad', 'Gastos médicos', 'Asistencia'] },
  { name: 'Seguro de Mascotas', category: 'mascotas', description: 'Cuidado veterinario para tu mascota', basePremium: 22.00, coverages: ['Consultas veterinarias', 'Cirugía', 'Hospitalización', 'Medicamentos', 'Responsabilidad civil'] },
  { name: 'Plan de Ahorro', category: 'ahorro', description: 'Ahorro e inversión a largo plazo', basePremium: 100.00, coverages: ['Ahorro garantizado', 'Participación en beneficios', 'Flexibilidad de aportaciones'] },
  { name: 'Seguro de Comunidades', category: 'comunidades', description: 'Seguro para comunidades de propietarios', basePremium: 200.00, coverages: ['Responsabilidad civil', 'Daños estructura', 'Incendio', 'Daños por agua', 'Robo zonas comunes'] },
  { name: 'Seguro de Empresas', category: 'empresas', description: 'Protección integral para empresas', basePremium: 150.00, coverages: ['Responsabilidad civil', 'Contenido mercantil', 'Incendio', 'Pérdida de beneficios', 'Seguridad social'] },
  { name: 'Seguro de Embarcaciones', category: 'embarcaciones', description: 'Seguro para embarcaciones de recreo', basePremium: 80.00, coverages: ['Casco', 'Responsabilidad civil', 'Robo', 'Asistencia en mar', 'Defensa jurídica'] },
  { name: 'Seguro de Caza', category: 'caza', description: 'Seguro obligatorio para cazadores', basePremium: 18.00, coverages: ['Responsabilidad civil', 'Accidentes personales', 'Defensa jurídica'] },
  { name: 'Seguro de Viaje', category: 'viaje', description: 'Protección durante tus viajes internacionales', basePremium: 30.00, coverages: ['Asistencia médica', 'Cancelación', 'Equipaje', 'Repatriación', 'Responsabilidad civil'] },
];

async function main() {
  console.log('🌱 Seeding PRODUCTION database...');

  // ==========================================
  // ENV VARS CHECK
  // ==========================================
  const adminEmail = process.env.INITIAL_SUPER_ADMIN_EMAIL;
  const adminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD;
  const adminName = process.env.INITIAL_SUPER_ADMIN_NAME || 'Super Administrador';

  if (!adminEmail || !adminPassword) {
    console.error('❌ INITIAL_SUPER_ADMIN_EMAIL and INITIAL_SUPER_ADMIN_PASSWORD are required.');
    console.error('   Set them in your .env.local before running db:seed:prod');
    process.exit(1);
  }

  // ==========================================
  // ROLES
  // ==========================================
  console.log('📋 Creating roles...');

  const roleMap = new Map<string, { id: string; name: string }>();
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: { name: role.name, description: role.description },
    });
    roleMap.set(role.name, created);
  }

  console.log(`   ✅ ${roleMap.size} roles created`);

  // Clean up deprecated roles: reassign any users with 'supervisor' role to 'corredor'
  const deprecatedRoles = ['supervisor'];
  for (const depRoleName of deprecatedRoles) {
    const depRole = await prisma.role.findUnique({ where: { name: depRoleName } });
    if (depRole) {
      const corredorRole = roleMap.get('corredor');
      if (corredorRole) {
        const reassigned = await prisma.user.updateMany({
          where: { roleId: depRole.id },
          data: { roleId: corredorRole.id },
        });
        if (reassigned.count > 0) {
          console.log(`   ℹ️  Reassigned ${reassigned.count} users from '${depRoleName}' to 'corredor'`);
        }
      }
      // Remove permissions from deprecated role and delete it
      await prisma.role.update({
        where: { id: depRole.id },
        data: { permissions: { set: [] } },
      });
      await prisma.role.delete({ where: { id: depRole.id } });
      console.log(`   🗑️  Deleted deprecated role: ${depRoleName}`);
    }
  }

  // ==========================================
  // PERMISSIONS
  // ==========================================
  console.log('🔐 Creating permissions...');

  const permMap = new Map<string, string>(); // name -> id
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.upsert({
      where: { name: perm.name },
      update: { description: perm.description, module: perm.module, action: perm.action },
      create: { name: perm.name, description: perm.description, module: perm.module, action: perm.action },
    });
    permMap.set(perm.name, created.id);
  }

  console.log(`   ✅ ${permMap.size} permissions created`);

  // ==========================================
  // PERMISSION ASSIGNMENTS
  // ==========================================
  console.log('🔑 Assigning permissions to roles...');

  for (const [roleName, role] of roleMap) {
    const permIds = getPermissionsForRole(roleName, permMap);
    await prisma.role.update({
      where: { id: role.id },
      data: {
        permissions: {
          set: permIds.map(id => ({ id })),
        },
      },
    });
    console.log(`   ✅ ${roleName}: ${permIds.length} permissions`);
  }

  // ==========================================
  // INSURANCE PRODUCTS (base catalog)
  // ==========================================
  console.log('📦 Creating insurance products...');

  for (const product of PRODUCTS) {
    await prisma.insuranceProduct.upsert({
      where: { name: product.name },
      update: {
        category: product.category,
        description: product.description,
        basePremium: product.basePremium,
        coverages: JSON.stringify(product.coverages),
        isActive: true,
      },
      create: {
        name: product.name,
        category: product.category,
        description: product.description,
        basePremium: product.basePremium,
        coverages: JSON.stringify(product.coverages),
        isActive: true,
      },
    });
  }

  console.log(`   ✅ ${PRODUCTS.length} insurance products created`);

  // ==========================================
  // SUPER ADMIN USER
  // ==========================================
  console.log(`👤 Creating super admin user: ${adminEmail}`);

  const superAdminRole = roleMap.get('super_administrador')!;
  let supabaseId: string | null = null;

  // Try to create user in Supabase Auth first
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseServiceKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Check if user already exists in Supabase Auth
      const { data: listData, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.warn('   ⚠️  Failed to list Supabase Auth users:', listError.message);
        console.warn('   Falling back to legacy auth (hashed password).');
      } else {
        const existingAuthUser = listData?.users?.find((u) => u.email === adminEmail);

        if (existingAuthUser) {
          supabaseId = existingAuthUser.id;
          console.log('   ℹ️  User already exists in Supabase Auth, updating...');

          // Update password in Supabase Auth to match env var
          const { error: updatePwdError } = await supabase.auth.admin.updateUserById(
            existingAuthUser.id,
            { password: adminPassword }
          );

          if (updatePwdError) {
            console.warn('   ⚠️  Failed to update Supabase Auth password:', updatePwdError.message);
          } else {
            console.log('   ✅ Supabase Auth user password updated');
          }

          // Confirm email if not yet confirmed
          if (!existingAuthUser.email_confirmed_at) {
            const { error: confirmError } = await supabase.auth.admin.updateUserById(
              existingAuthUser.id,
              { email_confirm: true }
            );
            if (confirmError) {
              console.warn('   ⚠️  Failed to confirm email:', confirmError.message);
            } else {
              console.log('   ✅ Email confirmed in Supabase Auth');
            }
          }

          console.log('   ✅ Internal user linked');
        } else {
          // Create new user in Supabase Auth
          const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email: adminEmail,
            password: adminPassword,
            email_confirm: true,
          });

          if (authError) {
            console.warn('   ⚠️  Supabase Auth user creation failed:', authError.message);
            console.warn('   Falling back to legacy auth (hashed password).');
          } else {
            supabaseId = authData.user?.id ?? null;
            console.log('   ✅ Supabase Auth user created');
          }
        }
      }
    } catch (err) {
      console.warn('   ⚠️  Supabase client error:', err);
      console.warn('   Falling back to legacy auth (hashed password).');
    }
  } else {
    console.warn('   ⚠️  Supabase credentials not found. Using legacy auth only.');
  }

  // Create or update user in our database
  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existingUser) {
    const updateData: Record<string, unknown> = {
      name: adminName,
      lastName: '',
      roleId: superAdminRole.id,
      isActive: true,
    };

    // Only set password if not using Supabase Auth (legacy fallback)
    if (!supabaseId) {
      updateData.password = await bcrypt.hash(adminPassword, 10);
    }

    if (supabaseId) {
      updateData.supabaseId = supabaseId;
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: updateData,
    });
    console.log('   ✅ Updated existing super admin user');
  } else {
    const createData: Record<string, unknown> = {
      email: adminEmail,
      name: adminName,
      lastName: '',
      supabaseId,
      roleId: superAdminRole.id,
      isActive: true,
    };

    // Only set password if not using Supabase Auth (legacy fallback)
    if (!supabaseId) {
      createData.password = await bcrypt.hash(adminPassword, 10);
    } else {
      createData.password = null;
    }

    await prisma.user.create({
      data: createData as any,
    });
    console.log('   ✅ Created super admin user');
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================
  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (adminUser) {
    await prisma.auditLog.create({
      data: {
        userId: adminUser.id,
        action: 'create',
        entity: 'user',
        entityId: adminUser.id,
        details: JSON.stringify({ email: adminEmail, role: 'super_administrador', method: 'seed-prod' }),
      },
    });
  }

  console.log('');
  console.log('✅ Production seed completed successfully!');
  console.log('');
  console.log('Summary:');
  console.log(`  - ${roleMap.size} roles created (super_administrador, administrador, corredor, atencion_cliente, solo_lectura)`);
  console.log(`  - ${permMap.size} permissions created (dot notation)`);
  console.log(`  - ${PRODUCTS.length} insurance products created`);
  console.log(`  - 1 super admin user created (${adminEmail})`);
  console.log('');
  console.log('⚠️  IMPORTANT: Change the admin password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
