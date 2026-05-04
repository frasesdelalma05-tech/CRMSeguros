import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
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
      // ALL except users.assign_super_admin, clients.delete, policies.delete, documents.delete
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
      // documents.view, documents.create, loyalty.view, incidents.view
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
      // appointments.*, incidents.view/create/update, documents.view, loyalty.view, interactions
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

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data - respecting PostgreSQL foreign key constraints
  // Delete in correct order: leaf entities first, then work up the dependency tree

  // 1. Leaf entities (no other tables reference them)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.document.deleteMany();
  await prisma.interaction.deleteMany();
  await prisma.campaignMember.deleteMany();
  await prisma.task.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.loyaltyScore.deleteMany();

  // 2. Intermediate entities (their dependents are already deleted)
  await prisma.incident.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.policy.deleteMany();
  await prisma.lead.deleteMany();

  // 3. Disconnect Role-Permission many-to-many before deleting permissions
  const existingRoles = await prisma.role.findMany({ include: { permissions: true } });
  for (const role of existingRoles) {
    if (role.permissions.length > 0) {
      await prisma.role.update({
        where: { id: role.id },
        data: { permissions: { set: [] } },
      });
    }
  }
  await prisma.permission.deleteMany();

  // 4. Client references User (agentId)
  await prisma.client.deleteMany();

  // 5. User references Role
  await prisma.user.deleteMany();

  // 6. Role (User already deleted)
  await prisma.role.deleteMany();

  // 7. InsuranceProduct (Policy, Campaign already deleted)
  await prisma.insuranceProduct.deleteMany();

  // ==========================================
  // ROLES
  // ==========================================
  console.log('📋 Creating roles...');

  const roleMap = new Map<string, { id: string; name: string }>();
  for (const role of ROLES) {
    const created = await prisma.role.create({ data: { name: role.name, description: role.description } });
    roleMap.set(role.name, created);
  }

  const superAdminRole = roleMap.get('super_administrador')!;
  const administradorRole = roleMap.get('administrador')!;
  const corredorRole = roleMap.get('corredor')!;
  const atencionRole = roleMap.get('atencion_cliente')!;
  const readonlyRole = roleMap.get('solo_lectura')!;

  console.log(`   ✅ ${roleMap.size} roles created`);

  // ==========================================
  // PERMISSIONS
  // ==========================================
  console.log('🔐 Creating permissions...');

  const permMap = new Map<string, string>(); // name -> id
  for (const perm of PERMISSIONS) {
    const created = await prisma.permission.create({
      data: { name: perm.name, description: perm.description, module: perm.module, action: perm.action },
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
  // USERS
  // ==========================================
  const hashedPassword = await bcrypt.hash('Admin123!', 10);

  const users = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Carlos', lastName: 'Méndez', phone: '+34 600 001 001', roleId: superAdminRole.id, isActive: true },
    }),
    prisma.user.create({
      data: { email: 'administrador@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Ana', lastName: 'López', phone: '+34 600 001 008', roleId: administradorRole.id, isActive: true },
    }),
    prisma.user.create({
      data: { email: 'corredor1@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Antonio', lastName: 'Fernández', phone: '+34 600 001 003', roleId: corredorRole.id, isActive: true },
    }),
    prisma.user.create({
      data: { email: 'corredor2@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Laura', lastName: 'Sánchez', phone: '+34 600 001 004', roleId: corredorRole.id, isActive: true },
    }),
    prisma.user.create({
      data: { email: 'corredor3@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Pedro', lastName: 'López', phone: '+34 600 001 005', roleId: corredorRole.id, isActive: true },
    }),
    prisma.user.create({
      data: { email: 'atencion@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Elena', lastName: 'Rodríguez', phone: '+34 600 001 006', roleId: atencionRole.id, isActive: true },
    }),
    prisma.user.create({
      data: { email: 'lectura@seguricrm.es', supabaseId: null, password: hashedPassword, name: 'Javier', lastName: 'Martín', phone: '+34 600 001 007', roleId: readonlyRole.id, isActive: true },
    }),
  ]);

  const [adminUser, administradorUser, corredor1, corredor2, corredor3, atencionUser, readonlyUser] = users;

  // ==========================================
  // INSURANCE PRODUCTS
  // ==========================================
  const products = await Promise.all([
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Decesos', category: 'decesos', description: 'Cobertura completa de servicios funerarios', basePremium: 12.50, coverages: JSON.stringify(['Servicios funerarios', 'Traslado', 'Repatriación', 'Gestión documental', 'Asesoría jurídica']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Hogar', category: 'hogar', description: 'Protección integral para tu vivienda', basePremium: 35.00, coverages: JSON.stringify(['Incendio', 'Robo', 'Daños por agua', 'Responsabilidad civil', 'Continente y contenido']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Vida', category: 'vida', description: 'Protección financiera para tus seres queridos', basePremium: 25.00, coverages: JSON.stringify(['Fallecimiento', 'Incapacidad permanente', 'Enfermedades graves', 'Doble capital por accidente']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Salud', category: 'salud', description: 'Asistencia médica completa', basePremium: 65.00, coverages: JSON.stringify(['Consultas médicas', 'Hospitalización', 'Pruebas diagnósticas', 'Especialistas', 'Urgencias']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Accidentes', category: 'accidentes', description: 'Protección ante accidentes personales', basePremium: 15.00, coverages: JSON.stringify(['Muerte accidental', 'Incapacidad', 'Gastos médicos', 'Asistencia']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Mascotas', category: 'mascotas', description: 'Cuidado veterinario para tu mascota', basePremium: 22.00, coverages: JSON.stringify(['Consultas veterinarias', 'Cirugía', 'Hospitalización', 'Medicamentos', 'Responsabilidad civil']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Plan de Ahorro', category: 'ahorro', description: 'Ahorro e inversión a largo plazo', basePremium: 100.00, coverages: JSON.stringify(['Ahorro garantizado', 'Participación en beneficios', 'Flexibilidad de aportaciones']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Comunidades', category: 'comunidades', description: 'Seguro para comunidades de propietarios', basePremium: 200.00, coverages: JSON.stringify(['Responsabilidad civil', 'Daños estructura', 'Incendio', 'Daños por agua', 'Robo zonas comunes']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Empresas', category: 'empresas', description: 'Protección integral para empresas', basePremium: 150.00, coverages: JSON.stringify(['Responsabilidad civil', 'Contenido mercantil', 'Incendio', 'Pérdida de beneficios', 'Seguridad social']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Embarcaciones', category: 'embarcaciones', description: 'Seguro para embarcaciones de recreo', basePremium: 80.00, coverages: JSON.stringify(['Casco', 'Responsabilidad civil', 'Robo', 'Asistencia en mar', 'Defensa jurídica']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Caza', category: 'caza', description: 'Seguro obligatorio para cazadores', basePremium: 18.00, coverages: JSON.stringify(['Responsabilidad civil', 'Accidentes personales', 'Defensa jurídica']), isActive: true } }),
    prisma.insuranceProduct.create({ data: { name: 'Seguro de Viaje', category: 'viaje', description: 'Protección durante tus viajes internacionales', basePremium: 30.00, coverages: JSON.stringify(['Asistencia médica', 'Cancelación', 'Equipaje', 'Repatriación', 'Responsabilidad civil']), isActive: true } }),
  ]);

  // ==========================================
  // CLIENTS
  // ==========================================
  const clients = await Promise.all([
    prisma.client.create({
      data: { dni: '12345678A', name: 'Juan', lastName: 'Pérez Martínez', email: 'juan.perez@email.es', phone: '+34 91 123 4567', mobile: '+34 612 345 678', address: 'Calle Mayor 15, 3ºB', city: 'Madrid', province: 'Madrid', postalCode: '28013', birthDate: new Date('1975-03-15'), status: 'activo', source: 'web', agentId: corredor1.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-01-15'), observations: 'Cliente muy interesado en seguros de salud', tags: 'vip,salud' },
    }),
    prisma.client.create({
      data: { dni: '23456789B', name: 'Ana', lastName: 'González Ruiz', email: 'ana.gonzalez@email.es', phone: '+34 93 234 5678', mobile: '+34 623 456 789', address: 'Paseo de Gracia 42', city: 'Barcelona', province: 'Barcelona', postalCode: '08007', birthDate: new Date('1982-07-22'), status: 'activo', source: 'referido', agentId: corredor1.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-02-01'), observations: 'Tiene familia con hijos pequeños', tags: 'familia,hogar' },
    }),
    prisma.client.create({
      data: { dni: '34567890C', name: 'Miguel', lastName: 'Torres Blanco', email: 'miguel.torres@email.es', phone: '+34 95 345 6789', mobile: '+34 634 567 890', address: 'Av. de la Constitución 8', city: 'Sevilla', province: 'Sevilla', postalCode: '41001', birthDate: new Date('1968-11-30'), status: 'activo', source: 'campana', agentId: corredor2.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-01-20'), observations: 'Propietario de negocio local', tags: 'empresa,vida' },
    }),
    prisma.client.create({
      data: { dni: '45678901D', name: 'Carmen', lastName: 'Navarro Herrera', email: 'carmen.navarro@email.es', phone: '+34 96 456 7890', mobile: '+34 645 678 901', address: 'Calle Colón 25, 5ºA', city: 'Valencia', province: 'Valencia', postalCode: '46004', birthDate: new Date('1990-05-10'), status: 'activo', source: 'web', agentId: corredor2.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-03-10'), observations: 'Joven profesional, interesada en ahorro', tags: 'joven,ahorro' },
    }),
    prisma.client.create({
      data: { dni: '56789012E', name: 'Roberto', lastName: 'Díaz Moreno', email: 'roberto.diaz@email.es', phone: '+34 94 567 8901', mobile: '+34 656 789 012', address: 'Gran Vía 60', city: 'Bilbao', province: 'Vizcaya', postalCode: '48001', birthDate: new Date('1955-09-18'), status: 'activo', source: 'cold_call', agentId: corredor3.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-02-15'), observations: 'Pensionista, interesado en decesos', tags: 'mayor,decesos' },
    }),
    prisma.client.create({
      data: { dni: '67890123F', name: 'Isabel', lastName: 'Muñoz Castillo', email: 'isabel.munoz@email.es', phone: '+34 91 678 9012', mobile: '+34 667 890 123', address: 'Calle Serrano 88', city: 'Madrid', province: 'Madrid', postalCode: '28006', birthDate: new Date('1985-12-05'), status: 'activo', source: 'evento', agentId: corredor1.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-04-01'), observations: 'Dueña de embarcación de recreo', tags: 'vip,embarcacion' },
    }),
    prisma.client.create({
      data: { dni: '78901234G', name: 'Francisco', lastName: 'Jiménez Vega', email: 'francisco.jimenez@email.es', phone: '+34 95 789 0123', mobile: '+34 678 901 234', address: 'Calle Larios 12', city: 'Málaga', province: 'Málaga', postalCode: '29005', birthDate: new Date('1978-04-25'), status: 'prospecto', source: 'web', agentId: corredor2.id, rgpdConsent: false, observations: 'Interesado en seguro de coche, pendiente RGPD', tags: 'prospecto' },
    }),
    prisma.client.create({
      data: { dni: '89012345H', name: 'Lucía', lastName: 'Romero Gil', email: 'lucia.romero@email.es', phone: '+34 93 890 1234', mobile: '+34 689 012 345', address: 'Rambla Catalunya 33', city: 'Barcelona', province: 'Barcelona', postalCode: '08002', birthDate: new Date('1992-08-14'), status: 'activo', source: 'referido', agentId: corredor3.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-05-01'), observations: 'Tiene dos mascotas', tags: 'mascotas,joven' },
    }),
    prisma.client.create({
      data: { dni: '90123456I', name: 'Diego', lastName: 'Herrera Medina', email: 'diego.herrera@email.es', phone: '+34 97 901 2345', mobile: '+34 690 123 456', address: 'Paseo Marítimo 5', city: 'Palma', province: 'Baleares', postalCode: '07014', birthDate: new Date('1970-06-20'), status: 'activo', source: 'campana', agentId: corredor3.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-03-20'), observations: 'Cazador habitual, necesita seguro de caza', tags: 'caza,decesos' },
    }),
    prisma.client.create({
      data: { dni: '01234567J', name: 'Sofía', lastName: 'Álvarez Flores', email: 'sofia.alvarez@email.es', phone: '+34 91 012 3456', mobile: '+34 601 234 567', address: 'Calle Alcalá 120', city: 'Madrid', province: 'Madrid', postalCode: '28009', birthDate: new Date('1988-02-28'), status: 'inactivo', source: 'web', agentId: corredor1.id, rgpdConsent: true, rgpdConsentDate: new Date('2024-01-10'), observations: 'No renueva seguro de hogar', tags: 'inactivo,hogar' },
    }),
  ]);

  // ==========================================
  // LEADS
  // ==========================================
  const leads = await Promise.all([
    prisma.lead.create({ data: { clientId: clients[0].id, agentId: corredor1.id, source: 'web', status: 'propuesta_enviada', estimatedPremium: 780, probability: 60, product: 'Seguro de Salud', notes: 'Interesado en póliza familiar', nextAction: 'Seguimiento propuesta', nextActionDate: new Date('2025-03-10'), closingDate: new Date('2025-03-30') } }),
    prisma.lead.create({ data: { clientId: clients[1].id, agentId: corredor1.id, source: 'referido', status: 'negociacion', estimatedPremium: 420, probability: 75, product: 'Seguro de Hogar', notes: 'Quiere cobertura completa para piso nuevo', nextAction: 'Enviar counter-offer', nextActionDate: new Date('2025-03-08'), closingDate: new Date('2025-03-20') } }),
    prisma.lead.create({ data: { clientId: clients[2].id, agentId: corredor2.id, source: 'campana', status: 'cita_programada', estimatedPremium: 1800, probability: 40, product: 'Seguro de Empresas', notes: 'Reunión pendiente para valorar necesidades', nextAction: 'Preparar estudio de riesgos', nextActionDate: new Date('2025-03-12') } }),
    prisma.lead.create({ data: { clientId: clients[3].id, agentId: corredor2.id, source: 'web', status: 'en_estudio', estimatedPremium: 1200, probability: 30, product: 'Plan de Ahorro', notes: 'Busca plan de ahorro a largo plazo', nextAction: 'Presentar opciones', nextActionDate: new Date('2025-03-15') } }),
    prisma.lead.create({ data: { clientId: clients[4].id, agentId: corredor3.id, source: 'cold_call', status: 'contactado', estimatedPremium: 150, probability: 50, product: 'Seguro de Decesos', notes: 'Interesado pero quiere comparar precios', nextAction: 'Enviar comparativa', nextActionDate: new Date('2025-03-07') } }),
    prisma.lead.create({ data: { clientId: clients[5].id, agentId: corredor1.id, source: 'evento', status: 'propuesta_enviada', estimatedPremium: 960, probability: 70, product: 'Seguro de Embarcaciones', notes: 'Ya tiene embarcación, quiere ampliar coberturas', nextAction: 'Cita para firma', nextActionDate: new Date('2025-03-09'), closingDate: new Date('2025-03-15') } }),
    prisma.lead.create({ data: { clientId: clients[6].id, agentId: corredor2.id, source: 'web', status: 'nuevo', estimatedPremium: 350, probability: 10, product: 'Seguro de Accidentes', notes: 'Consulta por web, pendiente primera llamada', nextAction: 'Primer contacto', nextActionDate: new Date('2025-03-06') } }),
    prisma.lead.create({ data: { clientId: clients[7].id, agentId: corredor3.id, source: 'referido', status: 'ganado', estimatedPremium: 264, probability: 100, product: 'Seguro de Mascotas', notes: 'Cerrado - dos mascotas', nextAction: 'Enviar documentación', nextActionDate: new Date('2025-03-05') } }),
    prisma.lead.create({ data: { clientId: clients[8].id, agentId: corredor3.id, source: 'campana', status: 'negociacion', estimatedPremium: 216, probability: 65, product: 'Seguro de Caza', notes: 'Negociando condiciones de renovación', nextAction: 'Confirmar prima', nextActionDate: new Date('2025-03-08') } }),
    prisma.lead.create({ data: { clientId: clients[9].id, agentId: corredor1.id, source: 'web', status: 'perdido', estimatedPremium: 420, probability: 0, product: 'Seguro de Hogar', notes: 'No renovó, se fue a competencia', nextAction: 'Reintentar en 6 meses', nextActionDate: new Date('2025-09-01') } }),
  ]);

  // ==========================================
  // OPPORTUNITIES
  // ==========================================
  const opportunities = await Promise.all([
    prisma.opportunity.create({ data: { clientId: clients[0].id, leadId: leads[0].id, product: 'Seguro de Salud', estimatedPremium: 780, probability: 60, status: 'propuesta_enviada', agentId: corredor1.id, closingDate: new Date('2025-03-30'), notes: 'Póliza familiar con dental' } }),
    prisma.opportunity.create({ data: { clientId: clients[1].id, leadId: leads[1].id, product: 'Seguro de Hogar', estimatedPremium: 420, probability: 75, status: 'negociacion', agentId: corredor1.id, closingDate: new Date('2025-03-20'), notes: 'Piso de 120m² en Barcelona centro' } }),
    prisma.opportunity.create({ data: { clientId: clients[2].id, leadId: leads[2].id, product: 'Seguro de Empresas', estimatedPremium: 1800, probability: 40, status: 'cita_programada', agentId: corredor2.id, closingDate: new Date('2025-04-15'), notes: 'Restaurante con 15 empleados' } }),
    prisma.opportunity.create({ data: { clientId: clients[3].id, leadId: leads[3].id, product: 'Plan de Ahorro', estimatedPremium: 1200, probability: 30, status: 'en_estudio', agentId: corredor2.id, closingDate: new Date('2025-05-01'), notes: 'Plan a 20 años, aportación mensual 100€' } }),
    prisma.opportunity.create({ data: { clientId: clients[4].id, leadId: leads[4].id, product: 'Seguro de Decesos', estimatedPremium: 150, probability: 50, status: 'contactado', agentId: corredor3.id, closingDate: new Date('2025-03-25'), notes: 'Comparando con otras aseguradoras' } }),
    prisma.opportunity.create({ data: { clientId: clients[5].id, leadId: leads[5].id, product: 'Seguro de Embarcaciones', estimatedPremium: 960, probability: 70, status: 'propuesta_enviada', agentId: corredor1.id, closingDate: new Date('2025-03-15'), notes: 'Velero de 12m en Baleares' } }),
    prisma.opportunity.create({ data: { clientId: clients[6].id, product: 'Seguro de Vida', estimatedPremium: 300, probability: 15, status: 'nuevo', agentId: corredor2.id, closingDate: new Date('2025-06-01'), notes: 'Posible cross-selling de vida' } }),
    prisma.opportunity.create({ data: { clientId: clients[7].id, leadId: leads[7].id, product: 'Seguro de Mascotas', estimatedPremium: 264, probability: 100, status: 'ganado', agentId: corredor3.id, closingDate: new Date('2025-03-04'), notes: 'Cerrado - dos perros' } }),
    prisma.opportunity.create({ data: { clientId: clients[8].id, leadId: leads[8].id, product: 'Seguro de Caza', estimatedPremium: 216, probability: 65, status: 'negociacion', agentId: corredor3.id, closingDate: new Date('2025-03-18'), notes: 'Renovación con posible ampliación' } }),
    prisma.opportunity.create({ data: { clientId: clients[9].id, leadId: leads[9].id, product: 'Seguro de Hogar', estimatedPremium: 420, probability: 0, status: 'perdido', agentId: corredor1.id, closingDate: new Date('2025-02-28'), notes: 'Perdido por precio' } }),
    prisma.opportunity.create({ data: { clientId: clients[0].id, product: 'Seguro de Vida', estimatedPremium: 300, probability: 25, status: 'contactado', agentId: corredor1.id, closingDate: new Date('2025-04-30'), notes: 'Cross-selling a cliente existente' } }),
    prisma.opportunity.create({ data: { clientId: clients[2].id, product: 'Seguro de Decesos', estimatedPremium: 150, probability: 55, status: 'cita_programada', agentId: corredor2.id, closingDate: new Date('2025-03-28'), notes: 'Interesado en decesos para toda la familia' } }),
  ]);

  // ==========================================
  // POLICIES
  // ==========================================
  const policies = await Promise.all([
    prisma.policy.create({ data: { policyNumber: 'POL-2024-001', clientId: clients[0].id, agentId: corredor1.id, productId: products[3].id, productName: 'Seguro de Salud', startDate: new Date('2024-01-01'), endDate: new Date('2025-01-01'), status: 'vencida', premium: 780, paymentMethod: 'mensual', coverages: JSON.stringify(['Consultas médicas', 'Hospitalización', 'Pruebas diagnósticas', 'Especialistas']), renewalDate: new Date('2025-01-01') } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-002', clientId: clients[0].id, agentId: corredor1.id, productId: products[0].id, productName: 'Seguro de Decesos', startDate: new Date('2024-06-01'), endDate: new Date('2025-06-01'), status: 'activa', premium: 150, paymentMethod: 'anual', coverages: JSON.stringify(['Servicios funerarios', 'Traslado', 'Repatriación']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-003', clientId: clients[1].id, agentId: corredor1.id, productId: products[1].id, productName: 'Seguro de Hogar', startDate: new Date('2024-03-01'), endDate: new Date('2025-03-01'), status: 'en_renovacion', premium: 420, paymentMethod: 'anual', coverages: JSON.stringify(['Incendio', 'Robo', 'Daños por agua', 'Responsabilidad civil']), renewalDate: new Date('2025-03-01') } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-004', clientId: clients[1].id, agentId: corredor1.id, productId: products[2].id, productName: 'Seguro de Vida', startDate: new Date('2024-05-01'), endDate: new Date('2025-05-01'), status: 'activa', premium: 300, paymentMethod: 'mensual', coverages: JSON.stringify(['Fallecimiento', 'Incapacidad permanente']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-005', clientId: clients[2].id, agentId: corredor2.id, productId: products[8].id, productName: 'Seguro de Empresas', startDate: new Date('2024-01-01'), endDate: new Date('2025-01-01'), status: 'vencida', premium: 1800, paymentMethod: 'anual', coverages: JSON.stringify(['Responsabilidad civil', 'Contenido mercantil', 'Incendio']), renewalDate: new Date('2025-01-01') } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-006', clientId: clients[2].id, agentId: corredor2.id, productId: products[0].id, productName: 'Seguro de Decesos', startDate: new Date('2024-02-01'), endDate: new Date('2025-02-01'), status: 'vencida', premium: 150, paymentMethod: 'anual', coverages: JSON.stringify(['Servicios funerarios', 'Traslado']), renewalDate: new Date('2025-02-01') } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-007', clientId: clients[3].id, agentId: corredor2.id, productId: products[5].id, productName: 'Plan de Ahorro', startDate: new Date('2024-04-01'), endDate: new Date('2044-04-01'), status: 'activa', premium: 1200, paymentMethod: 'mensual', coverages: JSON.stringify(['Ahorro garantizado', 'Participación en beneficios']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-008', clientId: clients[4].id, agentId: corredor3.id, productId: products[0].id, productName: 'Seguro de Decesos', startDate: new Date('2024-07-01'), endDate: new Date('2025-07-01'), status: 'activa', premium: 150, paymentMethod: 'trimestral', coverages: JSON.stringify(['Servicios funerarios', 'Repatriación', 'Gestión documental']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-009', clientId: clients[5].id, agentId: corredor1.id, productId: products[9].id, productName: 'Seguro de Embarcaciones', startDate: new Date('2024-03-15'), endDate: new Date('2025-03-15'), status: 'en_renovacion', premium: 960, paymentMethod: 'anual', coverages: JSON.stringify(['Casco', 'Responsabilidad civil', 'Asistencia en mar']), renewalDate: new Date('2025-03-15') } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-010', clientId: clients[7].id, agentId: corredor3.id, productId: products[5].id, productName: 'Seguro de Mascotas', startDate: new Date('2024-09-01'), endDate: new Date('2025-09-01'), status: 'activa', premium: 264, paymentMethod: 'mensual', coverages: JSON.stringify(['Consultas veterinarias', 'Cirugía', 'Medicamentos']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-011', clientId: clients[8].id, agentId: corredor3.id, productId: products[10].id, productName: 'Seguro de Caza', startDate: new Date('2024-10-01'), endDate: new Date('2025-10-01'), status: 'activa', premium: 216, paymentMethod: 'anual', coverages: JSON.stringify(['Responsabilidad civil', 'Accidentes personales', 'Defensa jurídica']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-012', clientId: clients[9].id, agentId: corredor1.id, productId: products[1].id, productName: 'Seguro de Hogar', startDate: new Date('2024-01-01'), endDate: new Date('2025-01-01'), status: 'cancelada', premium: 420, paymentMethod: 'anual', coverages: JSON.stringify(['Incendio', 'Robo', 'Daños por agua']), cancellationDate: new Date('2025-01-15'), cancellationReason: 'No renovación - cambio a competencia' } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-013', clientId: clients[0].id, agentId: corredor1.id, productId: products[4].id, productName: 'Seguro de Accidentes', startDate: new Date('2024-08-01'), endDate: new Date('2025-08-01'), status: 'activa', premium: 180, paymentMethod: 'anual', coverages: JSON.stringify(['Muerte accidental', 'Incapacidad', 'Gastos médicos']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-014', clientId: clients[5].id, agentId: corredor1.id, productId: products[2].id, productName: 'Seguro de Vida', startDate: new Date('2024-06-01'), endDate: new Date('2025-06-01'), status: 'activa', premium: 350, paymentMethod: 'mensual', coverages: JSON.stringify(['Fallecimiento', 'Incapacidad permanente', 'Enfermedades graves']) } }),
    prisma.policy.create({ data: { policyNumber: 'POL-2024-015', clientId: clients[7].id, agentId: corredor3.id, productId: products[11].id, productName: 'Seguro de Viaje', startDate: new Date('2025-01-15'), endDate: new Date('2025-02-15'), status: 'vencida', premium: 30, paymentMethod: 'unico', coverages: JSON.stringify(['Asistencia médica', 'Equipaje', 'Cancelación']) } }),
  ]);

  // ==========================================
  // APPOINTMENTS
  // ==========================================
  const today = new Date();
  const appointments = await Promise.all([
    prisma.appointment.create({ data: { clientId: clients[0].id, agentId: corredor1.id, title: 'Renovación seguro de salud', description: 'Revisar renovación de póliza de salud familiar', type: 'renovacion', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 0), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0), location: 'Oficina central', notes: 'Traer documentación actualizada' } }),
    prisma.appointment.create({ data: { clientId: clients[1].id, agentId: corredor1.id, title: 'Estudio hogar nuevo', description: 'Valorar seguro para piso nuevo', type: 'visita_presencial', status: 'confirmada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 13, 0), location: 'Paseo de Gracia 42, Barcelona' } }),
    prisma.appointment.create({ data: { clientId: clients[2].id, agentId: corredor2.id, title: 'Seguro empresa - estudio riesgos', description: 'Primera reunión para valorar necesidades empresariales', type: 'visita_presencial', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 30), location: 'Av. de la Constitución 8, Sevilla' } }),
    prisma.appointment.create({ data: { clientId: clients[5].id, agentId: corredor1.id, title: 'Firma póliza embarcación', description: 'Firma de nueva póliza de embarcaciones', type: 'firma_poliza', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 9, 30), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1, 10, 30), location: 'Oficina central' } }),
    prisma.appointment.create({ data: { clientId: clients[4].id, agentId: corredor3.id, title: 'Seguimiento decesos', description: 'Llamar para seguimiento de propuesta de decesos', type: 'llamada', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 30), notes: 'Comentar comparativa de precios' } }),
    prisma.appointment.create({ data: { clientId: clients[7].id, agentId: corredor3.id, title: 'Videollamada mascotas', description: 'Explicar coberturas del seguro de mascotas', type: 'videollamada', status: 'completada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 0), endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1, 15, 45) } }),
    prisma.appointment.create({ data: { clientId: clients[8].id, agentId: corredor3.id, title: 'Renovación seguro caza', description: 'Revisar renovación y posible ampliación', type: 'seguimiento', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2, 10, 0), location: 'Oficina Palma' } }),
    prisma.appointment.create({ data: { clientId: clients[3].id, agentId: corredor2.id, title: 'Plan de ahorro - presentación', description: 'Presentar opciones de plan de ahorro', type: 'videollamada', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3, 11, 0) } }),
    prisma.appointment.create({ data: { clientId: clients[6].id, agentId: corredor2.id, title: 'Primer contacto - accidentes', description: 'Primera llamada para presentar seguro de accidentes', type: 'llamada', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 17, 0) } }),
    prisma.appointment.create({ data: { clientId: clients[9].id, agentId: corredor1.id, title: 'Reactivación cliente inactivo', description: 'Intento de reactivación tras no renovación', type: 'llamada', status: 'cancelada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 3, 14, 0) } }),
    prisma.appointment.create({ data: { clientId: clients[0].id, agentId: corredor1.id, title: 'Cross-selling vida', description: 'Presentar seguro de vida como complemento', type: 'seguimiento', status: 'programada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5, 10, 0) } }),
    prisma.appointment.create({ data: { clientId: clients[2].id, agentId: corredor2.id, title: 'Presupuesto decesos familiar', description: 'Presentar presupuesto seguro decesos para toda la familia', type: 'visita_presencial', status: 'confirmada', date: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 4, 12, 0), location: 'Av. de la Constitución 8, Sevilla' } }),
  ]);

  // ==========================================
  // TASKS
  // ==========================================
  const tasks = await Promise.all([
    prisma.task.create({ data: { title: 'Preparar propuesta seguro salud familiar', description: 'Elaborar propuesta personalizada para cliente Juan Pérez', clientId: clients[0].id, opportunityId: opportunities[0].id, assigneeId: corredor1.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), priority: 'alta', status: 'en_progreso' } }),
    prisma.task.create({ data: { title: 'Enviar counter-offer hogar Barcelona', description: 'Preparar y enviar contraoferta para Ana González', clientId: clients[1].id, opportunityId: opportunities[1].id, assigneeId: corredor1.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()), priority: 'urgente', status: 'pendiente' } }),
    prisma.task.create({ data: { title: 'Estudio riesgos empresa Sevilla', description: 'Realizar estudio completo de riesgos para negocio de Miguel Torres', clientId: clients[2].id, opportunityId: opportunities[2].id, assigneeId: corredor2.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2), priority: 'alta', status: 'pendiente' } }),
    prisma.task.create({ data: { title: 'Comparativa decesos competencia', description: 'Preparar comparativa de precios de decesos con competencia', clientId: clients[4].id, assigneeId: corredor3.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()), priority: 'media', status: 'en_progreso' } }),
    prisma.task.create({ data: { title: 'Documentación póliza embarcación', description: 'Recopilar documentación para nueva póliza de embarcación', clientId: clients[5].id, policyId: policies[8].id, assigneeId: corredor1.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1), priority: 'alta', status: 'pendiente' } }),
    prisma.task.create({ data: { title: 'Llamar prospecto Francisco Jiménez', description: 'Primer contacto con lead de accidentes', clientId: clients[6].id, assigneeId: corredor2.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()), priority: 'media', status: 'pendiente' } }),
    prisma.task.create({ data: { title: 'Renovación póliza hogar - Ana González', description: 'Preparar renovación de póliza de hogar próxima a vencer', clientId: clients[1].id, policyId: policies[2].id, assigneeId: corredor1.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 3), priority: 'urgente', status: 'pendiente' } }),
    prisma.task.create({ data: { title: 'Revisión anual pólizas empresa', description: 'Revisar todas las pólizas activas del cliente Miguel Torres', clientId: clients[2].id, assigneeId: corredor2.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7), priority: 'baja', status: 'pendiente' } }),
    prisma.task.create({ data: { title: 'Confirmar cita firma embarcación', description: 'Confirmar asistencia a cita de firma de póliza', clientId: clients[5].id, assigneeId: corredor1.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate()), priority: 'media', status: 'completada', completedAt: new Date() } }),
    prisma.task.create({ data: { title: 'Encuesta satisfacción cliente Lucía', description: 'Enviar encuesta de satisfacción tras contratación de seguro mascotas', clientId: clients[7].id, assigneeId: corredor3.id, dueDate: new Date(today.getFullYear(), today.getMonth(), today.getDate() + 5), priority: 'baja', status: 'pendiente' } }),
  ]);

  // ==========================================
  // CAMPAIGNS
  // ==========================================
  const campaigns = await Promise.all([
    prisma.campaign.create({ data: { name: 'Campaña Renovación Q1 2025', objective: 'Renovar pólizas que vencen en Q1', type: 'llamada', segment: 'polizas_por_vencer', productId: products[1].id, startDate: new Date('2025-01-15'), endDate: new Date('2025-03-31'), status: 'activa', responsibleId: administradorUser.id, metrics: JSON.stringify({ contacted: 45, converted: 28, pending: 12 }) } }),
    prisma.campaign.create({ data: { name: 'Cross-selling Vida + Salud', objective: 'Ofrecer seguro de vida a clientes con salud', type: 'email', segment: 'clientes_activos', productId: products[2].id, startDate: new Date('2025-02-01'), endDate: new Date('2025-04-30'), status: 'activa', responsibleId: administradorUser.id, metrics: JSON.stringify({ sent: 120, opened: 65, responded: 18, converted: 5 }) } }),
    prisma.campaign.create({ data: { name: 'Feliz Cumpleaños 2025', objective: 'Felicitación de cumpleaños con oferta especial', type: 'email', segment: 'cumpleanos', startDate: new Date('2025-01-01'), endDate: new Date('2025-12-31'), status: 'activa', responsibleId: atencionUser.id, metrics: JSON.stringify({ sent: 89, responded: 12 }) } }),
    prisma.campaign.create({ data: { name: 'Referidos Q1', objective: 'Conseguir nuevos leads mediante referidos', type: 'whatsapp', segment: 'clientes_activos', startDate: new Date('2025-02-15'), endDate: new Date('2025-03-31'), status: 'activa', responsibleId: corredor1.id, metrics: JSON.stringify({ sent: 50, referred: 8 }) } }),
    prisma.campaign.create({ data: { name: 'Decesos Mayores 55', objective: 'Ofrecer seguro de decesos a mayores de 55', type: 'mixta', segment: 'todos', productId: products[0].id, startDate: new Date('2025-03-01'), endDate: new Date('2025-05-31'), status: 'borrador', responsibleId: corredor3.id, metrics: JSON.stringify({}) } }),
  ]);

  // Campaign members
  await Promise.all([
    prisma.campaignMember.create({ data: { campaignId: campaigns[0].id, clientId: clients[0].id, status: 'convertido', responseDate: new Date('2025-02-10') } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[0].id, clientId: clients[1].id, status: 'pendiente' } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[0].id, clientId: clients[2].id, status: 'contactado' } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[1].id, clientId: clients[0].id, status: 'respondido', responseDate: new Date('2025-02-20'), notes: 'Interesado, pedir cita' } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[1].id, clientId: clients[5].id, status: 'no_interesado', responseDate: new Date('2025-02-18') } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[2].id, clientId: clients[2].id, status: 'contactado' } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[3].id, clientId: clients[1].id, status: 'convertido', responseDate: new Date('2025-03-01'), notes: 'Refirió a su cuñada' } }),
    prisma.campaignMember.create({ data: { campaignId: campaigns[3].id, clientId: clients[7].id, status: 'pendiente' } }),
  ]);

  // ==========================================
  // INCIDENTS
  // ==========================================
  const incidents = await Promise.all([
    prisma.incident.create({ data: { title: 'Siniestro por daños por agua', description: 'Reclamación por daños por agua en vivienda de Barcelona. Infiltración en techo del salón.', priority: 'alta', status: 'en_proceso', clientId: clients[1].id, policyId: policies[2].id, assignedTo: corredor1.id, internalNotes: 'Perito asignado, visita programada para el viernes' } }),
    prisma.incident.create({ data: { title: 'Reclamación consulta veterinaria', description: 'Cliente solicita reembolso de consulta veterinaria no cubierta.', priority: 'media', status: 'abierta', clientId: clients[7].id, policyId: policies[9].id, assignedTo: corredor3.id, internalNotes: 'Verificar si la consulta está dentro de las coberturas' } }),
    prisma.incident.create({ data: { title: 'Problema con cargo de prima', description: 'Cliente reporta doble cargo en su cuenta bancaria.', priority: 'alta', status: 'en_proceso', clientId: clients[0].id, policyId: policies[0].id, assignedTo: atencionUser.id, resolution: 'En proceso de devolución del cargo duplicado' } }),
    prisma.incident.create({ data: { title: 'Siniestro accidente caza', description: 'Accidente leve durante jornada de caza, requiere atención médica.', priority: 'media', status: 'resuelta', clientId: clients[8].id, policyId: policies[10].id, assignedTo: corredor3.id, resolution: 'Atención médica cubierta. Cliente satisfecho.' } }),
    prisma.incident.create({ data: { title: 'Queja por lentitud en respuesta', description: 'Cliente insatisfecho por tiempo de respuesta en reclamación anterior.', priority: 'critica', status: 'abierta', clientId: clients[5].id, assignedTo: atencionUser.id, internalNotes: 'Priorizar respuesta, cliente VIP' } }),
    prisma.incident.create({ data: { title: 'Error en documentación póliza', description: 'Datos incorrectos en el certificado de seguro enviado.', priority: 'baja', status: 'resuelta', clientId: clients[3].id, policyId: policies[6].id, assignedTo: atencionUser.id, resolution: 'Documentación corregida y reenviada' } }),
    prisma.incident.create({ data: { title: 'Siniestro robo en vivienda', description: 'Robo en vivienda del cliente, ventanilla forzada.', priority: 'alta', status: 'abierta', clientId: clients[9].id, policyId: policies[11].id, assignedTo: corredor1.id, internalNotes: 'Póliza cancelada, verificar si cubre el siniestro' } }),
    prisma.incident.create({ data: { title: 'Solicitud cancelación póliza empresa', description: 'Cliente solicita cancelación anticipada de póliza de empresa.', priority: 'media', status: 'en_proceso', clientId: clients[2].id, policyId: policies[4].id, assignedTo: corredor2.id } }),
  ]);

  // ==========================================
  // INTERACTIONS
  // ==========================================
  await Promise.all([
    prisma.interaction.create({ data: { clientId: clients[0].id, type: 'llamada', direction: 'saliente', subject: 'Renovación seguro salud', notes: 'Cliente interesado en renovar con más coberturas. Pendiente enviar propuesta actualizada.', agentId: corredor1.id } }),
    prisma.interaction.create({ data: { clientId: clients[1].id, type: 'email', direction: 'saliente', subject: 'Propuesta seguro hogar', notes: 'Enviada propuesta de seguro de hogar para nuevo piso.', agentId: corredor1.id } }),
    prisma.interaction.create({ data: { clientId: clients[1].id, type: 'llamada', direction: 'entrante', subject: 'Consulta sobre coberturas', notes: 'Cliente pregunta si cubre daños por fenómenos meteorológicos.', agentId: corredor1.id } }),
    prisma.interaction.create({ data: { clientId: clients[2].id, type: 'reunion', direction: 'saliente', subject: 'Primera reunión empresarial', notes: 'Presentación de productos empresariales. Cliente muestra interés en RC y contenido mercantil.', agentId: corredor2.id } }),
    prisma.interaction.create({ data: { clientId: clients[4].id, type: 'llamada', direction: 'saliente', subject: 'Propuesta decesos', notes: 'Cliente compara precios con competencia. Ofrecer descuento fidelidad.', agentId: corredor3.id } }),
    prisma.interaction.create({ data: { clientId: clients[5].id, type: 'whatsapp', direction: 'saliente', subject: 'Recordatorio cita firma', notes: 'Confirmada cita para firma de póliza embarcación.', agentId: corredor1.id } }),
    prisma.interaction.create({ data: { clientId: clients[7].id, type: 'nota', subject: 'Nueva contratación', notes: 'Cerrada venta de seguro de mascotas para dos perros. Enviar bienvenida.', agentId: corredor3.id } }),
    prisma.interaction.create({ data: { clientId: clients[0].id, type: 'email', direction: 'saliente', subject: 'Campaña cross-selling vida', notes: 'Cliente ha abierto el email, pendiente seguimiento.', agentId: corredor1.id } }),
    prisma.interaction.create({ data: { clientId: clients[8].id, type: 'llamada', direction: 'saliente', subject: 'Renovación seguro caza', notes: 'Negociando condiciones de renovación. Posible ampliación de coberturas.', agentId: corredor3.id } }),
    prisma.interaction.create({ data: { clientId: clients[9].id, type: 'llamada', direction: 'saliente', subject: 'Intento reactivación', notes: 'No contesta. Dejar mensaje. Intentar de nuevo la semana que viene.', agentId: corredor1.id } }),
  ]);

  // ==========================================
  // LOYALTY SCORES
  // ==========================================
  await Promise.all([
    prisma.loyaltyScore.create({ data: { clientId: clients[0].id, score: 82, activePolicies: 2, totalPremium: 930, yearsAsClient: 2, lastContactDate: new Date(), isAtRisk: false, riskReason: null, recommendedActions: JSON.stringify(['Ofrecer seguro de vida', 'Proponer pack salud + dental']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[1].id, score: 75, activePolicies: 1, totalPremium: 420, yearsAsClient: 1, lastContactDate: new Date(), isAtRisk: true, riskReason: 'Póliza de hogar próxima a vencer', recommendedActions: JSON.stringify(['Contactar para renovación', 'Ofrecer descuento fidelidad', 'Cross-selling de vida']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[2].id, score: 45, activePolicies: 0, totalPremium: 0, yearsAsClient: 1, lastContactDate: new Date('2025-02-15'), isAtRisk: true, riskReason: 'Sin pólizas activas, pólizas vencidas', recommendedActions: JSON.stringify(['Urgente: contactar para renovación decesos', 'Reunión para evaluar necesidades empresariales']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[3].id, score: 68, activePolicies: 1, totalPremium: 1200, yearsAsClient: 1, lastContactDate: new Date('2025-02-20'), isAtRisk: false, recommendedActions: JSON.stringify(['Presentar opciones de ahorro adicional']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[4].id, score: 55, activePolicies: 1, totalPremium: 150, yearsAsClient: 1, lastContactDate: new Date(), isAtRisk: false, recommendedActions: JSON.stringify(['Ofrecer seguro de vida', 'Proponer pack decesos + accidentes']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[5].id, score: 88, activePolicies: 2, totalPremium: 1310, yearsAsClient: 2, lastContactDate: new Date(), isAtRisk: true, riskReason: 'Póliza embarcación próxima a vencer', recommendedActions: JSON.stringify(['Renovación embarcación con descuento', 'Cross-selling de accidentes']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[7].id, score: 60, activePolicies: 1, totalPremium: 264, yearsAsClient: 0, lastContactDate: new Date(), isAtRisk: false, recommendedActions: JSON.stringify(['Enviar encuesta satisfacción', 'Ofrecer seguro de viaje para próxima vacación']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[8].id, score: 65, activePolicies: 1, totalPremium: 216, yearsAsClient: 0, lastContactDate: new Date(), isAtRisk: false, recommendedActions: JSON.stringify(['Renovación con ampliación', 'Cross-selling decesos']) } }),
    prisma.loyaltyScore.create({ data: { clientId: clients[9].id, score: 20, activePolicies: 0, totalPremium: 0, yearsAsClient: 1, lastContactDate: new Date('2025-02-10'), isAtRisk: true, riskReason: 'Póliza cancelada, sin contacto reciente', recommendedActions: JSON.stringify(['Campaña de reactivación', 'Ofrecer condiciones especiales']) } }),
  ]);

  // ==========================================
  // NOTIFICATIONS
  // ==========================================
  await Promise.all([
    prisma.notification.create({ data: { title: 'Póliza próxima a vencer', message: 'La póliza POL-2024-003 de Ana González vence en 7 días', type: 'renovacion', policyId: policies[2].id, isRead: false } }),
    prisma.notification.create({ data: { title: 'Póliza próxima a vencer', message: 'La póliza POL-2024-009 de Isabel Muñoz vence pronto', type: 'renovacion', policyId: policies[8].id, isRead: false } }),
    prisma.notification.create({ data: { title: 'Nueva oportunidad ganada', message: 'Se ha cerrado la oportunidad de seguro de mascotas para Lucía Romero', type: 'sistema', isRead: true, readAt: new Date() } }),
    prisma.notification.create({ data: { title: 'Incidencia crítica', message: 'Queja de cliente VIP Isabel Muñoz por lentitud en respuesta', type: 'alerta', isRead: false } }),
    prisma.notification.create({ data: { title: 'Tarea urgente', message: 'Enviar counter-offer para hogar Barcelona - plazo hoy', type: 'recordatorio', isRead: false } }),
    prisma.notification.create({ data: { title: 'Lead sin seguimiento', message: 'El lead de Francisco Jiménez lleva más de 7 días sin seguimiento', type: 'alerta', isRead: false } }),
  ]);

  // ==========================================
  // DOCUMENTS
  // ==========================================
  await Promise.all([
    prisma.document.create({ data: { name: 'Póliza Salud Juan Pérez.pdf', type: 'poliza', mimeType: 'application/pdf', size: 245000, url: '/documents/pol-salud-juan.pdf', storagePath: null, bucket: null, clientId: clients[0].id, policyId: policies[0].id, uploadedBy: corredor1.id } }),
    prisma.document.create({ data: { name: 'Póliza Hogar Ana González.pdf', type: 'poliza', mimeType: 'application/pdf', size: 198000, url: '/documents/pol-hogar-ana.pdf', storagePath: null, bucket: null, clientId: clients[1].id, policyId: policies[2].id, uploadedBy: corredor1.id } }),
    prisma.document.create({ data: { name: 'DNI Juan Pérez', type: 'identificacion', mimeType: 'image/jpeg', size: 85000, url: '/documents/dni-juan.jpg', storagePath: null, bucket: null, clientId: clients[0].id, uploadedBy: corredor1.id } }),
    prisma.document.create({ data: { name: 'Presupuesto Empresa Sevilla.pdf', type: 'contrato', mimeType: 'application/pdf', size: 312000, url: '/documents/presupuesto-empresa.pdf', storagePath: null, bucket: null, clientId: clients[2].id, opportunityId: opportunities[2].id, uploadedBy: corredor2.id } }),
    prisma.document.create({ data: { name: 'Parte siniestro agua.pdf', type: 'otro', mimeType: 'application/pdf', size: 156000, url: '/documents/parte-siniestro.pdf', storagePath: null, bucket: null, clientId: clients[1].id, policyId: policies[2].id, incidentId: incidents[0].id, uploadedBy: corredor1.id } }),
    prisma.document.create({ data: { name: 'Póliza Embarcación Isabel.pdf', type: 'poliza', mimeType: 'application/pdf', size: 267000, url: '/documents/pol-embarcacion-isabel.pdf', storagePath: null, bucket: null, clientId: clients[5].id, policyId: policies[8].id, uploadedBy: corredor1.id } }),
  ]);

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  await Promise.all([
    prisma.auditLog.create({ data: { userId: adminUser.id, action: 'create', entity: 'user', entityId: corredor1.id, details: JSON.stringify({ name: 'Antonio Fernández', role: 'corredor' }) } }),
    prisma.auditLog.create({ data: { userId: adminUser.id, action: 'create', entity: 'user', entityId: corredor2.id, details: JSON.stringify({ name: 'Laura Sánchez', role: 'corredor' }) } }),
    prisma.auditLog.create({ data: { userId: corredor1.id, action: 'create', entity: 'client', entityId: clients[0].id, details: JSON.stringify({ name: 'Juan Pérez' }) } }),
    prisma.auditLog.create({ data: { userId: corredor1.id, action: 'create', entity: 'policy', entityId: policies[0].id, details: JSON.stringify({ policyNumber: 'POL-2024-001' }) } }),
    prisma.auditLog.create({ data: { userId: adminUser.id, action: 'login', entity: 'user', entityId: adminUser.id } }),
  ]);

  console.log('✅ Seed completed successfully!');
  console.log(`  - ${roleMap.size} roles (super_administrador, administrador, corredor, atencion_cliente, solo_lectura)`);
  console.log(`  - ${permMap.size} permissions (dot notation)`);
  console.log(`  - ${users.length} users (password: Admin123!)`);
  console.log(`  - ${products.length} insurance products`);
  console.log(`  - ${clients.length} clients`);
  console.log(`  - ${leads.length} leads`);
  console.log(`  - ${opportunities.length} opportunities`);
  console.log(`  - ${policies.length} policies`);
  console.log(`  - ${appointments.length} appointments`);
  console.log(`  - ${tasks.length} tasks`);
  console.log(`  - ${campaigns.length} campaigns`);
  console.log(`  - ${incidents.length} incidents`);
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
