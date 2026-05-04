import { PrismaClient } from '@prisma/client'
import path from 'path'
import fs from 'fs'

/**
 * Load environment variables from .env.local if not already set.
 * This is needed because Prisma Client reads DATABASE_URL from process.env,
 * and system-level env vars (like the old SQLite DATABASE_URL) take priority
 * over .env.local in Next.js. We explicitly load .env.local to ensure the
 * Supabase PostgreSQL URL is used.
 */
function loadEnvLocal() {
  const envLocalPath = path.join(process.cwd(), '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      // Skip comments and empty lines
      if (!trimmed || trimmed.startsWith('#')) continue
      const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)="?(.*?)"?$/)
      if (match) {
        const [, key, value] = match
        // Only set if not already defined (system env takes priority for non-DB vars)
        // But for DATABASE_URL and DIRECT_URL, we ALWAYS override from .env.local
        // because the system might have the old SQLite URL
        if (key === 'DATABASE_URL' || key === 'DIRECT_URL') {
          process.env[key] = value
        } else if (!process.env[key]) {
          process.env[key] = value
        }
      }
    }
  }
}

// Load .env.local before creating PrismaClient
loadEnvLocal()

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/**
 * Check if the database connection is working
 * Returns true if connected, false otherwise
 */
export async function isDatabaseConnected(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
