import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import {
  authProfileUserSelect,
  loginUserSelect,
  passwordUserSelect,
  publicUserSelect,
  refreshTokenUserSelect,
  type AuthProfileUser,
  type LoginUser,
  type PasswordUser,
  type PublicUser,
  type RefreshTokenUser,
} from './selects/user.select';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findAuthProfileById(id: string): Promise<AuthProfileUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: authProfileUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  // 
  async findByEmailWithPassword(email: string): Promise<LoginUser> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: loginUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByIdWithPassword(id: string): Promise<PasswordUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: passwordUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByIdWithRefreshToken(id: string): Promise<RefreshTokenUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: refreshTokenUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
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
