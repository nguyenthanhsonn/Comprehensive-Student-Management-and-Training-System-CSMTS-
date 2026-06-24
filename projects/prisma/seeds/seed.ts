import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '../../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'node:path';

// Load environment variables from the projects/.env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set in environment variables');
  process.exit(1);
}

async function main() {
  console.log('Initializing database connection...');
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log('Hashing passwords...');
  const defaultPassword = 'Password123';
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const usersToSeed = [
    {
      email: 'admin@csmts.edu.vn',
      fullName: 'Hội đồng Học viện Admin',
      role: UserRole.admin,
      phone: '0987654321',
      dateOfBirth: new Date('1985-05-15'),
    },
    {
      email: 'student.son@csmts.edu.vn',
      fullName: 'Nguyễn Thanh Sơn',
      role: UserRole.student,
      phone: '0912345678',
      dateOfBirth: new Date('2004-09-20'),
    },
    {
      email: 'student.duc@csmts.edu.vn',
      fullName: 'Trần Minh Đức',
      role: UserRole.student,
      phone: '0923456789',
      dateOfBirth: new Date('2004-12-10'),
    },
    {
      email: 'class.council@csmts.edu.vn',
      fullName: 'Cố vấn học tập / BCS Lớp',
      role: UserRole.class_council,
      phone: '0934567890',
      dateOfBirth: new Date('1990-03-25'),
    },
    {
      email: 'faculty.council@csmts.edu.vn',
      fullName: 'Hội đồng Khoa CNTT',
      role: UserRole.faculty_council,
      phone: '0945678901',
      dateOfBirth: new Date('1988-08-30'),
    },
  ];

  console.log('Seeding users...');
  for (const userData of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        fullName: userData.fullName,
        passwordHash: passwordHash,
        role: userData.role,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        isActive: true,
      },
      create: {
        email: userData.email,
        fullName: userData.fullName,
        passwordHash: passwordHash,
        role: userData.role,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        isActive: true,
      },
    });
    console.log(`- Upserted user: ${user.email} (${user.role})`);
  }

  console.log('Cleaning up connection...');
  await prisma.$disconnect();
  await pool.end();
  console.log('Database seeding completed successfully!');
}

main().catch((err) => {
  console.error('Error seeding database:', err);
  process.exit(1);
});
