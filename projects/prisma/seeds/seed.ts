import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  SemesterNo,
  UserRole,
} from '../../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'node:path';

// Nạp biến môi trường từ projects/.env để seed dùng đúng DATABASE_URL hiện tại.
dotenv.config({ path: path.join(__dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL chưa được cấu hình trong file .env');
  process.exit(1);
}

const DEFAULT_PASSWORD = 'Password123';

async function main() {
  console.log('Đang kết nối cơ sở dữ liệu...');
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Đang băm mật khẩu mặc định...');
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    // Các tài khoản này đủ để test Auth, Student profile và RoleGuard.
    const admin = await prisma.user.upsert({
      where: { email: 'admin@csmts.edu.vn' },
      update: {
        fullName: 'Hội đồng Học viện Admin',
        passwordHash,
        role: UserRole.admin,
        phone: '0987654321',
        dateOfBirth: new Date('1985-05-15'),
        isActive: true,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        email: 'admin@csmts.edu.vn',
        fullName: 'Hội đồng Học viện Admin',
        passwordHash,
        role: UserRole.admin,
        phone: '0987654321',
        dateOfBirth: new Date('1985-05-15'),
        isActive: true,
      },
    });

    const studentTest = await prisma.user.upsert({
      where: { email: 'student.test2@csmts.local' },
      update: {
        fullName: 'Sinh viên Test Postman',
        passwordHash,
        role: UserRole.student,
        phone: '0901234567',
        dateOfBirth: new Date('2004-09-20'),
        isActive: true,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        email: 'student.test2@csmts.local',
        fullName: 'Sinh viên Test Postman',
        passwordHash,
        role: UserRole.student,
        phone: '0901234567',
        dateOfBirth: new Date('2004-09-20'),
        isActive: true,
      },
    });

    const studentSon = await prisma.user.upsert({
      where: { email: 'student.son@csmts.edu.vn' },
      update: {
        fullName: 'Nguyễn Thanh Sơn',
        passwordHash,
        role: UserRole.student,
        phone: '0912345678',
        dateOfBirth: new Date('2004-09-20'),
        isActive: true,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        email: 'student.son@csmts.edu.vn',
        fullName: 'Nguyễn Thanh Sơn',
        passwordHash,
        role: UserRole.student,
        phone: '0912345678',
        dateOfBirth: new Date('2004-09-20'),
        isActive: true,
      },
    });

    const studentDuc = await prisma.user.upsert({
      where: { email: 'student.duc@csmts.edu.vn' },
      update: {
        fullName: 'Trần Minh Đức',
        passwordHash,
        role: UserRole.student,
        phone: '0923456789',
        dateOfBirth: new Date('2004-12-10'),
        isActive: true,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        email: 'student.duc@csmts.edu.vn',
        fullName: 'Trần Minh Đức',
        passwordHash,
        role: UserRole.student,
        phone: '0923456789',
        dateOfBirth: new Date('2004-12-10'),
        isActive: true,
      },
    });

    const classCouncil = await prisma.user.upsert({
      where: { email: 'class.council@csmts.edu.vn' },
      update: {
        fullName: 'Cố vấn học tập / Ban cán sự lớp',
        passwordHash,
        role: UserRole.class_council,
        phone: '0934567890',
        dateOfBirth: new Date('1990-03-25'),
        isActive: true,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        email: 'class.council@csmts.edu.vn',
        fullName: 'Cố vấn học tập / Ban cán sự lớp',
        passwordHash,
        role: UserRole.class_council,
        phone: '0934567890',
        dateOfBirth: new Date('1990-03-25'),
        isActive: true,
      },
    });

    const facultyCouncil = await prisma.user.upsert({
      where: { email: 'faculty.council@csmts.edu.vn' },
      update: {
        fullName: 'Hội đồng Khoa Công nghệ thông tin',
        passwordHash,
        role: UserRole.faculty_council,
        phone: '0945678901',
        dateOfBirth: new Date('1988-08-30'),
        isActive: true,
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
      create: {
        email: 'faculty.council@csmts.edu.vn',
        fullName: 'Hội đồng Khoa Công nghệ thông tin',
        passwordHash,
        role: UserRole.faculty_council,
        phone: '0945678901',
        dateOfBirth: new Date('1988-08-30'),
        isActive: true,
      },
    });

    console.log('Đang seed khoa, ngành và lớp học...');
    const faculty = await prisma.faculty.upsert({
      where: { code: 'CNTT' },
      update: {
        name: 'Khoa Công nghệ thông tin',
        isActive: true,
      },
      create: {
        code: 'CNTT',
        name: 'Khoa Công nghệ thông tin',
        isActive: true,
      },
    });

    const major = await prisma.major.upsert({
      where: { code: 'KTPM' },
      update: {
        name: 'Kỹ thuật phần mềm',
        facultyId: faculty.id,
        isActive: true,
      },
      create: {
        code: 'KTPM',
        name: 'Kỹ thuật phần mềm',
        facultyId: faculty.id,
        isActive: true,
      },
    });

    const studentClass = await prisma.class.upsert({
      where: { code: 'KTPM-K18A' },
      update: {
        name: 'Kỹ thuật phần mềm K18A',
        majorId: major.id,
        enrollmentYear: 2022,
        isActive: true,
      },
      create: {
        code: 'KTPM-K18A',
        name: 'Kỹ thuật phần mềm K18A',
        majorId: major.id,
        enrollmentYear: 2022,
        isActive: true,
      },
    });

    console.log('Đang seed danh sách lớp và phân công hội đồng...');
    const classStudents = [
      { user: studentTest, studentCode: 'SVTEST002' },
      { user: studentSon, studentCode: 'SV20220001' },
      { user: studentDuc, studentCode: 'SV20220002' },
    ];

    for (const item of classStudents) {
      await prisma.classStudent.upsert({
        where: {
          classId_studentId: {
            classId: studentClass.id,
            studentId: item.user.id,
          },
        },
        update: {
          studentCode: item.studentCode,
        },
        create: {
          classId: studentClass.id,
          studentId: item.user.id,
          studentCode: item.studentCode,
        },
      });
    }

    await prisma.classCouncilAssignment.upsert({
      where: {
        userId_classId: {
          userId: classCouncil.id,
          classId: studentClass.id,
        },
      },
      update: {},
      create: {
        userId: classCouncil.id,
        classId: studentClass.id,
      },
    });

    await prisma.facultyCouncilAssignment.upsert({
      where: {
        userId_facultyId: {
          userId: facultyCouncil.id,
          facultyId: faculty.id,
        },
      },
      update: {},
      create: {
        userId: facultyCouncil.id,
        facultyId: faculty.id,
      },
    });

    console.log('Đang seed học kỳ dùng cho Postman training evaluations...');
    await prisma.semester.upsert({
      where: {
        year_semester: {
          year: 2025,
          semester: SemesterNo.SEMESTER_1,
        },
      },
      update: {
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-01-15'),
        studentDeadline: new Date('2026-01-20T16:59:59.000Z'),
        classDeadline: new Date('2026-01-27T16:59:59.000Z'),
        facultyDeadline: new Date('2026-02-03T16:59:59.000Z'),
        isActive: true,
      },
      create: {
        year: 2025,
        semester: SemesterNo.SEMESTER_1,
        startDate: new Date('2025-09-01'),
        endDate: new Date('2026-01-15'),
        studentDeadline: new Date('2026-01-20T16:59:59.000Z'),
        classDeadline: new Date('2026-01-27T16:59:59.000Z'),
        facultyDeadline: new Date('2026-02-03T16:59:59.000Z'),
        isActive: true,
      },
    });

    await prisma.semester.upsert({
      where: {
        year_semester: {
          year: 2025,
          semester: SemesterNo.SEMESTER_2,
        },
      },
      update: {
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-06-15'),
        studentDeadline: new Date('2026-06-20T16:59:59.000Z'),
        classDeadline: new Date('2026-06-27T16:59:59.000Z'),
        facultyDeadline: new Date('2026-07-03T16:59:59.000Z'),
        isActive: true,
      },
      create: {
        year: 2025,
        semester: SemesterNo.SEMESTER_2,
        startDate: new Date('2026-02-01'),
        endDate: new Date('2026-06-15'),
        studentDeadline: new Date('2026-06-20T16:59:59.000Z'),
        classDeadline: new Date('2026-06-27T16:59:59.000Z'),
        facultyDeadline: new Date('2026-07-03T16:59:59.000Z'),
        isActive: true,
      },
    });

    console.log('Seed hoàn tất. Mật khẩu mặc định cho tài khoản test:', DEFAULT_PASSWORD);
    console.log('Tài khoản Postman:', studentTest.email);
    console.log('Tài khoản admin:', admin.email);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Seed dữ liệu thất bại:', error);
  process.exit(1);
});