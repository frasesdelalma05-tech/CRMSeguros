import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

// Load .env.local before any Prisma operations
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

async function main() {
  const mode = (process.env.SEED_MODE || 'prod').toLowerCase();

  console.log(`🌱 Running seed in ${mode} mode...`);

  if (mode === 'demo') {
    // Dynamically import demo seed
    const { execSync } = await import('child_process');
    console.log('📦 Loading demo seed...');
    execSync('bun prisma/seed-demo.ts', { stdio: 'inherit' });
  } else {
    // Dynamically import production seed
    const { execSync } = await import('child_process');
    console.log('📦 Loading production seed...');
    execSync('bun prisma/seed-prod.ts', { stdio: 'inherit' });
  }
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
