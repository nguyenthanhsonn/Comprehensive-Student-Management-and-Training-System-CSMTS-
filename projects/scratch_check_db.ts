import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './src/generated/prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'node:path';

dotenv.config({ path: path.join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;

async function main() {
  if (!databaseUrl) {
    console.error('DATABASE_URL is missing');
    return;
  }
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const evidenceCount = await prisma.evidence.count();
    const evidences = await prisma.evidence.findMany({
      include: {
        student: { select: { fullName: true, email: true } },
        evaluationForm: { select: { id: true } },
        criterion: { select: { code: true, title: true } }
      }
    });
    console.log('Total Evidences in DB:', evidenceCount);
    console.log('Evidences details:', JSON.stringify(evidences, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
main();
