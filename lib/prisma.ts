// @ts-ignore
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client'

const globalForPrisma = global as unknown as {
  prisma?: PrismaClient
  pgPool?: Pool
}

const pool = globalForPrisma.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.pgPool = pool

const adapter = new PrismaPg(pool)

const db = globalForPrisma.prisma || new PrismaClient({
  adapter,
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db