import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  isActive: true,
  phone: true,
  dateOfBirth: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

const loginUserSelect = {
  id: true,
  email: true,
  passwordHash: true,
  role: true,
  isActive: true,
} satisfies Prisma.UserSelect;

const passwordUserSelect = {
  id: true,
  passwordHash: true,
} satisfies Prisma.UserSelect;

const refreshTokenUserSelect = {
  id: true,
  email: true,
  role: true,
  isActive: true,
  refreshTokenHash: true,
  refreshTokenExpiresAt: true,
} satisfies Prisma.UserSelect;

export type PublicUser = Prisma.UserGetPayload<{
  select: typeof publicUserSelect;
}>;

export type LoginUser = Prisma.UserGetPayload<{
  select: typeof loginUserSelect;
}>;

export type PasswordUser = Prisma.UserGetPayload<{
  select: typeof passwordUserSelect;
}>;

export type RefreshTokenUser = Prisma.UserGetPayload<{
  select: typeof refreshTokenUserSelect;
}>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<PublicUser> {
    try {
      return await this.prisma.user.create({
        data: {
          email: dto.email,
          fullName: dto.fullName,
          passwordHash: await bcrypt.hash(dto.password, 12),
          role: dto.role,
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email is already in use');
      }

      throw error;
    }
  }

  findAll(): Promise<PublicUser[]> {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  findByEmailWithPassword(email: string): Promise<LoginUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: loginUserSelect,
    });
  }

  findByIdWithPassword(id: string): Promise<PasswordUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: passwordUserSelect,
    });
  }

  findByIdWithRefreshToken(id: string): Promise<RefreshTokenUser | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: refreshTokenUserSelect,
    });
  }

  async updateRefreshToken(
    id: string,
    refreshTokenHash: string,
    refreshTokenExpiresAt: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        refreshTokenHash,
        refreshTokenExpiresAt,
      },
    });
  }

  async clearRefreshToken(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: {
        refreshTokenHash: null,
        refreshTokenExpiresAt: null,
      },
    });
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
